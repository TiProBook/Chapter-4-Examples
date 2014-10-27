var Q = require("q");

var agent = {
	createEventRequest : function(event){
		if(event !=undefined || event !=null){
			return JSON.stringify(event);
		}else{
			return null;
		}
	},		
	broadcast : function(evtStore){
		var promises = [];
		
		evtStore.setSortField("modifyid", "ASC");
		evtStore.sort();		
		
		console.debug('broadcasting ' + evtStore.models.length + ' to server');
		
		_.each(evtStore.models, function(evt) {								
		    var request = agent.createEventRequest(evt);
		    if(request!==null){
				var deferred = Q.defer();	
				Alloy.Globals.azure.InsertTable('noteEvents', request, function(data) {
					deferred.resolve(data);				
	            }, function(err) {
	                var error = JSON.parse(JSON.stringify(err));
	   				defer.reject({
						success:  false,
						message: error
					});
	            });
	          	promises.push(deferred.promise); 	    	
		    }                          	
		});	
		
		return Q.all(promises);	
	},
	finalize : function(evtStore){
		evtStore.setSortField("modifyid", "DESC");
		evtStore.sort();	
		if(evtStore.models.length === 0 ){
			console.debug('No local events existing so generate using sync time');
			return new Date().getTime();
		}else{
			return evtStore.models[0].toJSON().modifyid;
		}	
	}	
};

var publisher = function(evtStore){
	console.debug('event finalizer started');
	
	var defer = Q.defer();
	agent.broadcast(evtStore)
		.then(function(){
			console.debug('event finalizer completed');
			defer.resolve(agent.finalize(evtStore));
		});
	return defer.promise;	
};

module.exports = publisher;