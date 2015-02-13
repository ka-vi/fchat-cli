var b = require('blessed')
  , p = b.program()
  , s = b.screen({
	dump: __dirname + '/ui.log'
  ,	resizeTimeout: 1000
  })
  , fchat = require('./fchat')
  , fclient = require('./fchat-client')
  , G = require('./global')
  , util = require('util')
  , fs = require('fs')
  , config = require('./config')
  , sanitize = require('sanitize-filename')
  ;

var render = (function() {
    var canRender = true;
    return function(wait) {
        if(wait) {
            canRender = !canRender;
        }
        if(canRender) {
            s.render();
        }
    };
})();

var UI = {};

UI.render = render;

p.showCursor();

s.key('C-c', exitBox);

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
	render();
});

/*
s.on('keypress', function(one, two) {

});
*/

p.on('resize', function() {
    render(true);
});

s.on('resize', function() {
	process.nextTick(function() {
		s.clearRegion(0, p.cols, 0, p.rows);
		render(true);
	});
});

UI.exit = b.form({
  parent: s,
  keys: true,
  left: 0,
  top: 0,
  width: 30,
  height: 3
,	label: 'Quit program?'
,	border: {
		type: 'line'
	}

});

UI.exit._.quit = b.button({
  parent: UI.exit,
  mouse: true,
  keys: true,
  shrink: true,
  padding: {
    left: 1,
    right: 1
  },
  top: UI.exit.position.top + 1,
  left: UI.exit.position.left + 2,
  shrink: true,
  name: 'quit',
  content: 'Quit',
  style: {
    focus: {
      bg: 'red'
    },
    hover: {
      bg: 'red'
    }
  }
});

UI.exit._.cancel = b.button({
  parent: UI.exit,
  mouse: true,
  keys: true,
  shrink: true,
  padding: {
    left: 1,
    right: 1
  },
  left: 20,
  top: UI.exit.position.top + 1,
  shrink: true,
  name: 'cancel',
  content: 'Cancel',
  style: {
    focus: {
      bg: 'red'
    },
    hover: {
      bg: 'red'
    }
  }
});

UI.exit._.quit.on('press', function() {
	exit();
});

UI.exit._.cancel.on('press', function() {
	UI.focus = [UI.input, UI.currentBox._.list, UI.currentBox];
	UI.focusIndex(0);
	UI.exit.hide();
	UI.input.focus();
	render();
});

function exitBox() {
	UI.focus = [UI.exit, UI.exit._.quit, UI.exit._.cancel];
	UI.focusIndex(2);
	UI.exit.show();
	UI.exit.setFront();
	UI.exit._.cancel.focus();
	render();
}

function exit(ch, key) {
	var latchCount = G.chatsArray.length
	  , exitLatch = function() {
		  if(--latchCount <= 0) {
			  process.exit(0);
		  }
	  }
	  ;
	G.chatsArray.forEach(function(chat) {
		chat.log.writeStream.on('finish', exitLatch);
		chat.log.writeStream.end();
		clearTimeout(chat.log.timeout);
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

UI.debug.hide();

UI.debug.on('resize', function() {
	this.position.height = p.rows;
});

UI.debug._.log = logger('_debug');

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
	list._.ritems = [];
	list.key('up', function(ch, key) {
		list.up(1);
		render();
	});
	list.key('down', function(ch, key) {
		list.down(1);
		render();
	});
	list.key('pageup', function(ch, key) {
		list.up(p.rows - 2);
		render();
	});
	list.key('pagedown', function(ch, key) {
		list.down(p.rows - 2);
		render();
	});
	list.on('resize', function() {
		this.position.height = p.rows;
	});
	return list;
};

UI.horizontalList = function() {
	var list = b.listbar({
		parent: s
	,	top: p.rows - 7
	,	left: 0
	,	width: p.cols
	,	height: 1
	,	scrollable: true
	,	tags: true
	,	style: {
			item: {
				fg: 'white'
			,	bg: 'blue'
			}
		,	selected: {
				fg: 'black'
			,	bg: 'green'
			}
		}
	});
	list._.ritems = [];
	list.key('left', function(ch, key) {
		list.moveLeft(1);
		render();
	});
	list.key('right', function(ch, key) {
		list.moveRight(1);
		render();
	});
	list.on('resize', function() {
		this.position.width = p.cols;
	});
	return list;
};

/*
UI.windowList = UI.leftList('Window List');
UI.windowList.on('resize', function() {
	this.position.height = p.rows;
});
*/
UI.windowList = UI.horizontalList();
UI.windowList.on('resize', function() {
	this.position.width = p.cols;
	this.position.top = p.rows - 7;
});

UI.channelList = UI.leftList('Channel List');
UI.channelList.setIndex(100);
UI.channelList.key('escape', function() {
	this.hide();
	UI.input.focus();
	render();
});
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
//	this.hide();
//	UI.input.focus();
	render();
});

