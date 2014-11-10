
var publisher = function(serverEvents){
	
	console.debug('Starting server removed event sync');
	
	var removeList = _(serverEvents).filter(function (x) { return x.eventtype == 'removed';});
	_.each(removeList, function(event) {
		Alloy.Collections.note.removeIfExists(event.noteid);
	});	
	
	console.debug('Finishing server removed event sync');
};

module.exports = publisher;