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
	add : function(evtStore){
		try{
			var promises = [];

			var events = evtStore.where({
				eventtype:'added'
			});
			
			console.debug('start processing ' + events.length + ' add events');
			_.each(events, function(event) {

				var request = agent.createNoteRequest(event.toJSON().noteid);
				if(request == null){
					console.debug('unable to load note, skipping sync');
				}else{
					var deferred = Q.defer();
					console.debug('publishing noteid:' + event.toJSON().noteid);
				    Alloy.Globals.azure.InsertTable('notes', request, function(data) {
						deferred.resolve(data);				
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
		}catch(err){
			console.error('add note general error:' + JSON.stringify(err));
		}		
	}
};

var publisher = function(evtStore){
	var defer = Q.defer();
	
	console.debug('Starting local added publisher');
	agent.add(evtStore)
		.then(function(){
			console.debug('Finished local added publisher');
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