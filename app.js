var osc = require('node-osc');
var telnet = require('telnet-client');
var express= require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var mysql = require('mysql');


process.title = 'show-ctrl-server';


const config = {
  port: 8080,
  mysqlConnection: {
    host     : 'localhost',
    port     :  8889,
    user     : 'gameshow',
    password : 'gameshow',
    database : 'gameshow'
  },
  carboniteConnection: {
    host:     '192...'
  },
  xpressionConnection: {
    host:     '192...'
  },
  maConnection: {
    host:     '192...'
  },
  qlabConnection: {
    host:     '192...'
  }
}




// MYSQL CONNECTION
var mysqlCon = mysql.createConnection(config.mysqlConnection);
mysqlCon.connect();

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

io.on('connection', function (socket) {
	var address = socket.request.connection.remoteAddress;
	console.log('User connected');

  socket.on('select questions',function(msg,callback){
    console.log('socket.on select questions',msg);
		// get questions
    selectQuestions(callback);
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
			if (answer == msg.team){
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
      if (answer == msg.team){
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
			if (answer == msg.team){
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

	socket.on('run cue', function (cueNumber) {
		runCue(cueNumber);
	});
	socket.on('run qlab cmd', function (cmd) {
		runQlabCmd(cmd);
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
			votes.options = msg.action.split(':')[1];
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
  });

  _settleScoreFromQuestion = function(team){
    if (question.answers[team] == question.question.correct_answer){
      score.values[team] = score.values[team] + score.changeAmount;
    }else{
      score.values[team] = score.values[team] - score.changeAmount;
    }
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



//// REMOTE CONNECTIONS ////
var runMa = false;
var runCarbonite = false;
var runXpression= false;
var runQlab = false;


// QLAB REMOTE
if (runQlab){
	try {
		var qlabClient = new osc.Client(config.qlabConnection.host || '192.168.1.7', config.qlabConnection.port || 53000);
		console.log('QLAB Connected')
	} catch (err) { console.log(err); };
}

// MA REMOTE
if (runMa){
	try {
		var maClient = new telnet();
		maClient.on('ready', function(prompt) {
			console.log('MA connected');
		});

		maClient.on('timeout', function() {
		  console.log('MA-socket timeout!')
		  maClient.end();
		});

		maClient.on('close', function() {
		  console.log('MA-connection closed');
		});

		maClient.on('error', function() {
			console.log('MA-connection error');
		});

		maClient.connect({
      host: config.maConnection.host || '192.168.1.3',
      port: config.maConnection.port || 23,
      shellPrompt: '/ # ',
      timeout: 10000 });
	} catch (err) {console.log(err);};
}
// CARBONITE REMOTE
if (runCarbonite){
	try {
		var carboniteClient = new telnet();
		carboniteClient.on('ready', function(prompt) {
			console.log('CARBONITE connected');
		});

		carboniteClient.on('timeout', function() {
		  console.log('CARBONITE-socket timeout!')
		  carboniteClient.end();
		});

		carboniteClient.on('close', function() {
		  console.log('CARBONITE-connection closed');
		});

		carboniteClient.on('error', function() {
			console.log('CARBONITE-connection error');
		});

		carboniteClient.connect({ host: config.carboniteConnection.host || '192.168.1.5', port: config.carboniteConnection.port || 7788, timeout: 'infinite' });
	} catch (err) {console.log(err);};
}

// CARBONITE REMOTE
if (runXpression){
	try {
		var xpressionClient = new telnet();
		pression.on('ready', function(prompt) {
			console.log('XPRESSION connected');
		});

		pression.on('timeout', function() {
		  console.log('XPRESSION-socket timeout!')
		  carboniteClient.end();
		});

		pression.on('close', function() {
		  console.log('XPRESSIONconnection closed');
		});

		pression.on('error', function() {
			console.log('XPRESSION-connection error');
		});

		pression.connect({ host: config.xpressionConnection.host || '192.168.1.5', port: config.xpressionConnection.port || 7788, timeout: 'infinite' });
	} catch (err) {console.log(err);};
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
			maClient.exec('GO macro '+cueNumber, function(response) {
			 	console.log(response);
			});
		} catch (err) {console.log(err); };
	}

	if (runCarbonite){
		try {
			carboniteClient.exec('CC 8:'+cueNumber, function(response) {
				console.log(response);
			});
		} catch (err) {console.log(err); };
	}

  if (runXpression){
		try {
			xpressionClient.exec('?????:'+cueNumber, function(response) {
				console.log(response);
			});
		} catch (err) {console.log(err); };
	}
}
