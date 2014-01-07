var fs = require('fs')
  ;

module.exports = {};

var strerr = fs.readFileSync('error-codes.txt', {encoding:'ascii'});
var sp = strerr.split('\n');
for(var i = 0; i < sp.length; i++) {
	var sp2 = sp[i].split('	');
	var code = sp2[0];
	var msg = sp2[1].trim();
	msg = msg.substring(1, msg.length - 1);
	module.exports[code] = msg;
}
