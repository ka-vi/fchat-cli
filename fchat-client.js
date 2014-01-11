var UI = null
  , G = require('./global')
  , util = require('util')
  ;

function prep(args, func) {
	var f = function() {
		if(arguments.length) {
			if(arguments[0] instanceof Object) {
				func.apply(null, arguments);
			} else {
				var m = {};
				for(var i = 0; i < arguments.length; i++) {
					m[args[i]] = arguments[i];
				}
				func(m);
			}
		} else {
			func();
		}
	}
	f.args = args;
	return f;
}

var CMD = {};

CMD.PIN = function() {
	G.send('PIN');
};

CMD.CHA = function() {
	G.send('CHA');
};

CMD.JCH = prep(['channel'], function(args) {
	UI.pushMessage(util.inspect(args));
	G.send('JCH', args);
});

CMD.MSG = prep(['channel', 'message'], function(args) {
	args.message = args.message.replace(/^:/,"/me ").slice(0,-1);
	G.send('MSG', args);
	UI.pushChat(args.channel, G.character, args.message);
});

CMD.PRI = prep(['recipient', 'message'], function(args) {
	args.message = args.message.replace(/^:/,"/me ").slice(0,-1);
	G.send('PRI', args);
	UI.pushChat(null, G.character, args.message);
});

module.exports = CMD;

setTimeout(function() {
	UI = require('./ui');
}, 500);
