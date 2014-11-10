var Q = require("q");

var agent = {
	remove : function(evtList){
		var removeList = _(evtList).filter(function (x) { return x.eventtype == 'removed';});
		_.each(removeList, function(event) {
			Alloy.Collections.note.get(event.noteid).destroy();
		});
	}
};

var publisher = function(serverEvents){
	
	console.debug('Starting server removed event sync');
	
	var removeList = _(serverEvents).filter(function (x) { return x.eventtype == 'removed';});
	_.each(removeList, function(event) {
		Alloy.Collections.note.get(event.noteid).destroy();
	});	
	
	console.debug('Finishing server removed event sync');
};

module.exports = publisher;