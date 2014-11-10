var Q = require("q");

var agent = {
	createNoteRequest : function(noteID){
		var model = Alloy.Collections.note.get(noteID);
		if(model !=undefined || model !=null){
			return JSON.stringify(model);
		}else{
			return null;
		}
	},	
	add : function(evtStore,eventPublisher){
		var promises = [];
		var events = evtStore.where({
			eventtype:'added'
		});
		
		console.debug('start processing ' + events.length + ' added events');
		_.each(events, function(event) {

			var request = agent.createNoteRequest(event.toJSON().noteid);
			if(request == null){
				console.debug('unable to load note, skipping sync');
			}else{
				var deferred = Q.defer();
				var noteID = event.toJSON().noteid;
				console.debug('publishing noteid:' + noteID);
			    Alloy.Globals.azure.InsertTable('notes', request, function(data) {
			    	new eventPublisher(event)
			    	.then(function(){
				    	evtStore.removeEventsForNote(noteID);
						return deferred.resolve(data);					    		
			    	});			
	            }, function(err) {
	            	console.error('Error publishing noteID:' + event.toJSON().noteid + ' ' + err);
	      			var error = JSON.parse(JSON.stringify(err));
	   				deferred.reject({
						success:  false,
						message: error
					});
	            });				
			 promises.push(deferred.promise); 
			}	                     	
		});	
			
		return Q.all(promises);	
	}
};

var publisher = function(evtStore,eventPublisher){
	var defer = Q.defer();
	
	console.debug('Starting local added publisher');
	agent.add(evtStore,eventPublisher)
		.then(function(){
			console.debug('Finished local added publisher');
			defer.resolve({
					sucess:true
				});
		}).catch(function(err){
			console.error('Error local pushisher: ' + JSON.stringify(err));
			defer.reject({
				success:  false,
				message: err
			});
		});		
	return defer.promise;
};

module.exports = publisher;