UI.channelList.key('C-s', function(ch, key) {
	var sort = this._.sorts.shift();
	this._.display = this._.channels.slice();
	this._.display.sort(sort);
	this._.render();
	this._.sorts.push(sort);
	render();
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
	render();
});

UI.userList = function() {
	var list = b.list({
		parent: s
	,	top: 0
	,	left: (p.cols - 20)
	,	width: 20
	,	height: (p.rows - 7)
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
		render();
	});
	list.key('down', function(ch, key) {
		list.down(1);
		render();
	});
	list.key('pageup', function(ch, key) {
		list.up(p.rows - 9);
		render();
	});
	list.key('pagedown', function(ch, key) {
		list.down(p.rows - 9);
		render();
	});
	list._.arr = [];
	list._.add = function(item) {
		var i = binarySearch(list._.arr, item);
		list._.arr.splice(i, 0, item);
		list.setItems([]);
		list.setItems(list._.arr.slice());
	};
	list._.remove = function(item) {
		var i = binarySearch(list._.arr, item);
		if(list._.arr[i] === item) {
			list._.arr.splice(i, 1);
			list.setItems([]);
			list.setItems(list._.arr.slice());
		}
	};
	list.on('resize', function() {
		this.position.height = p.rows - 7;
		this.position.left = p.cols - 20;
	});
	return list;
}

UI.baseBox = function(title) {
	var box = b.text({
		parent: s
	,	top: 0
	,	left: 0
	,	width: (p.cols - 20)
	,	height: (p.rows - 7)
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
		this.position.height = p.rows - 7;
		this.position.width = p.cols - 20;
	});
	box.setIndex(1);
	return box;
};

function logger(title, channel, log) {
	var l = {}
	  , now = Date.now()
	  , d = new Date(now)
	  , year = d.getFullYear()
	  , month = d.getMonth() + 1
	  , date = d.getDate()
	  , p = new Date(year, month-1, date)
	  , timeout = G.millisInDay - (now - p.getTime())
	  ;

	if(channel) {
		l.file = util.format('logs/%s.%s.%s.%s-%s-%s.log', G.character, sanitize(title), sanitize(channel), year, month < 10 ? '0' + month : month, date < 10 ? '0' + date : date);
	} else {
		l.file = util.format('logs/%s.%s.%s-%s-%s.log', G.character, sanitize(title), year, month < 10 ? '0' + month : month, date < 10 ? '0' + date : date)
	}
	l.writeStream = fs.createWriteStream(l.file, {flags: 'a', encoding: 'utf8', mode: 0666});
	log = log || l;
	l.timeout = setTimeout(function() {
		log.writeStream.end();
		var newLogger = logger(title, channel, log);
		log.file = newLogger.file;
		log.writeStream = newLogger.writeStream;
		log.timeout = newLogger.timeout;
	}, timeout);
	
	return l;
}

UI.chatBox = function(channel, title) {
	var box = UI.baseBox(title)
	  , l = logger(title, channel)
	  ;
	box._ = G.chats[channel] = {
		channel: channel
	,	title: title
	,	box: box
	,	list: UI.userList()
	,	pushChat: pushBuffer(box)
	,	log: l
	,	unread: 0
	};
	G.chatsArray.push(G.chats[channel]);
	G.chatsIndex = G.chatsArray.length - 1;
	UI.windowList.add(title + '      ');
	UI.windowList.items[G.chatsIndex]._.original = title;
	UI.windowList._.ritems.push([title, UI.windowList._.ritems.length]);
	UI.windowList._.ritems.sort(windowListComparator);
	UI.windowList.select(G.chatsIndex);
	return box;
};

UI.pmBox = function(character) {
	var box = UI.baseBox(character)
	  , l = logger(character)
	  ;
	box._ = G.pms[character] = {
		channel: null
	,	title: character
	,	box: box
	,	list: UI.userList()
	,	pushChat: pushBuffer(box)
	,	log: l
	,	unread: 0
	};
	G.chatsArray.push(G.pms[character]);
	UI.windowList.add(character);
	UI.windowList.items[G.chatsArray.length - 1]._.original = character;
	UI.windowList._.ritems.push([character, UI.windowList._.ritems.length]);
	UI.windowList._.ritems.sort(windowListComparator);
	return box;
};

