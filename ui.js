var b = require('blessed')
  , p = b.program()
  , s = b.screen({
	  dump: __dirname + '/ui.log'
  })
  , fchat = require('./fchat')
  , fclient = require('./fchat-client')
  , fserver = require('./fchat-server')
  , G = require('./global')
  , util = require('util')
  , rbtree = require('bintrees').RBTree
  ;

var UI = {};

p.showCursor();

s.key(['C-c'], function(ch, key) {
	return process.exit(0);
});

s.key('tab', function(ch, key) {
	UI.pushMessage('tab');
	UI.focus[UI.focusIndex()].focus();
});

s.key('C-n', function(ch, key) {
	UI.nextChat();
});

s.key('C-p', function(ch, key) {
	UI.prevChat();
});

s.on('keypress', function(one, two) {

});

UI.program = p;
UI.screen = s;

UI.debug = b.text({
	parent: s
,	top: 0
,	left: 0
,	width: 45
,	height: '100%'
,	content: 'Debug'
,	label: 'Debug'
,	tags: true
,	keys: true
,	scrollable: true
,	alwaysScroll: true
,	border: {
		type: 'line'
	}
,	scrollbar: {
		ch: ' '
	}
,	style: {
		fg: 'white'
	,	bg: 'black'
	,	border: {
			fg: 'white'
		}
	,	scrollbar: {
			inverse: true
		}
	}
});

function binarySearch(a, s) {
	var min = 0
	  , max = a.length
	  ;
	
	while(min < max) {
		var mid = min + Math.floor((max-min)/2);
		if(a[mid].localeCompare(s) < 0) {
			min = mid+1;
		} else {
			max = mid;
		}
	}
	
	return min;
}

UI.userList = function() {
	var list = b.list({
		parent: s
	,	top: 0
	,	left: (p.cols - 45)
	,	width: 45
	,	height: (p.rows - 6)
	,	label: 'Users'
	,	scrollable: true
	,	border: {
			type: 'line'
		}
	,	scrollbar: {
			ch: ' '
		}
	,	style: {
			fg: 'white'
		,	bg: 'black'
		,	border: {
				fg: 'white'
			}
		,	scrollbar: {
				inverse: true
			}
		,	selected: {
				fg: 'black'
			,	bg: 'green'
			}
		}
	});
	list.key('up', function(ch, key) {
		list.up(1);
		s.render();
	});
	list.key('down', function(ch, key) {
		list.down(1);
		s.render();
	});
	list._.rbtree = new rbtree(function(a,b){return a.s.localeCompare(b.s);});
	list._.arr = [];
	list._.add = function(item) {
		var i = binarySearch(list._.arr, item);
		list._.arr.splice(i, 0, item);
		list.setItems(list._.arr);
	};
	list._.remove = function(item) {
		var i = binarySearch(list._.arr, item);
		list._.arr.splice(i, 1);
		list.setItems(list._.arr);
	};
	return list;
}

UI.chatBox = function(channel, title) {
	var box = b.text({
		parent: s
	,	top: 0
	,	left: 45
	,	width: (p.cols - 90)
	,	height: (p.rows - 6)
	,	content: 'The opening\nmessage'
	,	label: title
	,	tags: true
	,	keys: true
	,	scrollable: true
	,	alwaysScroll: true
	,	border: {
			type: 'line'
		}
	,	scrollbar: {
			ch: ' '
		}
	,	style: {
			fg: 'white'
		,	bg: 'black'
		,	border: {
				fg: 'white'
			}
		,	scrollbar: {
				inverse: true
			}
		}
	});
	box._ = G.chats[channel] = {
		channel: channel
	,	title: title
	,	box: box
	,	list: UI.userList()
	,	pushChat: pushBuffer(box)
	};
	G.chatsArray.push(G.chats[channel]);
	G.chatsIndex = G.chatsArray.length - 1;
	return box;
}

UI.message = UI.chatBox('_main', 'Main Window');

