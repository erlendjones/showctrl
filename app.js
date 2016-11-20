var osc = require('node-osc');
var telnet = require('telnet-client');
var express= require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var mysql = require('mysql');
var ma2console = require('ma2-msc');
var Xpression = require('rosstalk-xpression');
var Carbonite = require('rosstalk-carbonite');

process.title = 'show-ctrl-server';

//// REMOTE CONNECTIONS ////
var runMa = false;
var runCarbonite = true;
var runXpression= true;
var runQlab = true;
var runQlab2 = true;
var runQlab3 = false;
var runQlab4 = false;
var runQlab5 = false;

//// CONFIGURATIONS ////
const config = {
  debug: false,
  port: 8080,
  mysqlConnection: {
    host     : 'localhost',
    port     :  8889,
    user     : 'gameshow',
    password : 'gameshow',
    database : 'gameshow'
  },
  carboniteConnection: {
    host:     '192.168.8.103'
  },
  xpressionConnection: {
    host:     '192.168.8.100' //'192.168.8.101'
  },
  maConnection: {
    host:     '192.168.8.120',
    port:     6004
  },
  qlabConnection: {
    host:     '192.168.8.138'
  },
  qlabConnection2: {
    host:     '192.168.8.120'
  },
  qlabConnection3: {
    host:     '192.168.8.000'
  },
  qlabConnection4: {
    host:     '192.168.8.000'
  },
  qlabConnection5: {
    host:     '192.168.8.000'
  }
}




// MYSQL CONNECTION
var mysqlCon = mysql.createConnection(config.mysqlConnection);
mysqlCon.connect(function(err) {
  if (err){
    if (err.code == 'ECONNREFUSED'){
      console.log('Could not connect to MySQL, make sure its running!');
    } else {
      throw err;
    }
  }else{
    console.log('MySQL running fine at thread: ' + mysqlCon.threadId);
  }
});

function selectQuestions(callback){
  mysqlCon.query('SELECT * FROM questions', function(err, rows) {
    console.log('selectQuestions rows:',rows)
    if (err) throw err;
    typeof callback == 'function' && callback( { err, rows } );
  });
}

function setXpressionField(field, value, callback){
  mysqlCon.query('UPDATE xpressiondata SET value = ? WHERE key_value = ?', [ value, field ], function(err, res){
    typeof callback == 'function' && callback(err, res);
  })
}

function getXpressionField(field, callback){
  mysqlCon.query('SELECT * FROM xpressiondata WHERE key_value = ?', [ field ], function(err, res){
    if (typeof callback == 'function' && typeof res[0] !== 'undefined' && typeof res[0].value !== 'undefined'){
      callback(res[0].value);
    };
  })
}

var countVotes = function(){
  var count = {};
  for (vote in votes.votes){
    if (count[votes.votes[vote]]){
      count[votes.votes[vote]] ++;
    }else{
      count[votes.votes[vote]] = 1;
    }
  }
  return count;
}


function updateDataInDatabase(){

  setXpressionField('score_a',  score.values['a'], function(err){
    err != null && console.log(err);
  });
  setXpressionField('score_b',  score.values['b'], function(err){
    err != null && console.log(err);
  });
  setXpressionField('score_c',  score.values['c'], function(err){
    err != null && console.log(err);
  });
  setXpressionField('score_d',  score.values['d'], function(err){
    err != null && console.log(err);
  });

  /// DUEL DATA
  var left_team = toggables['duel-set-left'];
  var right_team = toggables['duel-set-right'];
  setXpressionField('duel_left_score', duel.left.score, function(err){  //LEFT
    err != null && console.log(err);
  });
  getXpressionField('name_'+left_team, function(value){
    setXpressionField('duel_left_name',  value, function(err){
      err != null && console.log(err);
    });
  });
  setXpressionField('duel_left_total_score', score.values[left_team], function(err){
    err != null && console.log(err);
  });
  setXpressionField('duel_right_score', duel.right.score, function(err){ // RIGHT
    err != null && console.log(err);
  });
  getXpressionField('name_'+right_team, function(value){
    setXpressionField('duel_right_name',  value, function(err){
      err != null && console.log(err);
    });
  });
  setXpressionField('duel_right_total_score', score.values[right_team], function(err){
    err != null && console.log(err);
  });

  var countedVotes = countVotes();

  setXpressionField('votes_a', countedVotes[teamNames['a']] || 0, function(err){
    err != null && console.log(err);
  });


  setXpressionField('votes_b', countedVotes[teamNames['b']] || 0, function(err){
    err != null && console.log(err);
  });


  setXpressionField('votes_c', countedVotes[teamNames['c']] || 0, function(err){
    err != null && console.log(err);
  });


  setXpressionField('votes_d', countedVotes[teamNames['d']] || 0, function(err){
    err != null && console.log(err);
  });

}



