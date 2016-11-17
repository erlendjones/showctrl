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
    host:     '192.168.8.254'
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


function updateDataInDatabase(){
  setXpressionField('score_a',  score.values['a'], function(err){
    console.log(err);
  });
  setXpressionField('score_b',  score.values['b'], function(err){
    console.log(err);
  });
  setXpressionField('score_c',  score.values['c'], function(err){
    console.log(err);
  });
  setXpressionField('score_d',  score.values['d'], function(err){
    console.log(err);
  });

  /// DUEL DATA
  var left_team = toggables['duel-set-left'];
  var right_team = toggables['duel-set-right'];
  setXpressionField('duel_left_score', duel.left.score, function(err){  //LEFT
    console.log(err);
  });
  getXpressionField('name_'+left_team, function(value){
    console.log('name left team', value);
    setXpressionField('duel_left_name',  value, function(err){
      console.log(err);
    });
  })
  setXpressionField('duel_left_total_score', score.values[left_team], function(err){
    console.log(err);
  });

  setXpressionField('duel_right_score', duel.right.score, function(err){ // RIGHT
    console.log(err);
  });
  getXpressionField('name_'+right_team, function(value){
    console.log('name right team', value);
    setXpressionField('duel_right_name',  value, function(err){
      console.log(err);
    });
  });
  setXpressionField('duel_right_total_score', score.values[right_team], function(err){
    console.log(err);
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
}

var teamNames = {
  a: '',
  b: '',
  c: '',
  d: ''
}


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


io.on('connection', function (socket) {
	var address = socket.request.connection.remoteAddress;
	console.log('User connected');

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
        team_name: team[msg.team]
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
		votes.votes[address] = msg;
		callback();
		io.sockets.emit('update votes',countVotes());
		console.log(votes.votes);
	});
  socket.on('answer',function(msg, callback){
		question.answers[msg.team] = msg.answerIndex;
		callback();
		io.sockets.emit('update answers', question.answers);
    io.sockets.emit('close one tap', {
      team: msg.team
    })
		console.log(question.answers);
	});
	socket.on('vote control',function(msg, callback){
		if (msg.action.split(':')[0] == 'open votes'){
			votes.open = true;
      if (msg.action.split(':').length == 1){
        votes.options = teamNames;
      }else{
        votes.options = msg.action.split(':')[1];
      }
			io.sockets.emit('open votes',msg.action.split(':')[1]);
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
	});

  socket.on('quiz control',function(msg, callback){
    console.log('quiz control', msg);
    if (msg.action == 'reset question' || msg.action == 'reset and open question'){
      question.answers = {};
      io.sockets.emit('update answers', question.answers);
      callback(null);
    }
    if (msg.action == 'open question' || msg.action == 'reset and open question'){
      question.open = true;
      io.sockets.emit('open question', question.question);
    }
    if (msg.action == 'close question'){
      question.open = false;
      io.sockets.emit('close question');
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

      score.values[toggables['duel-set-left']] = yOldScore;
      score.values[toggables['duel-set-right']] = xOldScore;

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
      score.values[actionObj[1]] = score.values[actionObj[1]] + score.changeAmount;
      io.sockets.emit('update scores', score);
      callback(null);
    }
    if (action == 'dec score'){
      score.values[actionObj[1]] = score.values[actionObj[1]] - score.changeAmount;
      io.sockets.emit('update scores', score);
      callback(null);
    }
    if (action == 'set score change amount'){
      score.changeAmount = parseInt(actionObj[1]);
    }
    if (action == 'set score'){
      score.values[msg.team] = msg.score;
      io.sockets.emit('update scores', score);
    }
    if (action == 'settle score'){
      _settleScoreFromQuestion('a');
      _settleScoreFromQuestion('b');
      _settleScoreFromQuestion('c');
      _settleScoreFromQuestion('d');
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

  _settleScoreFromQuestion = function(team){
    if (question.answers[team] == question.question.correct_answer){
      score.values[team] = score.values[team] + score.changeAmount;
    }else{
      score.values[team] = score.values[team] - score.changeAmount;
    }
  }

  _settleScoreFromChallenge = function(team){
    if (toggables['challenge-inc-score-'+team] == true){
      score.values[team] = score.values[team] + toggables['challenge-set-score-change-amount'];
    }
  }

  _swapScoreFromChallenge = function(thief,victim,amount){
    score.values[thief] = score.values[thief] + amount;
    score.values[victim] = score.values[victim] - amount;
  }


	function countVotes(){
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
});


// QLAB REMOTE
if (runQlab){
	try {
		var qlabClient = new osc.Client(config.qlabConnection.host || '192.168.1.7', config.qlabConnection.port || 53000);
		console.log('QLAB Connected');
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
	console.log('Run qlab cmd: '+cmd);
	if (runQlab){
		try {
			qlabClient.send(cmd, 200, function (msg) {

			});
		} catch (err) {console.log(err); };
	}
}

var runCue = function(cueNumber){
	console.log('Run cue '+cueNumber);
	if (runQlab){
		try {
			qlabClient.send('/cue/'+cueNumber+'/start', 200, function (msg) {

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
