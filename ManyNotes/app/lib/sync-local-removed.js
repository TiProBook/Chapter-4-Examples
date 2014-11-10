var Q = require("q");

var agent = {
	remove :function(evtStore,eventPublisher){
		var promises = [];
		
		var events = evtStore.where({
			eventtype:'removed'
		});
		
		console.debug('start processing ' + events.length + ' remove events');
		
		_.each(events, function(event) {
			var deferred = Q.defer();
			var noteID = event.toJSON().noteid;
			console.debug('removing azure stored noteID:' + noteID);
		    Alloy.Globals.azure.DeleteTable('notes', noteID, function(data) {
			    	new eventPublisher(event)
			    	.then(function(){
				    	evtStore.removeEventsForNote(noteID);
						return deferred.resolve(data);					    		
			    	});					
            }, function(err) {
            	console.error('Error removing azure stored noteID:' + event.toJSON().noteid + ' ' + err);
      			var error = JSON.parse(JSON.stringify(err));
   				deferred.reject({
					success:  false,
					message: error
				});
            });					
            promises.push(deferred.promise);                	
		});	
			
		return Q.all(promises);		
	}	
};

var publisher = function(evtStore,eventPublisher){
	var defer = Q.defer();
	
	console.debug('Starting: local removed publisher');
	agent.remove(evtStore,eventPublisher)
		.then(function(){
			console.debug('Finished: local removed publisher');
			defer.resolve({
					sucess:true
				});
		})
		.catch(function(err){
			console.error('Error: local pushisher: ' + JSON.stringify(err));
			defer.reject({
				success:  false,
				message: err
			});
		});		
	return defer.promise;
};

module.exports = publisher;