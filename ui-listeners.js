var G = require('./global')
  , s = G.server
  , UI = require('./ui')
  , util = require('util')
  ;

s.on('MSG', function(args) {
	UI.pushChat(args.channel, args.character, args.message);
});

s.on('ERR', function(args) {
	UI.pushMessage('{red-fg}Error ' + args.number + ': ' + args.message + '{/}');
});

s.on('JCH', function(args) {
	if(G.character === args.character.identity && !G.chats[args.channel]) {
		var box = UI.chatBox(args.channel, args.title);
		UI.screen.append(box);
		UI.currentBox.hide();
		UI.currentBox._.list.hide();
		UI.currentBox = box;
		UI.focus = [UI.input, box._.list, box];
		UI.focusIndex(0);
		UI.input.focus();
		UI.screen.render();
	} else {
		var ch = G.chats[args.channel];
		ch.list._.add(args.character.identity);
		UI.screen.render();
	}
});

s.on('LCH', function(args) {
	if(G.character === args.character) {

	} else {
		var ch = G.chats[args.channel];
		ch.list._.remove(args.character);
		UI.screen.render();
	}
});

s.on('IDN', function(args) {
	G.character = args.character;
	G.characterRegex = new RegExp(G.character,'ig');
});

s.on('ICH', function(args) {
	var ch = G.chats[args.channel];
	ch.list._.arr = args.users.sort(function(a,b){return a.identity.localeCompare(b.identity);}).map(function(user) {
		return user.identity;
	});
	ch.list.setItems(ch.list._.arr);
	UI.screen.render();
});