// USER INTERFACE
server.listen(config.port, function () {
  console.log('GAMESHOW-server running at '+config.port);
});

app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/lib"));

app.get('/cue/:cueNumber', function (req, res) {
	goCue(req.params.cueNumber);
	res.send('Cue '+req.params.cueNumber + ' fired');
});











var votes = {
	open: false,
	votes: {},
	relativeVotes: 0,
	options: ''
}

var question = {
	open: false,
	answers: {},
	relativeAnswers: 0,
	question: {}
}

var score = {
  values: {
    'a':0,
    'b':0,
    'c':0,
    'd':0
  },
  changeAmount: 1
}

var duel = {
  left: {
    score: 0
    // derived total_score
  },
  right: {
    score: 0
    // derived total_score
  }
}

var toggables = {
  sometoggableid: true,
  someOthertoggableid: false,
  duel_left_total_score: 'a',
  'duel-set-left': 'a',
  'duel-set-right': 'a',
  'robbery-set-thief': 'a',
  'robbery-set-victim': 'a',
  'challenge-inc-score-a': false,
  'challenge-inc-score-b': false,
  'challenge-inc-score-c': false,
  'challenge-inc-score-d': false,
  'challenge-set-score-change-amount': '100',
  'score-active-change-amount-id': 'a'
}

var teamNames = {
  a: '',
  b: '',
  c: '',
  d: ''
}



