
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
	
	//Perform actions based on locally generated events
	new localAddedEvents(evtStore,eventPublisher)
		.then(function(){
			return new localRemovedEvents(evtStore,eventPublisher);	
		}).catch(function(err){
			console.error('sync error:' + JSON.stringify(err));
			callback({
				success:false,
				error:err
			});
			return;			
		});	
	
	//Perform actions based on server provided events
	var serverEvents = [];
	new serverEventList(syncLog)
		.then(function(srvEvents){
			serverEvents = srvEvents; //make this variable accessible outside of this closure			
			new serverRemovedEvents(srvEvents);
			return new serverAddedEvents(srvEvents);
		}).catch(function(err){
			console.error('sync error:' + JSON.stringify(err));
			callback({
				success:false,
				error:err
			});
			return;			
		});	
    
    //Manage updated events
	new manageUpdatedEvents(evtStore,serverEvents,eventPublisher)	
		.catch(function(err){
			console.error('sync error:' + JSON.stringify(err));
			callback({
				success:false,
				error:err
			});	
			return;	
		});	

    //Save the current timestamp so we know where to start reading from next time
	syncLog.saveTimestamp();
	//Remove our local event cache
	evtStore.removeAll();
	
	callback({
		success:true
	});					
};

module.exports = sync;
