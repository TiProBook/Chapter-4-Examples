
var Q = require("q"),
	syncLog = require('sync-transaction-record'),
	localPublisher = require('sync-local-publish-changes'),
	serverSubscribe = require('sync-server-subscribe'),
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
	new localPublisher(evtStore)
		.then(function(){
			return new serverSubscribe(evtStore,syncLog);
		})
		.then(function(serverEvents){
			return new manageDeltaChanges(evtStore,serverEvents);
		})
		.then(function(){
			return new eventFinalizer(evtStore);
		})
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