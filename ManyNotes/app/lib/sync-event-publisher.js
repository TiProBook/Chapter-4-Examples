var Q = require("q");

var agent = {
    formatResults :function(input){
        try{
            var data = JSON.parse(input);
            return (( Object.prototype.toString.call( data ) === '[object Array]' ) ? data[0] : data);
        }catch(err){
            return null;
        }
    },    
	getServerEventsForNote : function(noteID){
		var deferred = Q.defer();
	    var query = "?$filter=noteid%20eq%20%27" + noteID + "%27";
		    Alloy.Globals.azure.QueryTable('noteEvents', query, function(jsonResponse) {
		      var data = JSON.parse(jsonResponse);
			  if(data == null){
		       		console.debug('invalid event results skipping noteid ' + noteID);
		       		return deferred.resolve();
		      }		       
              deferred.resolve(data); 
		    }, function(err) {
		    	console.error('Error add:' + err);
		        var error = JSON.parse(JSON.stringify(err));
				deferred.reject({
					success:  false,
					message: error
				});
		    });	
		    
		return deferred.promise; 		
	},
    removeRelatedServerEvents :function(events){
        var promises = [];
        if(events == undefined || events == null){
            return;
        }
        console.debug('start processing ' + events.length + ' old events to be removed');
        
        _.each(events, function(event) {
            var deferred = Q.defer();
            var eventID = event.id;
            console.debug('removing azure events for event id:' + eventID);
            Alloy.Globals.azure.DeleteTable('noteEvents', eventID, function(data) {
                   deferred.resolve(data);              
            }, function(err) {
                console.error('Error removing azure stored event id:' + eventID + ' ' + JSON.stringify(err));
                deferred.resolve();
            });                 
            promises.push(deferred.promise);                    
        }); 
            
        return Q.all(promises);     
    },
    postEvent : function(event){
        var request = JSON.stringify(event);    
        var deferred = Q.defer();       
        Alloy.Globals.azure.InsertTable('noteEvents', request, function(data) {
            deferred.resolve(data);             
        }, function(err) {
            var error = JSON.parse(JSON.stringify(err));
            deferred.reject({
                success:  false,
                message: error
            });
        });
        return deferred.promise;        
    },
    addedEvent : function(event){
        var deferred = Q.defer(); 
        agent.postEvent(event)
       .then(function(){
           console.debug('Finished: publishing event to server');
            deferred.resolve({
                sucess:true,
                data:event
            });     
        }).catch(function(err){
            console.error('Error: publishing event to server ' + JSON.stringify(err));
            deferred.reject({
                success:  false,
                message: err
            });
        });  
        return deferred.promise;          
    },
    existingEvents : function(event){
        var deferred = Q.defer(); 
        agent.getServerEventsForNote(event.noteid)
        .then(function(serverEvents){
            return agent.removeRelatedServerEvents(serverEvents);
        }).then(function(){
            return agent.postEvent(event);
        }).then(function(){
           console.debug('Finished: publishing event to server');
           deferred.resolve({
                sucess:true,
                data:event
            });     
        }).catch(function(err){
            console.error('Error: publishing event to server ' + JSON.stringify(err));
            deferred.reject({
                success:  false,
                message: err
            });
        }); 
        return deferred.promise;        
    }	
};

var publisher = function(event){
	if(event ==undefined || event ==null){
		return;
	}
	
	event.modifyid = new Date().getTime(); // Force the event to published with the current time.	
	console.debug('Starting: publishing event to server');
	//If is an added event, we can skip much of our publish logic
	if(event.eventtype == 'added'){
        return agent.addedEvent(event);           
	}else{
	    //If the event already exists, we need to smush the server events
	    //So we only have the latest event
        return agent.existingEvents(event);
	}		
};

module.exports = publisher;