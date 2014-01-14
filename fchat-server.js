var fclient = require('./fchat-client')
  , G = require('./global')
  , s = G.server
  ;

var CMD = {};

CMD.PIN = function(args) {
	fclient.PIN(args);
};

CMD.IDN = function(args) {};

CMD.VAR = function(args) {
	G.var[args.variable] = args.value;
};

CMD.HLO = function(args) {
};

CMD.CON = function(args) {
	G.CON = args.count;
};

CMD.FRL = function(args) {
};

CMD.IGN = function(args) {
};

CMD.ADL = function(args) {
};

CMD.LIS = function(args) {
};

// We'll worry about this later, holy crap is it noisy
//CMD.NLN = function(args) {
//};

CMD.CHA = function(args) {
};

CMD.JCH = function(args) {
};

CMD.LCH = function(args) {
};

CMD.MSG = function(args) {
};

CMD.LRP = function(args) {
};

CMD.ERR = function(args) {
};

CMD.ICH = function(args) {
};

CMD.PRI = function(args) {
};

for(var cmd in CMD) {
	s.on(cmd, CMD[cmd]);
}

module.exports = CMD;