UI.message = UI.chatBox('_main', 'Main Window');

UI.input = b.textarea({
	parent: s
,	top: (p.rows - 6)
,	left: 0
,	width: (p.cols - 20)
,	height: 6
,	label: 'Input'
,	tags: true
,	keys: true
,	border: {
		type: 'line'
	}
,	style: {
		fg: 'white'
	,	bg: 'black'
	,	border: {
			fg: 'white'
		}
	}
});
UI.input.setIndex(1);

UI.input._.history = [];
UI.input._.historyIndex = 0;

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

UI.input.key('C-d', function() {
	UI.debug.toggle();
	UI.windowList.toggle();
	render();
});

UI.input.key('pageup', function() {
	UI.currentBox.scroll(9 - p.rows);
	UI.currentBox._.noScroll = true;
	render();
});

UI.input.key('pagedown', function() {
	UI.currentBox.scroll(p.rows - 9);
	if(UI.currentBox.getScrollPerc() === 100) {
		UI.currentBox._.noScroll = false;
	}
	render();
});

UI.input.key('up', function() {
	var value = this.getValue();
	// If we're up in the history but have made an edit, reset
	if(this._.historyIndex < this._.history.length && this._.history[this._.historyIndex] !== value) {
		this._.history.pop(); 
		this._.historyIndex = this._.history.length;
	}
	// If we're fresh, add our current text to the history to save it
	if(this._.historyIndex === this._.history.length) {
		this._.history.push(value);
	}
	// Regular going up in history stuff
	var index = this._.historyIndex === 0 ? 0 : --this._.historyIndex;
	this.setValue(this._.history[index]);
	render();
});

UI.input.key('down', function() {
	// We're at starting state
	if(this._.historyIndex === this._.history.length) {
		return;
	}
	// We're somewhere up in the history but our input has changed, time to reset
	else if(this._.history[this._.historyIndex] !== this.getValue()) {
		this._.history.pop();
		this._.historyIndex = this._.history.length;
		return;
	}
	// Do regular going down in history stuff
	else {
		var index = this._.historyIndex === (this._.history.length - 1) ? this._.historyIndex : ++this._.historyIndex;
		this.setValue(this._.history[index]);
		render();
	}
});

UI.input.on('resize', function() {
	this.position.top = p.rows - 6;
	this.position.width = p.cols - 20;
});

UI.prevChat = function() {
	UI.currentBox.hide();
	UI.currentBox._.list.hide();
	G.chatsIndex = (G.chatsIndex + G.chatsArray.length - 1) % G.chatsArray.length;
	UI.windowList.select(G.chatsIndex);
	var box = G.chatsArray[G.chatsIndex];
	box.unread = 0;
	box.box.show();
	box.list.show();
	UI.currentBox = box.box;
	UI.windowList.items[G.chatsIndex].setContent(UI.windowList.items[G.chatsIndex]._.original);
	UI.focus = [UI.input, box.list, box.box];
	UI.focusIndex(0);
	UI.input.focus();
	render();
};

UI.nextChat = function() {
	UI.currentBox.hide();
	UI.currentBox._.list.hide();
	G.chatsIndex = (G.chatsIndex + 1) % G.chatsArray.length;
	UI.windowList.select(G.chatsIndex);
	var box = G.chatsArray[G.chatsIndex];
	box.unread = 0;
	box.box.show();
	box.list.show();
	UI.currentBox = box.box;
	UI.windowList.items[G.chatsIndex].setContent(UI.windowList.items[G.chatsIndex]._.original);
	UI.focus = [UI.input, box.list, box.box];
	UI.focusIndex(0);
	UI.input.focus();
	render();
};

UI.input.key('C-n', function(ch, key) {
	UI.nextChat();
});

UI.input.key('C-p', function(ch, key) {
	UI.prevChat();
});

