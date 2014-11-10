var Q = require("q");

var agent = {
	remove :function(evtStore){
		try{
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
			    	evtStore.removeEventsForNote(noteID);
					deferred.resolve(data);				
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
		}catch(err){
			console.error('remove note general error:' + JSON.stringify(err));
		}		
	}	
};

var publisher = function(evtStore){
	var defer = Q.defer();
	
	console.debug('Starting local removed publisher');
	agent.remove(evtStore)
		.then(function(){
			console.debug('Finished local removed publisher');
			defer.resolve({
					sucess:true
				});
		})
		.catch(function(err){
			console.error('Error local pushisher: ' + JSON.stringify(err));
			defer.reject({
				success:  false,
				message: err
			});
		});		
	return defer.promise;
};

module.exports = publisher;