io.on('connection', function (socket) {
	var address = socket.request.connection.remoteAddress;
	console.log('User connected (', address,')');

  socket.emit('update teams name', teamNames);
  socket.emit('update scores', score);

  socket.on('get teams name', function(){
    socket.emit('update teams name', teamNames);
  })


  socket.on('select questions',function(msg,callback){
    console.log('socket.on select questions',msg);
		// get questions
    selectQuestions(callback);
	});

  socket.on('get team name',function(msg,callback){
    console.log('get team name',msg);
    if (typeof callback == 'function'){
  		callback({
        team: msg.team,
        team_name: teamNames[msg.team]
      })
    };
	});

  socket.on('set xpression question',function(msg,callback){
    if (typeof msg == 'object'){
      if (msg.id != question.question.id){

      }
      question.question = msg;
      console.log(question.question);
      Object.keys(msg).forEach(function(prop, index){
        setXpressionField(prop, msg[prop], function(err, res){
          console.log(res.affectedRows,' change')
        });
      });
      callback(true);
    } else {
      console.log('Impossible to understand the question, nothing sent to XPression...');
    }
	});

  socket.on('set users question',function(msg,callback){
		io.broadcast.emit(msg);
    callback(true);
	});


  socket.on('get question',function(msg,callback){
		var answered = false;
		for (answer in question.answers){
			if (typeof msg.team != 'undefined' && answer == msg.team){
				callback(true);
				answered = true;
			}
		}
		if (!answered){
			callback(false);
		}
	});

  socket.on('have i answered',function(msg,callback){
    var answered = false;
    for (answer in question.answers){
      if (typeof msg.team != 'undefined' && answer == msg.team){
        callback(true);
        answered = true;
      }
    }
    if (!answered){
      callback(false);
    }
	});

	socket.on('should i answer',function(msg,callback){
		var answered = false;
		for (answer in question.answers){
			if (typeof msg.team != 'undefined' && answer == msg.team){
				callback(false);
				answered = true;
			}
		}
		if (!answered){
			if (question.open){
				//callback(votes.options);
				socket.emit('open question',question.question);
			}else{
				callback(false);
			}
		}
	});

	socket.on('have i voted',function(msg,callback){
		var voted = false;
		for (vote in votes.votes){
			if (vote == address){
				callback(true);
				voted = true;
			}
		}
		if (!voted){
			callback(false);
		}
	});

	socket.on('should i vote',function(msg,callback){
		var voted = false;
		for (vote in votes.votes){
			if (vote == address){
				callback(false);
				voted = true;
			}
		}
		if (!voted){
			if (votes.open){
				//callback(votes.options);
				socket.emit('open votes',votes.options);
			}else{
				callback(false);
			}
		}
	});

  socket.on('request toggables', function(msg){
    Object.keys(toggables).forEach(function(prop, index){
      io.sockets.emit('toggable change', {
        id: prop,
        active: toggables[prop]
      });
      io.sockets.emit('toggable group change', {
        group: prop,
        active: toggables[prop]
      });
    })
  })

  socket.on('toggable change',function(msg){
    toggables[msg.id] = toggables[msg.id] == true ? false : true;
    io.sockets.emit('toggable change', {
      id: msg.id,
      active: toggables[msg.id]
    });
    updateDataInDatabase();
	});

  socket.on('toggable group change',function(msg){
    console.log('toggable group change:',msg);
    toggables[msg.group] = msg.id;
    io.sockets.emit('toggable group change', {
      group: msg.group,
      active: msg.id
    });
    updateDataInDatabase();
	});

	socket.on('run cue', function (cueNumber) {
		runCue(cueNumber);
	});
	socket.on('run qlab cmd', function (cmd) {
		runQlabCmd(cmd);
	});
  socket.on('run xpression cmd', function (cmd) {
		runXpressionCmd(cmd);
	});
  socket.on('run ma cmd', function (cmd) {
		runMaCmd(cmd);
	});
	socket.on('vote',function(msg, callback){
    console.log('vote recieved from (',address,') ',msg)
		votes.votes[address] = msg;
		io.sockets.emit('update votes', countVotes());
		console.log('ALL VOTES', votes.votes);
    console.log('DERIVED VOTES', countVotes())
    updateDataInDatabase();
    callback();
	});
  socket.on('answer',function(msg, callback){
		question.answers[msg.team] = msg.answerIndex;
		callback();
		io.sockets.emit('update answers', question.answers);
    io.sockets.emit('close one tap', {
      team: msg.team
    });
    switch(msg.team){
      case 'a': runCue(60); break;
      case 'b': runCue(61); break;
      case 'c': runCue(62); break;
      case 'd': runCue(63); break;
      default: console.log('unknown team answered', msg);
    }
		console.log(question.answers);
	});
	socket.on('vote control',function(msg, callback){
    console.log('vote control', msg);
		if (msg.action.split(':')[0] == 'open votes'){
			votes.open = true;
      if (msg.action.split(':').length == 1){
        var teamNameArray = [ teamNames['a'], teamNames['b'], teamNames['c'], teamNames['d'] ]
        console.log('vote control: emit stored team names', teamNameArray );
        votes.options = teamNameArray;
      }else{
        console.log('vote control: emit options', msg.action.split(':')[1]);
        votes.options = msg.action.split(':')[1];
      }
			io.sockets.emit('open votes', votes.options);
		}
		if (msg.action == 'close votes'){
			votes.open = false;
			io.sockets.emit('close votes');
		}
		if (msg.action == 'count votes'){
			var count = countVotes();
			io.sockets.emit('update votes',count);
			callback(count);
		}
		if (msg.action == 'reset votes'){
			votes.relativeVotes = 0;
			votes.votes = {};
			var count = countVotes();
			io.sockets.emit('update votes',count);
			callback(count);
		}
		if (msg.action == 'add vote'){
			votes.relativeVotes++;
		}
		if (msg.action == 'subtract vote'){
			votes.relativeVotes++;
		}
		if (msg.action == 'push vote'){
			// COUNT VOTES
			// PUSH TO GRAPHICS
		}
    updateDataInDatabase();
	});

  socket.on('quiz control',function(msg, callback){
    console.log('quiz control', msg);
    if (msg.action == 'reset answers' || msg.action == 'reset answers and go'){
      question.answers = {};
      io.sockets.emit('update answers', question.answers);
      callback(null);
    }
    if (msg.action == 'open question' || msg.action == 'open question and tap'){
      question.open = true;
      io.sockets.emit('open question', question.question);
    }
    if (msg.action == 'open question and tap'){
      score.tapOpen = ['a','b','c','d'];
      io.sockets.emit('open tap', null);
    }

    if (msg.action == 'close question' || msg.action == 'close question and tap'){
      question.open = false;
      io.sockets.emit('close question');
    }

    if (msg.action == 'close question and tap'){
      score.tapOpen = null;
      io.sockets.emit('close tap', null);
    }

    if (msg.action == 'reset answers and go'){
      console.log('reset answers and go');
      io.sockets.emit('request next question', null, null);
    }

    if (msg.action == 'count question'){
      io.sockets.emit('update answers', question.answers);
      callback(null);
    }

    if (msg.action == 'push question'){
      // COUNT VOTES
      // PUSH TO GRAPHICS
    }
    if (msg.action == 'push options'){
      // COUNT VOTES
      // PUSH TO GRAPHICS
    }
    if (msg.action == 'push answers'){
      // COUNT VOTES
      // PUSH TO GRAPHICS
    }
  });


  socket.on('score control',function(msg, callback){
    console.log('score control', msg);
    var actionObj = msg.action.split(':');
    var action = actionObj[0];
    if (action == 'duel swap'){
      var xOldScore = score.values[toggables['duel-set-left']];
      var yOldScore = score.values[toggables['duel-set-right']];

      setScoreValue(toggables['duel-set-left'], yOldScore);
      setScoreValue(toggables['duel-set-right'], xOldScore);

      io.sockets.emit('update scores', score);
      callback(null);
    }
    if (action == 'duel inc left'){
      duel.left.score = duel.left.score + 1;
      callback(null);
    }
    if (action == 'duel inc right'){
      duel.right.score = duel.right.score + 1;
      callback(null);
    }
    if (action == 'duel dec left'){
      duel.left.score = duel.left.score - 1;
      callback(null);
    }
    if (action == 'duel dec right'){
      duel.right.score = duel.right.score - 1;
      callback(null);
    }
    if (action == 'inc score'){
      setScoreValue(actionObj[1], score.values[actionObj[1]] + score.changeAmount);
      io.sockets.emit('update scores', score);
      callback(null);
    }
    if (action == 'dec score'){
      setScoreValue(actionObj[1], score.values[actionObj[1]] - score.changeAmount);
      io.sockets.emit('update scores', score);
      callback(null);
    }
    if (action == 'set score change amount'){
      score.changeAmount = parseInt(actionObj[1]);
    }
    if (action == 'set score'){
      console.log('got score from display',msg.team,':',msg.score);
      setScoreValue(msg.team, msg.score);
      if (msg.onlyEmitToSlaves == true){
        io.sockets.emit('update slave scores', score);
      }else{
        io.sockets.emit('update scores', score);
      }
    }
    if (action == 'settle score'){
      _settleScoreFromQuestion('a');
      _settleScoreFromQuestion('b');
      _settleScoreFromQuestion('c');
      _settleScoreFromQuestion('d');
      console.log('question settle scores to',score)
      io.sockets.emit('update scores', score);
    }
    if (action == 'robbery execute'){
      _swapScoreFromChallenge(toggables['robbery-set-thief'], toggables['robbery-set-victim'], parseInt(actionObj[1]));
      io.sockets.emit('update scores', score);
    }
    if (action == 'robbery undo execute'){
      _swapScoreFromChallenge(toggables['robbery-set-victim'], toggables['robbery-set-thief'], parseInt(actionObj[1]));
      io.sockets.emit('update scores', score);
    }
    if (action == 'challenge settle score'){
      _settleScoreFromChallenge('a');
      _settleScoreFromChallenge('b');
      _settleScoreFromChallenge('c');
      _settleScoreFromChallenge('d');
      io.sockets.emit('update scores', score);
    }
    if (action == 'open tap'){
      score.tapOpen = ['a','b','c','d'];
      io.sockets.emit('open tap', null);
    }
    if (action == 'close tap'){
      score.tapOpen = null;
      io.sockets.emit('close tap', null);
    }
    if (action == 'close one tap'){
      //score.pop(score.tapOpen.indexOf(msg.team));
      io.sockets.emit('close one tap', {
        team: actionObj[1]
      });
    }
    updateDataInDatabase();
  });

  socket.on('config control',function(msg, callback){
    console.log('config control', msg);
    var actionObj = msg.action.split(':');
    var action = actionObj[0];

    if (action == 'set team name'){
      var team = actionObj[1];
      var name = msg.value;
      if (name !== null){
        console.log('set team name', team, name);
        teamNames[team] = name;
        setXpressionField('name_'+team, name, function(){

        })
        io.sockets.emit('update teams name', teamNames);
      }
    }
    if (action == 'set team score'){
      var team = actionObj[1];
      if (msg.value !== null && msg.value !==''){
        var newScore = parseInt(msg.value);
        console.log('set team score', team, newScore);
        setScoreValue(team, newScore);
        setXpressionField('score_'+team, newScore, function(){

        });
        io.sockets.emit('update scores', score);
      }

    }
    updateDataInDatabase();
  });


  _settleScoreFromQuestion = function(team){
    if (question.answers[team] == question.question.correct_answer){
      setScoreValue(team, score.values[team] + score.changeAmount);
    }else{
      setScoreValue(team, score.values[team] - score.changeAmount);
    }
  }

  _settleScoreFromChallenge = function(team){
    if (toggables['challenge-inc-score-'+team] == true){
      setScoreValue(team, score.values[team] + toggables['challenge-set-score-change-amount']);
    }
  }

  _swapScoreFromChallenge = function(thief,victim,amount){
    var victimsRemainingAmount = score.values[victim] - 100;
    if (victimsRemainingAmount < 0){
      amount = amount + victimsRemainingAmount;
    }

    setScoreValue(thief, score.values[thief] + amount);
    setScoreValue(victim, score.values[victim] - amount);
  }
});

