var b = require('blessed')
  , p = b.program()
  , s = b.screen({
	dump: __dirname + '/ui.log'
  ,	resizeTimeout: 1000
  })
  , fchat = require('./fchat')
  , fclient = require('./fchat-client')
  , fserver = require('./fchat-server')
  , G = require('./global')
  , util = require('util')
  , fs = require('fs')
  ;

var UI = {};

p.showCursor();

s.key('C-c', exit);

s.key('tab', function(ch, key) {
	UI.focus[UI.focusIndex()].focus();
});

s.key('C-n', function(ch, key) {
	UI.nextChat();
});

s.key('C-p', function(ch, key) {
	UI.prevChat();
});

s.key('C-z', function() {
	s.sigtstp(function() {
		/* continued */
	});
});

s.key('C-d', function(ch, key) {
	UI.debug.toggle();
	s.render();
});

/*
s.on('keypress', function(one, two) {

});
*/

s.on('resize', function() {
	process.nextTick(function() {
		s.clearRegion(0, p.cols, 0, p.rows);
		s.render();
	});
});

function exit(ch, key) {
	var latchCount = G.chatsArray.length
	  , exitLatch = function() {
		  if(--latchCount <= 0) {
			  process.exit(0);
		  }
	  }
	  ;
	G.chatsArray.forEach(function(chat) {
		chat.log.on('finish', exitLatch);
		chat.log.end();
	});
}

UI.program = p;
UI.screen = s;

