
var Q = require("q"),
	syncLog = require('sync-transaction-record'),
	localAddedEvents =  require('sync-local-added'),
	localRemovedEvents =  require('sync-local-removed'),
	serverEventList =  require('sync-server-event-list'),
	serverRemovedEvents = require('sync-server-removed'),
	serverAddedEvents = require('sync-server-added'),

	eventFinalizer = require('sync-event-finalizer'),
	manageDeltaChanges = require('sync-delta-manager');

var sync = function(callback){	

	if(!Ti.Network.online){
		callback({
			success:false,
			message:'No network connection found'
		});
		return;
	}

	var evtStore = Alloy.Collections.eventStore;
	// fetch existing tables from storage
	evtStore && evtStore.fetch();
			
	//Initialize our transaction log
	syncLog.init();
	new localAddedEvents(evtStore)
		.then(function(){
			return new localRemovedEvents(evtStore);	
		}).catch(function(err){
			console.error('sync error:' + JSON.stringify(err));
			callback({
				success:false,
				error:err
			});
			return;			
		});	
	
	var serverEvents = [];
	new serverEventList(syncLog)
		.then(function(serverEvents){
			serverEvents = serverEvents;			
			new serverRemovedEvents(serverEvents)
			.then(function(){
				return new serverAddedEvents(serverEvents);	
			});
		}).catch(function(err){
			console.error('sync error:' + JSON.stringify(err));
			callback({
				success:false,
				error:err
			});
			return;			
		});	

	new manageDeltaChanges(evtStore,serverEvents)	
		.catch(function(err){
			console.error('sync error:' + JSON.stringify(err));
			callback({
				success:false,
				error:err
			});	
			return;	
		});	
				
	new eventFinalizer(evtStore,syncLog)
		.then(function(latestEvent){
			return syncLog.saveTransaction(latestEvent);
		}).then(function(){
			evtStore.removeAll();
			callback({
				success:true
			});		
		}).catch(function(err){
			console.error('sync error:' + JSON.stringify(err));
			callback({
				success:false,
				error:err
			});		
		});			
				
};

module.exports = sync;