var setScoreValue = function(team, value){
  console.log('set score value ',team,':',value)
  if (value < 0){
    score.values[team] = 0;
  }else{
    score.values[team] = value;
  }
}


// QLAB REMOTE
if (runQlab){
	try {
		var qlabClient = new osc.Client(config.qlabConnection.host || '192.168.1.7', config.qlabConnection.port || 53000);
		console.log('QLAB Connected');
	} catch (err) { console.log(err); };
}

if (runQlab2){
	try {
		var qlabClient2 = new osc.Client(config.qlabConnection2.host || '192.168.1.7', config.qlabConnection2.port || 53000);
		console.log('QLAB2 Connected');
	} catch (err) { console.log(err); };
}

if (runQlab3){
	try {
		var qlabClient3 = new osc.Client(config.qlabConnection3.host || '192.168.1.7', config.qlabConnection3.port || 53000);
		console.log('QLAB3 Connected');
	} catch (err) { console.log(err); };
}

if (runQlab4){
	try {
		var qlabClient4 = new osc.Client(config.qlabConnection4.host || '192.168.1.7', config.qlabConnection4.port || 53000);
		console.log('QLAB4 Connected');
	} catch (err) { console.log(err); };
}

if (runQlab5){
	try {
		var qlabClient5 = new osc.Client(config.qlabConnection5.host || '192.168.1.7', config.qlabConnection5.port || 53000);
		console.log('QLAB5 Connected');
	} catch (err) { console.log(err); };
}

