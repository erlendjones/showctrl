(function(){
	document.title="SHOW+CTRL";
	var socket = io.connect();
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

})();