var EventEmitter = require('events').EventEmitter
  ;

var g = {};

g.var = {};
g.chats = {};
g.pms = {};
g.chatsArray = [];
g.chatsIndex = 0;
g.ws = null;
g.send = null;
g.server = new EventEmitter();
g.character = null;
g.characterRegex = null;
g.maxBuffer = 500;
g.logTimeouts = [];
g.millisInDay = 86400000; // 1000*60*60*24

g.CON = -1;

module.exports = g;