UI.debug = b.text({
	parent: s
,	top: 0
,	left: 0
,	width: 40
,	height: p.rows
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

UI.debug.on('resize', function() {
	this.position.height = p.rows;
});

function defaultComparator(a, b) {
	return a.localeCompare(b);
}

function binarySearch(a, s, c) {
	var min = 0
	  , mid = 0
	  , max = a.length - 1
	  , cmp = 0
	  ;

	c = c || defaultComparator;
	
	while(min <= max) {
		mid = min + Math.floor((max-min)/2);
		cmp =  c(a[mid], s);
		if(cmp < 0) {
			min = mid + 1;
		} else if (cmp > 0) {
			max = mid - 1;
		} else {
			return mid;
		}
	}
	
	return min;
}

UI.leftList = function(title) {
	var list = b.list({
		parent: s
	,	top: 0
	,	left: 0
	,	width: 40
	,	height: p.rows
	,	label: title
	,	scrollable: true
	,	tags: true
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
	return list;
};


UI.windowList = UI.leftList('Window List');
UI.windowList.on('resize', function() {
	this.position.height = p.rows;
});

UI.channelList = UI.leftList('Channel List');
UI.channelList.hide();
UI.channelList._.sorts = [
	function(a, b) {
		if(UI.channelList._.pri) {
			return a.title.localeCompare(b.title);
		} else {
			return a.name.localeCompare(b.name);
		}
	}
,	function(a, b) {
		var diff = b.characters - a.characters;
		if(diff === 0) {
			if(UI.channelList._.pri) {
				diff = a.title.localeCompare(b.title);
			} else {
				diff = a.name.localeCompare(b.name);
			}
		}
		return diff;
	}
];
UI.channelList._.hideEmpty = false;
UI.channelList._.setAndSort = function(args) {
	UI.channelList._.display.sort(UI.channelList._.sorts[1]);
	UI.channelList._.render();
};

UI.channelList._.render = function() {
	UI.channelList.setItems(UI.channelList._.display.map(function(item) {
		return (UI.channelList._.pri ? item.title : item.name) + ' (' + item.characters + ')';
	}));
};

UI.channelList.key('enter', function(ch, key) {
	fclient.JCH(this._.display[this.selected].name);
	this.hide();
	UI.input.focus();
	s.render();
});

UI.channelList.key('C-s', function(ch, key) {
	var sort = this._.sorts.shift();
	this._.display = this._.channels.slice();
	this._.display.sort(sort);
	this._.render();
	this._.sorts.push(sort);
	s.render();
});

UI.channelList.key('C-e', function(ch, key) {
	if(!this._.hideEmpty) {
		this._.display = this._.channels.slice().sort(this._.sorts[1]).filter(function(item) {
			return item.characters > 0;
		});
	} else {
		this._.display = this._.channels.slice().sort(this._.sorts[1]);
	}
	this._.hideEmpty = !this._.hideEmpty;
	this._.render();
	s.render();
});

UI.userList = function() {
	var list = b.list({
		parent: s
	,	top: 0
	,	left: (p.cols - 40)
	,	width: 40
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
	list._.arr = [];
	list._.add = function(item) {
		var i = binarySearch(list._.arr, item);
		list._.arr.splice(i, 0, item);
		list.setItems(list._.arr);
	};
	list._.remove = function(item) {
		var i = binarySearch(list._.arr, item);
		if(list._.arr[i] === item) {
			list._.arr.splice(i, 1);
			list.setItems(list._.arr);
		}
	};
	list.on('resize', function() {
		this.position.height = p.rows - 6;
		this.position.left = p.cols - 40;
	});
	return list;
}

UI.baseBox = function(title) {
	var box = b.text({
		parent: s
	,	top: 0
	,	left: 40
	,	width: (p.cols - 80)
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
			fg: '#FFFFFF'
		,	bg: 'black'
		,	border: {
				fg: 'white'
			}
		,	scrollbar: {
				inverse: true
			}
		}
	});
	box.on('resize', function() {
		this.position.height = p.rows - 6;
		this.position.width = p.cols - 80;
	});
	return box;
};

UI.chatBox = function(channel, title) {
	var box = UI.baseBox(title)
	  , d = new Date(Date.now())
	  , date = d.getDate()
	  , month = d.getMonth() + 1
	  , year = d.getFullYear()
	  , file = util.format('logs/%s.%s.%s.%s-%s-%s.log', G.character, channel, title, year, month < 10 ? '0' + month : month, date < 10 ? '0' + date : date)
	  ;
	box._ = G.chats[channel] = {
		channel: channel
	,	title: title
	,	box: box
	,	list: UI.userList()
	,	pushChat: pushBuffer(box)
	,	log: fs.createWriteStream(file, {flags: 'a', encoding: 'utf8', mode: 0666})
	};
	G.chatsArray.push(G.chats[channel]);
	G.chatsIndex = G.chatsArray.length - 1;
	UI.windowList.add(title);
	UI.windowList.ritems.push([title, UI.windowList.ritems.length]);
	UI.windowList.ritems.sort(windowListComparator);
	UI.windowList.select(G.chatsIndex);
	return box;
};

UI.pmBox = function(character) {
	var box = UI.baseBox(character)
	  , d = new Date(Date.now())
	  , date = d.getDate()
	  , month = d.getMonth() + 1
	  , year = d.getFullYear()
	  , file = util.format('logs/%s.%s.%s-%s-%s.log', G.character, character, year, month < 10 ? '0' + month : month, date < 10 ? '0' + date : date)
	  ;
	box._ = G.pms[character] = {
		channel: null
	,	title: character
	,	box: box
	,	list: UI.userList()
	,	pushChat: pushBuffer(box)
	,	log: fs.createWriteStream(file, {flags: 'a', encoding: 'utf8', mode: 0666})
	};
	G.chatsArray.push(G.pms[character]);
//	G.chatsIndex = G.chatsArray.length - 1;
	UI.windowList.add(character);
	UI.windowList.ritems.push([character, UI.windowList.ritems.length]);
	UI.windowList.ritems.sort(windowListComparator);
//	UI.windowList.select(G.chatsIndex);
	return box;
};

UI.message = UI.chatBox('_main', 'Main Window');

UI.input = b.textarea({
	parent: s
,	top: (p.rows - 6)
,	left: 40
,	width: (p.cols - 40)
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

UI.input.key('C-z', function() {
	s.sigtstp(function() {
		/* continued */
	});
});

UI.input.on('resize', function() {
	this.position.top = p.rows - 6;
	this.position.width = p.cols - 40;
});

UI.prevChat = function() {
	UI.currentBox.hide();
	UI.currentBox._.list.hide();
	G.chatsIndex = (G.chatsIndex + G.chatsArray.length - 1) % G.chatsArray.length;
	UI.windowList.select(G.chatsIndex);
	var box = G.chatsArray[G.chatsIndex];
	box.box.show();
	box.list.show();
	UI.currentBox = box.box;
	UI.windowList.items[G.chatsIndex].setContent(UI.windowList.ritems[UI.windowList.ritems[G.chatsIndex][1]][0]);
	UI.focus = [UI.input, box.list, box.box];
	UI.focusIndex(0);
	UI.input.focus();
	s.render();
};

UI.nextChat = function() {
	UI.currentBox.hide();
	UI.currentBox._.list.hide();
	G.chatsIndex = (G.chatsIndex + 1) % G.chatsArray.length;
	UI.windowList.select(G.chatsIndex);
	var box = G.chatsArray[G.chatsIndex];
	box.box.show();
	box.list.show();
	UI.currentBox = box.box;
	UI.windowList.items[G.chatsIndex].setContent(UI.windowList.ritems[UI.windowList.ritems[G.chatsIndex][1]][0]);
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

UI.input.key('C-c', exit);

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
					} else if (UI.currentBox._.channel) {
						fclient.MSG(UI.currentBox._.channel, val);
					} else {
						fclient.PRI(UI.currentBox._.title, val);
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

function windowListComparator(a, b) {
	return defaultComparator(a[0], b[0]);
}

UI.pushChat = function(channel, character, message) {
	var box = channel ? G.chats[channel] : G.character === character ? UI.currentBox._ : G.pms[character];
	if(message.match(/^\/me/)) {
		message = character + ' ' + message.substring(4);
	} else {
		message = character + ': ' + message;
	}
	box.log.write(message + '\n');
	message = message.replace(G.characterRegex, '{yellow-fg}$&{/}');
	if(box.box !== UI.currentBox) {
		var ri = binarySearch(UI.windowList.ritems, box.title, windowListComparator);
		var i = UI.windowList.ritems[ri][1];
		UI.windowList.items[i].setContent('{red-fg}' + UI.windowList.ritems[ri][0] + '{/}');
	}
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

UI.pushMessage('' + p.rows + ' ' + p.cols);

//setInterval(function(){s.render();}, 100);

module.exports = UI;
