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
	createMaxEventList : function(list,noteID){
		var eventsForID = _(list).filter(function (x) { return x.noteid == noteID;});			
		return  _.max(eventsForID, function(evt){ return evt.modifyid; });		
	},
	uniqueUpdateList :function(list){
		var updateList = _(list).filter(function (x) { return x.eventtype == 'updated';});
		return _.uniq(updateList, false, function(p){ return p.noteid; });			
	},	
	serverToLocalCompare : function(localEvents,serverEvents){
		console.debug('starting server to local compare');
		var promises = [];
		var serverSearch = agent.uniqueUpdateList(serverEvents);	
		var notes = Alloy.Collections.note;
		
		_.each(serverSearch, function(srvEvt) {
				
			var localEvent =  agent.createMaxEventList(localEvents,srvEvt.noteid);
						
			if(localEvent[0].modifyid < srvEvt.modifyid){
				var deferred = Q.defer();	
				var query = "?$filter=id%20eq%" + srvEvt.noteid;
			    Alloy.Globals.azure.QueryTable('notes', query, function(jsonResponse) {
			       	var data = JSON.parse(jsonResponse);
			       	var note = notes.get(srvEvt.noteid);
					note.notetext= data.notetext;
					note.modifyid = data.modifyid;	       
		   			note.save();
		   			localEvents.removeEventsForNote(srvEvt.noteid);
		   			deferred.resolve();			       
			    }, function(err) {
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
	},
	localToServerCompare : function(localEvents,serverEvents,eventPublisher){
		console.debug('starting local to server compare');
		var promises = [];
		var searchList = agent.uniqueUpdateList(localEvents);	
			
		_.each(searchList, function(locEvt) {
			
			var serverEvent =  agent.createMaxEventList(serverEvents,locEvt.noteid);
			
			if(serverEvent[0].modifyid < locEvt.modifyid){
				var request = agent.createNoteRequest(locEvt.noteid);
				if(request !==null){
					var deferred = Q.defer();
			         Alloy.Globals.azure.UpdateTable('notes', locEvt.noteid, request, function(response) {
			             new eventPublisher(locEvt)
                        .then(function(){
                            localEvents.removeEventsForNote(locEvt.noteid);
                            return deferred.resolve(response);                              
                        }); 
							
				    }, function(err) {
				        var error = JSON.parse(JSON.stringify(err));
						deferred.reject({
							success:  false,
							message: error
						});
				    });	
				    promises.push(deferred.promise);	
				}					
			}
		});
		
		return Q.all(promises);
	}	
};

var publisher = function(localEvents,serverEvents,eventPublisher){	
	console.debug('Starting : Updated event management');
	
	var defer = Q.defer();
	localEvents = localEvents.toJSON();
	
	agent.serverToLocalCompare(localEvents,serverEvents)
	.then(function(){
		return agent.localToServerCompare(localEvents,serverEvents);
	}).then(function(){
		console.debug('Finished : Updated event management');
		defer.resolve({
			sucess:true,
			data:serverEvents
		});		
	}).catch(function(err){
		console.error('Error : Updated event management:' + JSON.stringify(err));
		defer.reject({
			success:  false,
			message: err
		});
	});
	
	return defer.promise;		
};

module.exports = publisher;