UI.input.key('C-c', exitBox);

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
					render();
				} else {
					// val.length === 1 means we only got enter, ie, empty message send.  Don't show/send that.
					if(val.length > 1) {
						// If we select something farther back, wipe out what was in progress
						if(UI.input._.historyIndex < UI.input._.history.length) {
							UI.input._.history.pop();
						}
						// Add what we're entering to the history array
						UI.input._.history.push(val.substring(0, val.length - 1));
						// Peel off old values
						if(UI.input._.history.length > G.maxBuffer) {
							UI.input._.history.shift();
						}
						// Adjust index to latest + 1 (aka length, duh)
						UI.input._.historyIndex = UI.input._.history.length;
	
						if(val[0] == '/') {
							fchat.parseArgs(val.substring(1, val.length - 1));
						} else if (UI.currentBox._.channel) {
							fclient.MSG(UI.currentBox._.channel, val);
						} else {
							fclient.PRI(UI.currentBox._.title, val);
						}
					}
					UI.input.clearValue();
					render();
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
	render();
	UI.input.focus();
});
*/

function pushBuffer(buffer) {
	return function(msg, noScroll) {
		buffer.pushLine(msg);
		if(buffer._clines.fake.length > (config.maxBuffer || G.maxBuffer)) {
			buffer.shiftLine(1);
		}
		if(!noScroll) {
			buffer.setScrollPerc(100);
		}
		render();
	};
}

UI.pushMessage = (function(push) {
	return function(msg) {
		if(msg && typeof msg !== 'string') {
			msg = msg.toString();
		}
		if(UI.currentBox !== UI.message) {
			var ri = binarySearch(UI.windowList._.ritems, UI.message._.title, unreadComparator);
			var i = UI.windowList._.ritems[ri][1];
			UI.windowList.items[i].setContent('{bold}{yellow-fg}' + UI.windowList._.ritems[ri][0] + ' (' + (++UI.message._.unread) + '){/}{/}');
		}
		push(msg);
	};
})(pushBuffer(UI.message));

UI.pushDebug = (function(push) {
	return function(msg, cmd) {
		if(config.debug) {
			if(cmd) {
				msg._cmd = cmd;
			}
			UI.debug._.log.writeStream.write(JSON.stringify(msg) + '\n');
		}
		push(msg);
	};
})(pushBuffer(UI.debug));

function windowListComparator(a, b) {
	return defaultComparator(a[0], b[0]);
}

function unreadComparator(a, b) {
	return defaultComparator(a[0], b);
}

UI.pushChat = function(channel, character, message) {
	var box = channel ? G.chats[channel] : G.character === character ? UI.currentBox._ : G.pms[character];
	if(message.match(/^\/me/)) {
		message = '{bold}' + character + '{/} ' + message.substring(4);
	} else {
		message = '{bold}' + character + ':{/} ' + message;
	}
	box.log.writeStream.write(message + '\n');
	message = message.replace(G.characterRegex, '{yellow-fg}$&{/}');
	if(box.box !== UI.currentBox) {
		var ri = binarySearch(UI.windowList._.ritems, box.title, unreadComparator);
		var i = UI.windowList._.ritems[ri][1];
		UI.windowList.items[i].setContent('{bold}{yellow-fg}' + UI.windowList._.ritems[ri][0] + ' (' + (++box.unread) + '){/}{/}');
	}
	box.pushChat(message, box.noScroll);
};

UI.closeWindow = function(channel, character) {
	var box = channel ? G.chats[channel] : G.pms[character];
	var ri = binarySearch(UI.windowList._.ritems, box.title, unreadComparator);
	var i = UI.windowList._.ritems[ri][1];
	UI.nextChat();
	var items = UI.windowList.items.map(function(item) {
		return [item.getContent(), item._.original];
	});
	items.splice(i, 1);
	UI.windowList.setItems([]);
	items.forEach(function(item, index) {
		UI.windowList.add(item[0]);
		UI.windowList.items[index]._.original = item[1];
	});
	G.chatsArray.splice(i, 1);
	for(var j = 0; j < UI.windowList._.ritems.length; j++) {
		if(UI.windowList._.ritems[j][1] > i) {
			UI.windowList._.ritems[j][1]--;
		}
	}
	UI.windowList._.ritems.splice(ri, 1);
	box.box.hide();
	box.list.hide();
	box.box.detach();
	box.list.detach();
	render();
};

UI.currentBox = UI.message;
UI.focus = [UI.input, UI.message._.list, UI.message];
UI.focusIndex = (function() {
	var i = 0;
	return function(set) {
		if(set) {
			i = set;
		} else {
			i = (i+1) % UI.focus.length;
		}
		return i;
	};
})();
UI.input.focus();
render();

UI.pushMessage('' + p.rows + ' ' + p.cols);

//setInterval(function(){render();}, 100);

module.exports = UI;
