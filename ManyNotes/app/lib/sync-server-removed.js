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
	var defer = Q.defer();
	var serverEvents = [];
	
	console.debug('Starting server removed event sync');
	agent.remove(serverEvents)
		.then(function(){
			console.debug('Finishing server removed event sync');
			defer.resolve({
				sucess:true,
				data:serverEvents
			});		
		}).catch(function(err){
			console.error('Error server removed event sync: ' + JSON.stringify(err));
			defer.reject({
				success:  false,
				message: err
			});
		});		
	
	return defer.promise;
};

module.exports = publisher;