UI.input = b.textarea({
	parent: s
,	top: (p.rows - 6)
,	left: 45
,	width: 100
,	height: 6
,	label: 'Input'
,	tags: true
,	keys: true
//	This currently has a problem with rendering and clearValue()
//	where the cursor jumps up 2 lines
//,	border: {
//		type: 'line'
//	}
,	style: {
		fg: 'white'
	,	bg: 'black'
	,	border: {
			fg: 'white'
		}
	}
});

UI.input.key('enter', function(ch, key) {
	if(UI.input._done) {
		UI.input._done(null, UI.input.value);
	}
});

UI.prevChat = function() {
	UI.currentBox.hide();
	UI.currentBox._.list.hide();
	G.chatsIndex = (G.chatsIndex + G.chatsArray.length - 1) % G.chatsArray.length;
	var box = G.chatsArray[G.chatsIndex];
	box.box.show();
	box.list.show();
	UI.currentBox = box.box;
	UI.focus = [UI.input, box.list, box.box];
	UI.focusIndex(0);
	UI.input.focus();
	s.render();
};

UI.nextChat = function() {
	UI.currentBox.hide();
	UI.currentBox._.list.hide();
	G.chatsIndex = (G.chatsIndex + 1) % G.chatsArray.length;
	var box = G.chatsArray[G.chatsIndex];
	box.box.show();
	box.list.show();
	UI.currentBox = box.box;
	UI.focus = [UI.input, box.list, box.box];
	UI.focusIndex(0);
	UI.input.focus();
	s.render();
};

UI.input.key('C-n', function(ch, key) {
	UI.nextChat();
});

UI.input.key('C-p', function(ch, key) {
	UI.prevChat();
});

UI.input.key('C-c', function(ch, key) {
	return process.exit(0);
});

UI.input.key('tab', function(ch, key) {
	if(UI.input._done) {
		var m = {save: true, str: UI.input.value};
		UI.input._done(null, m);
	}
	UI.focus[UI.focusIndex()].focus();
});

UI.input.on('focus', function() {
	if(s.focused == this && !this._done) {
		this.readInput(function(err, val) {
			if(!err && val) {
				if(val.save) {
					UI.input.setValue(val.str.slice(0,-1));
					s.render();
				} else {
					if(val[0] == '/') {
						fchat.parseArgs(val.substring(1, val.length - 1));
					} else {
						fclient.MSG(UI.currentBox._.channel, val);
					}
					UI.input.clearValue();
					s.render();
					UI.input.focus();
				}
			}
		});
	}
});

/* A lot of this happens currently on the callback to
 * readInput inside of the 'focus' event on UI.input
 * We might want to bring it back here and let the submit
 * event take care of it all.
/*
UI.input.on('submit', function() {
	UI.pushMessage('submit');
	UI.input.clearValue();
	s.render();
	UI.input.focus();
});
*/

function pushBuffer(buffer) {
	return function(msg) {
		buffer.pushLine(msg);
		buffer.setScrollPerc(100);
		s.render();
	};
}

UI.pushMessage = pushBuffer(UI.message);
UI.pushDebug = pushBuffer(UI.debug);

UI.pushChat = function(channel, character, message) {
	var box = G.chats[channel];
	if(message.match(/^\/me/)) {
		message = character + ' ' + message.substring(4);
	} else {
		message = character + ': ' + message;
	}
	message = message.replace(G.characterRegex, '{yellow-fg}$&{/}');
	box.pushChat(message);
}

/*
for(var cmd in fserver) {
	G.server.on(cmd, (function(_cmd) {
		return function(args) {
			args._cmd = _cmd;
			UI.pushDebug(util.inspect(args));
		};
	})(cmd));
}
*/

UI.currentBox = UI.message;
UI.focus = [UI.input, UI.message._.list, UI.message];
UI.focusIndex = (function() {
	var i = 0;
	return function(set) {
		if(set) {
			i = set;
		} else {
			i = (i+1) % 3;
		}
		return i;
	};
})();
UI.input.focus();
s.render();

module.exports = UI;
