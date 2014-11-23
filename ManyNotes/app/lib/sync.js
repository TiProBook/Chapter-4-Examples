
var Q = require("q"),
	syncLog = require('sync-transaction-record'),
	localAddedEvents =  require('sync-local-added'),
	localRemovedEvents =  require('sync-local-removed'),
	serverEventList =  require('sync-server-event-list'),
	serverRemovedEvents = require('sync-server-removed'),
	serverAddedEvents = require('sync-server-added'),
	eventPublisher = require('sync-event-publisher'),
	manageUpdatedEvents = require('sync-updated-manager');

var sync = function(callback){	

	if(!Ti.Network.online){
		callback({
			success:false,
			message:'No network connection found'
		});
		return;
	}
	
    // fetch existing tables from storage
	var evtStore = Alloy.Collections.eventStore;
	evtStore && evtStore.fetch();
			
	//Initialize our transaction log
	syncLog.init();
	
	var flow = {
        serverSide :function(){
            var serverEvents = [];
            //Perform actions based on server provided events
            new serverEventList(syncLog)
                .then(function(srvEvents){
                    console.debug("srvEvents:" + JSON.stringify(srvEvents));
                    serverEvents = srvEvents.data; //make this variable accessible outside of this closure           
                    new serverRemovedEvents(serverEvents);
                    return new serverAddedEvents(serverEvents);
                }).then(function(){
                    flow.versionCompare(serverEvents);
                }).catch(function(err){
                    console.error('sync error:' + JSON.stringify(err));
                    callback({
                        success:false,
                        error:err
                    });
                    return;         
                });     
        },
        versionCompare :function(serverEvents){
            //Manage updated events
            new manageUpdatedEvents(evtStore,serverEvents,eventPublisher)
            .then(function(){
                 flow.complete();
            }).catch(function(err){
                console.error('sync error:' + JSON.stringify(err));
                callback({
                    success:false,
                    error:err
                });  
                return;  
            });         
        },
        complete :function(){
            //Save the current timestamp so we know where to start reading from next time
            //syncLog.saveTimestamp();
            //Remove our local event cache
            //evtStore.removeAll();
            
            Alloy.Collections.note.fetch();
            callback({
                success:true
            });         
        }                	    
	};
	        	
	//Perform actions based on locally generated events
	new localAddedEvents(evtStore,eventPublisher)
		.then(function(){
			return new localRemovedEvents(evtStore,eventPublisher);	
		}).then(function(){
		   flow.serverSide(); 
		}).catch(function(err){
			console.error('sync error:' + JSON.stringify(err));
			callback({
				success:false,
				error:err
			});
			return;			
		});	
					
};

module.exports = sync;
