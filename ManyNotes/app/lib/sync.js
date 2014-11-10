
var Q = require("q"),
	syncLog = require('sync-transaction-record'),
	localAddedEvents =  require('sync-local-added'),
	localRemovedEvents =  require('sync-local-removed'),
	serverEventList =  require('sync-server-event-list'),
	serverRemovedEvents = require('sync-server-removed'),
	serverAddedEvents = require('sync-server-added'),
	eventPublisher = require('sync-event-publisher'),
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
	
	var serverEvents = [];
	new serverEventList(syncLog)
		.then(function(serverEvents){
			serverEvents = serverEvents;			
			new serverRemovedEvents(serverEvents);
			return new serverAddedEvents(serverEvents);
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

	syncLog.saveTimestamp();
	evtStore.removeAll();
	callback({
		success:true
	});					
};

module.exports = sync;