var WebSocket = require('ws')
  , needle = require('needle')
  , util = require('util')
  , Entities = require('html-entities').AllHtmlEntities
  , htmlEntities = new Entities()
  , ws = new WebSocket('ws://chat.f-list.net:8722')
  , fserver = require('./fchat-server')
  , fclient = require('./fchat-client')
  , G = require('./global')
  , UI = require('./ui')
  , config = require('./config')
  ;

process.nextTick(function() {
	UI = require('./ui');
});

function send(str, obj) {
	if(obj) {
		str += ' ' + JSON.stringify(obj);
	}
	ws.send(str, function(err) {
		if(err) {
			UI.pushMessage(util.inspect(err));
		}
	});
}

G.send = send;
G.ws = ws;

ws.on('close', function() {
	UI.pushMessage('Closed!');
	/**
	 * some kind of reconnect thing needs to happen
	 * watch out for body.ticket, doesn't exist here!
	 */
	/*
	process.nextTick(function() {
		UI.pushMessage('Trying to reconnect...');
		send('IDN', {
			method: 'ticket'
		,	account: config.account
		,	ticket: body.ticket
		,	character: config.character
		,	cname: 'Node.js F-Chat Client'
		,	cversion: '0.0.1'
		});
	});
	*/
});

ws.on('open', function() {
	UI.pushMessage('Websocket connected!  Trying to get ticket...');
	needle.post('https://www.f-list.net/json/getApiTicket.php', {
		secure: 'yes'
	,	account: config.account
	,	password: config.password
	}, function(err, resp, body) {
		if(err) {
			UI.pushMessage('Failed to get ticket: ' + util.inspect(err));
		} else {
			UI.pushMessage('Got ticket!  Going to identify...');
			send('IDN', {
				method: 'ticket'
			,	account: config.account
			,	ticket: body.ticket
			,	character: config.character
			,	cname: 'Node.js F-Chat Client'
			,	cversion: '0.0.1'
			});
		}
	});
});

ws.on('message', function(msg) {
	msg = htmlEntities.decode(msg);
	msg = stripUtf8(msg);
	var cmd = msg.substring(0,3);
	var json = {};
	try {
		json = JSON.parse(msg.substring(4));
	} catch (e) {

	}
	G.server.emit(cmd, json);
});

function stripUtf8(str) {
	//return str.replace(/[\uE000-\uF8FF]/g, '?');
	return str.replace(/[^\x00-\x80]/g, '?');
}

function split(str, ch, limit) {
	var count = 0
	  , sp = []
	  , lastIndex = 0;
	  ;
	
	while(!limit || count < limit) {
		var i = str.indexOf(ch, lastIndex);
		if(!!~i) {
			sp.push(str.substring(lastIndex, i))
			lastIndex = i+1;
			count++;
		} else {
			break;
		}
	}
	sp.push(str.substring(lastIndex));
	return sp;
}

module.exports.parseArgs = function(str) {
	var cmd = str.substring(0,3).trim().toUpperCase();
	if(fclient[cmd]) {
		if(fclient[cmd].args) {
			var sp = split(str, ' ', fclient[cmd].args.length);
			sp.shift();
			fclient[cmd].apply(null, sp);
		} else {
			fclient[cmd]();
		}
	}
};
