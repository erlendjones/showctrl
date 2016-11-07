(function(){
	document.title="SHOW+CTRL";
	var socket = io.connect();

	//Make global for debugging
	window.socket = socket;

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

		/*
		$("#"+containerId).children().unbind('click').bind('click', function(button){
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
			if ($(this).data('votecontrol') != null){
				socket.emit('vote control', {action: $(this).data('votecontrol') }, function(res){
					console.log(res);
				});
			}
		});
		*/

		$("#"+containerId).children().unbind('touchstart').bind('touchstart', function(button){
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
			if ($(this).data('votecontrol') != null){
				socket.emit('vote control', {action: $(this).data('votecontrol') }, function(res){
					console.log(res);
				});
			}
		});
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
			(typeof data.section != 'undefined' ? 'data-section="'+data.section+'" ' : '') +
			(typeof data.vote != 'undefined' ? 'data-vote="'+data.vote+'" ' : '') +
			(typeof data.voteControl != 'undefined' ? 'data-votecontrol="'+data.voteControl+'" ' : '') +
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
			'>'+(typeof data.label != 'undefined' ? data.label : '')+'</div>';
	};

	var createVotingButtons = function(options){ // Options as string
		var buttonStyle = ['blue-button', 'red-button', 'green-button'];
		var voteButtons = [];
		var options = options.split(',');
		$.each(options, function(i,option){
			voteButtons.push({
				label: option,
				vote: option,
				style: buttonStyle[i],
				cue: 40 + Math.floor(Math.random() * 6) + 1
			});
		});
		return voteButtons; // Array
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
			$("#header").html('Avstemmingen er avsluttet. Når du kan stemme igjen vil to knapper dukke opp!');
		});

		socket.emit('have i voted',null,function(res){
			if (res){
				$("#header").html('Takk for stemmen! Når du kan stemme vil to knapper dukke opp!');
			}else{
				socket.emit('should i vote',null,function(res){
					if (!res){
						$("#header").html('Velkommen! Når du kan stemme vil to knapper dukke opp!');
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
	}

	if (typeof quizmaster != 'undefined'){


		questionStore = [];

		//make global
		//window.questionStore = questionStore;

		var mountQuestions = function(){
			selectQuestions(function(result){
				console.log('selectQuestions result:',result);
				if (result.err) throw err;
				else {
					questionStore = result.rows;
					$("#questionlist").html(renderQuestions(questionStore));
					bindActionButtons();
				}
			})
		}

		var selectQuestions = function(callback){
			socket.emit('select questions', null, callback);
		};

		var renderQuestions = function(questions){
			return '<span class="table-add glyphicon glyphicon-plus"></span><table class="table"><tr><th>id</th><th>number</th><th>question</th><th>option1</th><th>option2</th><th>option3</th><th>option4</th><answer><th>actions</th></tr>'+questions.map(function(val){
				return renderQuestion(val);
			})+'</table>'
		}

		var renderQuestion = function(question){
			return '<tr><td>'+question.id+'</td><td>'+question.number+'</td><td>'+question.question_text+'</td><td>'+question.option1+'</td><td>'+question.option2+'</td><td>'+question.option3+'</td><td>'+question.option4+'</td><td>'+question.correct_answer+'</td><td>'+renderQuestionActions(question)+'</td></tr>'
		}

		var renderQuestionActions = function(question){
			return '<div class="quizm-button-take" data-question-id="'+question.id+'">TAKE</div>';
		}

		var bindActionButtons = function(questionStore){
			$(".quizm-button-take").unbind('click').bind('click', function(){
				takeQuestionAction($(this).data('question-id'));
			})
			$('.table-add').click(function () {
			  var $clone = $TABLE.find('tr.hide').clone(true).removeClass('hide table-line');
			  $TABLE.find('table').append($clone);
			});

			$('.table-remove').click(function () {
			  $(this).parents('tr').detach();
			});

			$('.table-up').click(function () {
			  var $row = $(this).parents('tr');
			  if ($row.index() === 1) return; // Don't go above the header
			  $row.prev().before($row.get(0));
			});

			$('.table-down').click(function () {
			  var $row = $(this).parents('tr');
			  $row.next().after($row.get(0));
			});
		}

		var getQuestionById = function(id){
			return questionStore.filter(function(question){
				return question.id == id
			})[0] || null;
		}

		var takeQuestionAction = function(id){
			console.log('takeQuestionAction - id:',id);
			socket.emit(
				'set xpression question',
				getQuestionById(id),
				function(){
					console.log('takeQuestionAction:callback');
				}
			)
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
		      h[header] = $td.eq(i).text();
		    });

		    data.push(h);
		  });

		  // Output the result
		  questionStore = data;
		}

		$BTN.click(function () {


		  var $rows = $TABLE.find('tr:not(:hidden)');
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
		      h[header] = $td.eq(i).text();
		    });

		    data.push(h);
		  });

		  // Output the result
		  $EXPORT.text(JSON.stringify(data));
		});


		console.info('LOADING QUIZMASTER');
		mountQuestions();
		var $TABLE = $('#table');

	}
})();
