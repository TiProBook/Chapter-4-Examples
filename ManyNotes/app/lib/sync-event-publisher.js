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
		var query = "?$filter=noteid%20eq%20'" + noteID + "'";
		    Alloy.Globals.azure.QueryTable('noteEvents', query, function(jsonResponse) {
		      var data = agent.formatResults(jsonResponse);
			  if(data == null){
		       		console.error('invalid event results skipping noteid ' + evt.noteID);
		       		return defer.resolve();
		      }		       
              deferred.resolve({success:true, data:data}); 
		    }, function(err) {
		    	console.error('Error add:' + err);
		        var error = JSON.parse(JSON.stringify(err));
				deferred.reject({
					success:  false,
					message: error
				});
		    });	
		    
		return defer.promise; 		
	},
    removeRelatedServerEvents :function(events){
        var promises = [];
                    
        console.debug('start processing ' + events.length + ' remove events');
        
        _.each(events, function(event) {
            var deferred = Q.defer();
            console.debug('removing azure events for noteID:' + event.noteid);
            Alloy.Globals.azure.DeleteTable('noteEvents', event.id, function(data) {
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
    },
    postEvent : function(event){
        var request = JSON.stringify(event);    
        var defer = Q.defer();       
        Alloy.Globals.azure.InsertTable('noteEvents', request, function(data) {
            deferred.resolve(data);             
        }, function(err) {
            var error = JSON.parse(JSON.stringify(err));
            defer.reject({
                success:  false,
                message: error
            });
        });
        return defer.promise;        
    }	
};
var publisher = function(event){
	if(event !=undefined || event !=null){
		return;
	}
	event.modifyid = new Date().getTime(); // Force the event to published with the current time.	
	console.debug('Starting: publishing event to server');
	
	var defer = Q.defer();  
    agent.getServerEventsForNote(event.noteid)
    .then(function(serverEvents){
        return agent.removeRelatedServerEvents(serverEvents);
    }).then(function(){
        return agent.postEvent(event);
    }).then(function(){
       console.debug('Finished: publishing event to server');
        defer.resolve({
            sucess:true,
            data:serverEvents
        });     
    }).catch(function(err){
        console.error('Error: publishing event to server ' + JSON.stringify(err));
        defer.reject({
            success:  false,
            message: err
        });
    });     
	return defer.promise;		
};

module.exports = publisher;