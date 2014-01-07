var EventEmitter = require('events').EventEmitter
  ;

var g = {};

g.var = {};
g.chats = {};
g.chatsArray = [];
g.chatsIndex = 0;
g.ws = null;
g.send = null;
g.server = new EventEmitter();
g.character = null;
g.characterRegex = null;

g.CON = -1;

module.exports = g;
