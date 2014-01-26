var b = require('blessed')
  , p = b.program()
  , s = b.screen({
	dump: __dirname + '/ui.log'
  ,	resizeTimeout: 1000
  })
  , util = require('util')
  ;

s.key('C-c', function() {
	return process.exit(0);
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

function userList() {
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
	list.key('pageup', function(ch, key) {
		list.up(p.rows - 9);
		s.render();
	});
	list.key('pagedown', function(ch, key) {
		list.down(p.rows - 9);
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

var list = userList();

list.key('enter', function() {
	this._.remove(this.selected.toString());
	s.render();
});

function defaultList(list, x) {
	var i = 0
	  , a = []
	  , x = x || 0;
	  ;
	for(; i < 10; i++) {
		a.push((i + x).toString());
	}
	list._.arr = a;
	list.setItems(a);
	return list;
}

defaultList(list);
list.show();
s.render();

setTimeout(function() {
	list._.add('10');
	s.render();
}, 5000);
