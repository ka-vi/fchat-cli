var WebSocket = require('ws')
  , needle = require('needle')
  , util = require('util')
  , ws = new WebSocket('ws://chat.f-list.net:9722')
  , fserver = require('./fchat-server')
  , fclient = require('./fchat-client')
  , G = require('./global')
  , UI = require('./ui')
  , config = require('./config')
  ;

function send(str, obj) {
	if(obj) {
		ws.send(str + ' ' + JSON.stringify(obj));
	} else {
		ws.send(str);
	}
}

G.send = send;
G.ws = ws;

ws.on('open', function() {
	needle.post('https://www.f-list.net/json/getApiTicket.php', {
		secure: 'yes'
	,	account: config.account
	,	password: config.password
	}, function(err, resp, body) {
		if(err) {
			UI.pushMessage(util.inspect(err));
		} else {
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
	var cmd = msg.substring(0,3);
	var json = {};
	try {
		json = JSON.parse(msg.substring(4));
	} catch (e) {

	}
	G.server.emit(cmd, json);
});

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
	var cmd = str.substring(0,3);
	if(fclient[cmd]) {
		var sp = split(str, ' ', fclient[cmd].args.length);
		sp.shift();
		fclient[cmd].apply(null, sp);
	}
};