// MA REMOTE
if (runMa){
	var maClient = new ma2console({
    host: config.maConnection.host,
    port: config.maConnection.port,
    errors: console.log
  });
}

// CARBONITE REMOTE
var carboniteClient = null;
if (runCarbonite){
  try {
		carboniteClient = new Carbonite({
      host: config.carboniteConnection.host
    })
    carboniteClient.connect();
  } catch (err) {console.log(err); };
}

// XPRESSION REMOTE
var xpressionClient = null;
if (runXpression){
  try {
		xpressionClient = new Xpression({
      host: config.xpressionConnection.host
    })
    xpressionClient.connect();
  } catch (err) {console.log(err); };
}







var runXpressionCmd = function(cmd){
  if (runXpression){
    try {
      console.log('run xpression cmd:',cmd);
      //xpressionClient.connect();
      xpressionClient.command(cmd);
    } catch (err) {console.log(err); };
  }
}

// RUN CUE COMMANDS
var runQlabCmd = function(cmd){
	if (runQlab){
    console.log('Run qlab cmd: '+cmd);
		try {
			qlabClient.send(cmd, 200, function (msg) {

			});
		} catch (err) {console.log(err); };
	}
  if (runQlab2){
    console.log('Run qlab2 cmd: '+cmd);
		try {
			qlabClient2.send(cmd, 200, function (msg) {

			});
		} catch (err) {console.log(err); };
	}
  if (runQlab3){
    console.log('Run qlab3 cmd: '+cmd);
		try {
			qlabClient3.send(cmd, 200, function (msg) {

			});
		} catch (err) {console.log(err); };
	}
  if (runQlab4){
    console.log('Run qlab4 cmd: '+cmd);
		try {
			qlabClient4.send(cmd, 200, function (msg) {

			});
		} catch (err) {console.log(err); };
	}
  if (runQlab5){
    console.log('Run qlab5 cmd: '+cmd);
		try {
			qlabClient5.send(cmd, 200, function (msg) {

			});
		} catch (err) {console.log(err); };
	}
}

