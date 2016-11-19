(function(){

	var randomString = function(N = 10){
		return (Math.random().toString(36)+'00000000000000000').slice(2, N+2);
	}

	var is_touch_device = function() {
	  return 'ontouchstart' in window        // works on most browsers
	      || navigator.maxTouchPoints;       // works on IE10/11 and Surface
	};

	// Set the click trigger according to screen-type
	window.touchdown = is_touch_device() ? 'touchstart' : 'click';


	document.title="SHOW+CTRL";
	var socket = io.connect();

	//Make the socket global for debugging
	window.socket = socket;


	socket.on('toggable change', function(msg){
		console.log('toggable change recieved', msg);
		if (msg.active == true){
			$('[data-toggableid="'+msg.id+'"]').addClass('toggle-active');
		}
		if (msg.active == false){
			$('[data-toggableid="'+msg.id+'"]').removeClass('toggle-active');
		}
	});

	socket.on('toggable group change', function(msg){
		console.log('toggable group change recieved', msg);
		$('[data-toggablegroup="'+msg.group+'"]').removeClass('toggle-active');
		$('[data-toggablegroup="'+msg.group+'"][data-toggableid="'+msg.active+'"]').addClass('toggle-active');
	});

	var openItemIndex = 0;

	var openItemByIndex = function(index, containerId){
		console.log('Opening page: '+index);
		var item = items[index];
		var buttons = [];
		if (item.parent && !$("#header").length){
			buttons.push(buttonHtml({
				label: '&lt;',
				section: item.parent,
				style: 'dark-button'
			}));
		}
		$.each(item.content, function(i, button){
			if (button.type != 'container'){
				buttons.push(buttonHtml(button));
			}else{
				buttons.push(containerHtml(button));
			}
		});
		$("#"+containerId).html(buttons.join(''));




		$("#"+containerId).children().unbind(window.touchdown || 'touchstart').bind(window.touchdown || 'touchstart', function(button){
			if ($(this).data('cue') != null){
				socket.emit('run cue', $(this).data('cue'), function(res){
					console.log(res);
				});
			}
			if ($(this).data('qlab') != null){
				socket.emit('run qlab cmd', $(this).data('qlab'), function(res){
					console.log(res);
				});
			}
			if ($(this).data('xpression') != null){
				socket.emit('run xpression cmd', $(this).data('xpression'), function(res){
					console.log(res);
				});
			}
			if ($(this).data('section') != null){
				if (item.target){
					openItemByName($(this).data('section'), item.target);
				}else{
					openItemByName($(this).data('section'), 'buttons');
				}
			}
			if ($(this).data('vote') != null){
				socket.emit('vote', $(this).data('vote'), function(res){
					console.log(res);
					alert('Takk for stemmen!');
				});
				$("#header").html('Takk for stemmen. Knappene vil dukke opp igjen neste gang det skal stemmes.');

			}
			if ($(this).data('answer') != null){
				socket.emit('answer', { answerIndex: $(this).data('answer'), team: $(this).data('team') }, function(res){
					console.log(res);
				});
				$("#header").html('Takk for svaret!');
			}
			if ($(this).data('votecontrol') != null){
				socket.emit('vote control', {action: $(this).data('votecontrol') }, function(res){
					console.log(res);
				});
			}

			if ($(this).data('quizcontrol') != null){
				console.log('running quiz control');
				socket.emit('quiz control', {action: $(this).data('quizcontrol') }, function(res){
					console.log(res);
				});
			}
			if ($(this).data('scorecontrol') != null){
				console.log('running score control');
				socket.emit('score control', {
					action: $(this).data('scorecontrol')
				}, function(res){
					console.log(res);
				});
				if ($(this).data('toggleGroup') != null){
					// DO TOGGLE STUFF HERE
				}
			}
			if ($(this).data('configcontrol') != null){
				console.log('running config control');
				socket.emit('config control', {
					action: $(this).data('configcontrol'),
					value: prompt('Enter new value:')
				}, function(res){
					console.log(res);
				});
			}
			if ($(this).data('toggableid') != null){
				if ($(this).data('toggablegroup') != null){
					socket.emit('toggable group change', {
						group: $(this).data('toggablegroup'),
						id: $(this).data('toggableid')
					});
				}else{
					socket.emit('toggable change', {
						id: $(this).data('toggableid')
					});
				}
			}
		});

		socket.emit('request toggables', null);

		openItemIndex = index;
	}

	var openItemByName = function(name, containerId){
		$.each(items, function(index, item){
			if (item.name == name){
				console.log('Opening page: '+name,index);
				openItemByIndex(index, containerId);
			}
		});
	}

	var buttonHtml = function(data){
		return '<div class="big-button '+
			(typeof data.style != 'undefined' ? data.style : '')+'" '+
			(typeof data.cue != 'undefined' ? 'data-cue="'+data.cue+'" ' : '') +
			(typeof data.qlab != 'undefined' ? 'data-qlab="'+data.qlab+'" ' : '') +
			(typeof data.xpression != 'undefined' ? 'data-xpression="'+data.xpression+'" ' : '') +
			(typeof data.toggableid != 'undefined' ? 'data-toggableid="'+data.toggableid+'" ' : '') +
			(typeof data.toggablegroup != 'undefined' ? 'data-toggablegroup="'+data.toggablegroup+'" ' : '') +
			(typeof data.section != 'undefined' ? 'data-section="'+data.section+'" ' : '') +
			(typeof data.vote != 'undefined' ? 'data-vote="'+data.vote+'" ' : '') +
			(typeof data.voteControl != 'undefined' ? 'data-votecontrol="'+data.voteControl+'" ' : '') +
			(typeof data.quizControl != 'undefined' ? 'data-quizcontrol="'+data.quizControl+'" ' : '') +
			(typeof data.scoreControl != 'undefined' ? 'data-scorecontrol="'+data.scoreControl+'" ' : '') +
			(typeof data.configControl != 'undefined' ? 'data-configcontrol="'+data.configControl+'" ' : '') +
			(typeof data.answer != 'undefined' ? 'data-answer="'+data.answer+'" ' : '') +
			(typeof data.team != 'undefined' ? 'data-team="'+data.team+'" ' : '') +
			'>'+(typeof data.label != 'undefined' ? '<span>'+data.label+'</span>' : '')+'</div>';
	};

	var containerHtml = function(data){
		return '<div class="container '+
			(typeof data.style != 'undefined' ? data.style : '')+'" '+
			(typeof data.id != 'undefined' ? 'id="'+data.id+'" ' : '') +
			(typeof data.cue != 'undefined' ? 'data-cue="'+data.cue+'" ' : '') +
			(typeof data.qlab != 'undefined' ? 'data-qlab="'+data.qlab+'" ' : '') +
			(typeof data.section != 'undefined' ? 'data-section="'+data.section+'" ' : '') +
			(typeof data.vote != 'undefined' ? 'data-vote="'+data.vote+'" ' : '') +
			(typeof data.voteControl != 'undefined' ? 'data-votecontrol="'+data.voteControl+'" ' : '') +
			(typeof data.quizControl != 'undefined' ? 'data-quizcontrol="'+data.quizControl+'" ' : '') +
			(typeof data.scoreControl != 'undefined' ? 'data-scorecontrol="'+data.scoreControl+'" ' : '') +
			(typeof data.configControl != 'undefined' ? 'data-configcontrol="'+data.configControl+'" ' : '') +
			(typeof data.answer != 'undefined' ? 'data-answer="'+data.answer+'" ' : '') +
			(typeof data.team != 'undefined' ? 'data-team="'+data.team+'" ' : '') +
			'>'+(typeof data.label != 'undefined' ? data.label : '')+'</div>';
	};

	var createVotingButtons = function(options){ // Options as string
		var buttonStyle = ['blue-button', 'red-button', 'green-button'];
		var voteButtons = [];
		$.each(options, function(i,option){
			voteButtons.push({
				label: option,
				vote: option,
				style: buttonStyle[i],
				//cue: 90 + Math.floor(Math.random() * 12) + 1
			});
		});
		return voteButtons; // Array
	}

	var createQuestionButtons = function(question){ // Options as string
		var buttonStyle = ['blue-button', 'red-button', 'green-button'];
		var answeringButtons = [];
		var options = [
			question.option1,
			question.option2,
			question.option3,
			question.option4,
		]
		$.each(options, function(i,option){
			answeringButtons.push({
				label: option,
				team: team,
				answer: i + 1,
				style: 'blue-button',
				//cue: 50
			});
		});
		return answeringButtons; // Array
	}

	if (typeof votee != 'undefined'){
		socket.on('open votes',function(options){
			items = [
				{
					name: 'votes',
					content: createVotingButtons(options)
				}
			];
			openItemByName('votes','header');
		});

		socket.on('close votes',function(){
			$("#header").html('Avstemmingen er avsluttet!');
		});

		socket.emit('have i voted',null,function(res){
			if (res){
				$("#header").html('Takk for stemmen!');
			}else{
				socket.emit('should i vote',null,function(res){
					if (!res){
						$("#header").html('Velkommen! Når du kan stemme knapper dukke opp!');
					}
				});
			}
		});
	}


	if (typeof contestant != 'undefined'){
			socket.on('open question', function(question){
				console.log('open question', question);
				items = [
					{
						name: 'options',
						content: createQuestionButtons(question)
					}
				];
				openItemByName('options','header');
				$("#header").prepend('<h2>'+question.question_text+'</h2>');
			});

			socket.on('close question',function(){
				$("#header").html('Oppgaven er avsluttet!');
			});

			socket.emit('have i answered', team,function(res){
				if (res){
					$("#header").html('Takk for svaret!');
				}else{
					socket.emit('should i answer', team,function(res){
						if (!res){
							$("#header").html('Velkommen! Når du kan svare vil knapper dukke opp!');
						}
					});
				}
			});
		}

	if (typeof matrixAccess != 'undefined'){
		openItemByName('main','header');

		socket.on('update votes', function(votes){
			console.log(votes);
			var htmla = [];
			for (vote in votes){
				htmla.push(buttonHtml({
					label: vote+': '+votes[vote]
				}));
			}
			$("#votes").html(htmla.join(''));
		});

		socket.on('update answers', function(answers){
			console.log(answers);
			var htmla = Object.keys(answers).map(function(answer){
				return buttonHtml({
					label: answer+': '+answers[answer]
				});
			});
			$("#answers").html(htmla.join(''));
		});


		var question = {};
		var answers = {};

		socket.on('open question', function(msg){
			question = msg;
			renderStatus();
		})

		socket.on('update answers', function(msg){
			answers = msg;
			renderStatus();
		});

		var renderStatus = function(){
			$("#teamstatus").html([
				buttonHtml({label:'A', style:'break-line'}),
				renderStatusButton(question, 1, answers['a'] || null),
				renderStatusButton(question, 2, answers['a'] || null),
				renderStatusButton(question, 3, answers['a'] || null),
				renderStatusButton(question, 4, answers['a'] || null),
				buttonHtml({label:'B', style:'break-line'}),
				renderStatusButton(question, 1, answers['b'] || null),
				renderStatusButton(question, 2, answers['b'] || null),
				renderStatusButton(question, 3, answers['b'] || null),
				renderStatusButton(question, 4, answers['b'] || null),
				buttonHtml({label:'C', style:'break-line'}),
				renderStatusButton(question, 1, answers['c'] || null),
				renderStatusButton(question, 2, answers['c'] || null),
				renderStatusButton(question, 3, answers['c'] || null),
				renderStatusButton(question, 4, answers['c'] || null),
				buttonHtml({label:'D', style:'break-line'}),
				renderStatusButton(question, 1, answers['d'] || null),
				renderStatusButton(question, 2, answers['d'] || null),
				renderStatusButton(question, 3, answers['d'] || null),
				renderStatusButton(question, 4, answers['d'] || null),
			].join(''));
		}

		var renderStatusButton = function(question, optionIndex, selectedAnswer){
			return buttonHtml({
				label: question['option'+optionIndex],
				style: optionColor(optionIndex, selectedAnswer, question.correct_answer)
			})
		}

		var optionColor = function(optionIndex, selectedIndex, correctIndex){
			console.log(optionIndex, selectedIndex, correctIndex);
			if (optionIndex == selectedIndex && optionIndex == correctIndex){
				console.log('HOO');
				return 'green-button'
			}
			if (optionIndex == selectedIndex){
				return 'red-button'
			}
			return 'grey-button'
		}




	}

	if (typeof quizmaster != 'undefined'){



		var questionStore = [];
		var activeQuestion = '';

		//make global
		window.questionStore = questionStore;
		window.activeQuestion = activeQuestion;

		var mountQuestions = function(){
			mountQuestionsFromLocalStorage();
		}

		var mountQuestionsFromDB = function(){
			selectQuestions(function(result){
				console.log('selectQuestions result:',result);
				if (result.err) throw err;
				else {
					questionStore = result.rows;
					renderTable();
				}
			})
		}

		var mountQuestionsFromLocalStorage = function(){
			$(window).unload(_saveSettings);
			if (typeof localStorage.questionStore != 'undefined'){
				try {
					questionStore = JSON.parse(localStorage.questionStore);
				} catch (e) {
					console.warn('Error parsing JSON');
				}
			}
			renderTable();
		}

		function _saveSettings() {
		    localStorage.questionStore = JSON.stringify(questionStore);
		}

		var renderTable = function(){
			console.log('qs:',questionStore);
			if (questionStore.length == 0){
				questionStore.push({
					id:randomString(),
					number:1,
					question_text:'Question?',
					option1:'',
					option2:'',
					option3:'',
					option4:'',
					correct_answer:1
				});
			}
			console.log('qs:',questionStore);
			$("#table").html(renderQuestions(questionStore, activeQuestion));
			bindActionButtons();
		}

		var selectQuestions = function(callback){
			socket.emit('select questions', null, callback);
		};

		var renderQuestions = function(questions, activeQuestion){
			return '<span class="quizm-button-take-next glyphicon glyphicon-play-circle"></span><span class="table-add glyphicon glyphicon-plus"></span><table class="table"><tr><th>id</th><th>number</th><th>question_text</th><th>option1</th><th>option2</th><th>option3</th><th>option4</th><th>correct_answer</th><th></th><th></th><th></th></tr>'+ questions.map(function(val){
				return renderQuestion(val, activeQuestion);
			}).join('')+'</table>'
		}

		var renderQuestion = function(question, activeQuestion){
			var hideClass = question.hide ? ' hide' : '';
			return '<tr class="'+hideClass+' '+_activeQuestionClass(question, activeQuestion)+'"><td>'+question.id+'</td><td contenteditable="true" class="table-input-cell">'+question.number+'</td><td contenteditable="true" class="table-input-cell">'+question.question_text+'</td><td contenteditable="true" class="table-input-cell '+_correctAnswerClass(question,1)+'">'+question.option1+'</td><td contenteditable="true" class="table-input-cell '+_correctAnswerClass(question,2)+'">'+question.option2+'</td><td contenteditable="true" class="table-input-cell '+_correctAnswerClass(question,3)+'">'+question.option3+'</td><td contenteditable="true" class="table-input-cell '+_correctAnswerClass(question,4)+'">'+question.option4+'</td><td contenteditable="true" class="table-input-cell force-rerender-on-edit">'+question.correct_answer+'</td><td>'+renderQuestionActions(question)+'</td><td><span class="table-remove glyphicon glyphicon-remove"></span></td><td><span class="table-up glyphicon glyphicon-arrow-up"></span><span class="table-down glyphicon glyphicon-arrow-down"></span></td></tr>'
		}

		var _correctAnswerClass = function(question, index){
			return question.correct_answer == index ? 'correct-answer' : '';
		}

		var _activeQuestionClass = function(question, activeQuestion){
			return question.id == activeQuestion ? 'active-question' : '';
		}

		var renderQuestionActions = function(question){
			return '<div class="quizm-button-take" data-question-id="'+question.id+'">TAKE</div>';
		}

		var bindActionButtons = function(questionStore){
			$(".quizm-button-take").unbind('click').bind('click', function(){
				takeQuestionAction($(this).data('question-id'));
			});

			$(".quizm-button-take-next").unbind('click').bind('click', function(){
				takeNextQuestionAction();
			});

			$('.table-add').unbind('click').bind('click', function () {
			  $("#table").find('table').append(renderQuestion({
					id:randomString(),
					number:$("#table .table").children("tr").length + 1,
					question_text:'Question?',
					option1:'',
					option2:'',
					option3:'',
					option4:'',
					correct_answer:1
				}));
				bindActionButtons();
				setStateFromDoc();
			});

			$('.table-remove').unbind('click').bind('click', function () {
				if (confirm('Are you sure?')){
				  $(this).parents('tr').detach();
					setStateFromDoc();
				}
			});

			$('.table-up').unbind('click').bind('click', function () {
			  var $row = $(this).parents('tr');
			  if ($row.index() === 1) return; // Don't go above the header
			  $row.prev().before($row.get(0));
				setStateFromDoc();
			});

			$('.table-down').unbind('click').bind('click', function () {
			  var $row = $(this).parents('tr');
			  $row.next().after($row.get(0));
				setStateFromDoc();
			});

			$('.table-input-cell').unbind('blur').bind('blur', function () {
			  var $row = $(this).parents('tr');
				setStateFromDoc();
				if ($(this).hasClass('force-rerender-on-edit')){
					renderTable();
				}
			});
		}

		var setStateFromDoc = function(){
			setState(getData());
		}


		var setState = function(state){
			questionStore = state;
			window.questionStore = questionStore;
			console.log(state);
		}

		var getQuestionById = function(id){
			return questionStore.filter(function(question){
				return question.id == id
			})[0] || null;
		}

		var takeQuestionAction = function(id){
			console.log('takeQuestionAction - id:',id);
			var question = getQuestionById(id);

			console.log('question:',question);
			socket.emit(
				'set xpression question',
				question,
				function(){
					socket.emit('quiz control', {action:'reset and open question'}, function(){
						activeQuestion = id;
						renderTable();
						console.log('takeQuestionAction:callback');
					});
				}
			)
		}

		var getNextQuestionIdFromStore = function(){
			console.log('takeNextQuestionAction:',activeQuestion);
			var nextQuestion = null;
			var currentQuestionIndex = questionStore.indexOf(getQuestionById(activeQuestion));
			var nextQuestion = questionStore[currentQuestionIndex + 1] || questionStore[0] || null;
			if (nextQuestion != null){
				return nextQuestion.id;
			}
			else{
				console.warn('AT THE END');
			}
		}

		var takeNextQuestionAction = function(){
			takeQuestionAction(getNextQuestionIdFromStore());
		}


		// A few jQuery helpers for exporting only
		jQuery.fn.pop = [].pop;
		jQuery.fn.shift = [].shift;

		var getData = function(){
			var $rows = $("#table").find('tr:not(:hidden)');
		  var headers = [];
		  var data = [];

		  // Get the headers (add special header logic here)
		  $($rows.shift()).find('th:not(:empty)').each(function () {
		    headers.push($(this).text().toLowerCase());
		  });

		  // Turn all existing rows into a loopable array
		  $rows.each(function () {
		    var $td = $(this).find('td');
		    var h = {};

		    // Use the headers from earlier to name our hash keys
		    headers.forEach(function (header, i) {
					if (header == 'correct_answer'){
						  h[header] = parseInt($td.eq(i).text());
					} else {
						  h[header] = $td.eq(i).text();
					}
		    });

		    data.push(h);
		  });

		  // Output the result
		  return data;
		}


		console.info('LOADING QUIZMASTER');
		mountQuestions();
		var $TABLE = $('#table');

	}


	var setTeamScore = function(score, team){

		// Limit new value to zero or above;
		if (score.values[team] < 0){
			score.values[team] = 0;
		}

		// Only run if value has changed
		if (score.values[team] != window.lastScoreValue[team]){



			// Tint to green if positive change
			if (score.values[team] > window.lastScoreValue[team]){
				$('#team-'+team).find('.overlay').addClass('green-tint');
				setTimeout(function(){
					$('#team-'+team).find('.overlay').removeClass('red-tint').removeClass('green-tint');
				},2000);
			}

			// Tint to red if negative change
			if (score.values[team] < window.lastScoreValue[team]){
				$('#team-'+team).find('.overlay').addClass('red-tint');
				setTimeout(function(){
					$('#team-'+team).find('.overlay').removeClass('red-tint').removeClass('green-tint');
				},2000);
			}

			// Shake name when score is changed
			$('#team-'+team).find('.scorecontainer').effect( "shake", {
				direction: 'up',
				distance: 15,
				times: 6
			});

			// Calculate animation speed
			var animationLength = (window.lastScoreValue[team] - score.values[team]) * 5;
			if (animationLength < 0){ animationLength = animationLength *-1; }
			if (animationLength > 3000){ animationLength = 3000; }

			$('#team-'+team).find('.scorevalue').prop('number', window.lastScoreValue[team]).animateNumber(
				{
					number: score.values[team],
				},
				animationLength
			);
		}
		window.lastScoreValue[team] = score.values[team];
	}

	var decScoreByOne = function(team, belowZeroCallback){
		var oldVal = parseInt($("#team-"+team).find('.scorevalue').text());
		var newVal = oldVal - 1;
		var lowerThanZero = newVal < 0;
		if (!lowerThanZero){
			$("#team-"+team).find('.scorevalue').html( newVal	);
		}else{
			belowZeroCallback(team);
		}
	}

	var openAllTaps = function(){
		$(".overlay").addClass('blue-tint');

		// If propogated, stop previous interval
		clearInterval(window.tapInterval['a']);
		clearInterval(window.tapInterval['b']);
		clearInterval(window.tapInterval['c']);
		clearInterval(window.tapInterval['d']);

		// Start tap
		window.tapInterval['a'] = setInterval( function(){
			decScoreByOne('a', /* or */ closeTap);
		}, 100);
		window.tapInterval['b'] = setInterval( function(){
			decScoreByOne('b', /* or */ closeTap);
		}, 100);
		window.tapInterval['c'] = setInterval( function(){
			decScoreByOne('c', /* or */ closeTap);
		}, 100);
		window.tapInterval['d'] = setInterval( function(){
			decScoreByOne('d', /* or */ closeTap);
		}, 100);
	}

	var closeTap = function(team){
		clearInterval(window.tapInterval[team]);
		//window.tapInterval = null;
		window.lastScoreValue[team] = parseInt($("#team-"+team).find('.scorevalue').text());
		if (typeof isSlave != 'undefined'){
			socket.emit('score control', {
				onlyEmitToSlaves: true,
				action:'set score',
				team: team,
				score: window.lastScoreValue[team]
			});
		}
		$("#team-"+team).find(".overlay").removeClass('blue-tint');
	}


	if (typeof scoredisplaysingle != 'undefined'){
		window.lastScoreValue = {};
		window.lastScoreValue[team] = 0;
		window.tapInterval = {};
		window.lastScoreValue[team] = null;

		$("#scoredisplay").html('<div id="team-'+team+'" class="teamcanvas-singlescreen"><div class="overlay"></div><div class="scorecontainer"><div class="teamname"></div><div class="scorevalue">0</div></div></div>');

		socket.on('update teams name', function(teamNames){
			console.log('update teams name', teamNames);
			$('#team-'+team).find('.teamname').text(teamNames[team]);
		});

		socket.on('update scores', function(score){
			setTeamScore(score, team);
		});

		socket.on('update slave scores', function(score){
			if (typeof isSlave != 'undefined'){
				setTeamScore(score, team);
			}
		});

		socket.on('open tap', function(msg){
			openAllTaps();
		});

		socket.on('close tap', function(msg){
			closeTap(window.team);
		});

		socket.on('close one tap', function(msg){
			if (msg.team == window.team){
				closeTap(team);
			}
		});

		socket.emit('get team name', { team: window.team }, function(){

		});

		socket.on('update team name', function(msg){
			$("#team-"+msg.team).find(".teamname").text(msg.teamName);
		});
	}

	if (typeof scoredisplayquad != 'undefined'){
		window.lastScoreValue = {
			'a': 0,
			'b': 0,
			'c': 0,
			'd': 0
		};
		window.tapInterval = {
			'a': null,
			'b': null,
			'c': null,
			'd': null
		};


		$("#scoredisplay").append('<div id="team-a" class="teamcanvas-multiscreen"><div class="overlay"></div><div class="scorecontainer"><div class="teamname"></div><div class="scorevalue overlay">0</div></div></div>')
											.append('<div id="team-b" class="teamcanvas-multiscreen"><div class="overlay"></div><div class="scorecontainer"><div class="teamname"></div><div class="scorevalue overlay">0</div></div></div>')
											.append('<div id="team-c" class="teamcanvas-multiscreen"><div class="overlay"></div><div class="scorecontainer"><div class="teamname"></div><div class="scorevalue overlay">0</div></div></div>')
											.append('<div id="team-d" class="teamcanvas-multiscreen"><div class="overlay"></div><div class="scorecontainer"><div class="teamname"></div><div class="scorevalue overlay">0</div></div></div>');

		socket.on('update teams name', function(teamNames){
			console.log('update teams name', teamNames);
			$('#team-'+'a').find('.teamname').text(teamNames['a']);
			$('#team-'+'b').find('.teamname').text(teamNames['b']);
			$('#team-'+'c').find('.teamname').text(teamNames['c']);
			$('#team-'+'d').find('.teamname').text(teamNames['d']);
		});

		socket.on('update scores', function(score){
			setTeamScore(score, 'a');
			setTeamScore(score, 'b');
			setTeamScore(score, 'c');
			setTeamScore(score, 'd');
		});

		socket.on('open tap', function(msg){
			openAllTaps();
		});

		socket.on('close tap', function(msg){
			closeTap('a');
			closeTap('b');
			closeTap('c');
			closeTap('d');
		});

		socket.on('close one tap', function(msg){
			closeTap(msg.team);
		});

		socket.emit('get team name', { team: window.team }, function(){

		});

		socket.on('update team name', function(msg){
			$("#team-"+msg.team).find(".teamname").text(msg.teamName);
		});
	}

})();