var runCue = function(cueNumber){
	console.log('Run cue '+cueNumber);
	if (runQlab){
		try {
      console.log('run qlab cmd ','/cue/'+cueNumber+'/start');
			qlabClient.send('/cue/'+cueNumber+'/start', 200, function (msg) {

			});
		} catch (err) {console.log(err); };
	}
  if (runQlab2){
		try {
      console.log('run qlab2 cmd ','/cue/'+cueNumber+'/start');
			qlabClient2.send('/cue/'+cueNumber+'/start', 200, function (msg) {

			});
		} catch (err) {console.log(err); };
	}
  if (runQlab3){
		try {
      console.log('run qlab3 cmd ','/cue/'+cueNumber+'/start');
			qlabClient3.send('/cue/'+cueNumber+'/start', 200, function (msg) {

			});
		} catch (err) {console.log(err); };
	}
  if (runQlab4){
		try {
      console.log('run qlab4 cmd ','/cue/'+cueNumber+'/start');
			qlabClient4.send('/cue/'+cueNumber+'/start', 200, function (msg) {

			});
		} catch (err) {console.log(err); };
	}
  if (runQlab5){
		try {
      console.log('run qlab5 cmd ','/cue/'+cueNumber+'/start');
			qlabClient5.send('/cue/'+cueNumber+'/start', 200, function (msg) {

			});
		} catch (err) {console.log(err); };
	}

	if (runMa){
		try {
			maClient.goto(cueNumber);
		} catch (err) {console.log(err); };
	}

	if (runCarbonite){
    console.log('carbonite cmd: cc 8:',cueNumber);
    carboniteClient.cc(8, cueNumber);
	}

}



var runMaCmd = function(cmd){
  console.log('Run maCmd '+cmd);
  if (runMa){
  	try {
  		maClient.goto(cmd);
  	} catch (err) {console.log(err); };
  }
}




// FETCH INITIAL STATE FROM DB
getXpressionField('name_a', function(teamName){
  teamNames['a'] = teamName;
})
getXpressionField('name_b', function(teamName){
  teamNames['b'] = teamName;
})
getXpressionField('name_c', function(teamName){
  teamNames['c'] = teamName;
})
getXpressionField('name_d', function(teamName){
  teamNames['d'] = teamName;
})

getXpressionField('score_a', function(score){
  setScoreValue('a', parseInt(score));
})
getXpressionField('score_b', function(score){
  setScoreValue('b', parseInt(score));
})
getXpressionField('score_c', function(score){
  setScoreValue('c', parseInt(score));
})
getXpressionField('score_d', function(score){
  setScoreValue('d', parseInt(score));
})
