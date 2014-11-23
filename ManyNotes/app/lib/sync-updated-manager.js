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
	getMaxEvent : function(noteID,list){			
		return _.max(_.where(list,{noteid:noteID}), function(evt){ return evt.modifyid; });		
	},
	formatToNoteIDList : function(list){
	  var noteList = [],
	      length = list.length;
	   for (var i=0;i<length;i++){
	       noteList.push(list[i].noteid);    
	   }
	   return noteList;
	},	
	postToServer : function(noteID,eventPublisher){
	    console.debug('Updating server with noteID:' + noteID);
        var request = agent.createNoteRequest(noteID);
        if(request ==null){
            console.error('invalid note model, skipping noteID:' + noteID);
            return;
        }
        var deferred = Q.defer();
         Alloy.Globals.azure.UpdateTable('notes', noteID, request, function(response) {
             new eventPublisher({
                id : Ti.Platform.createUUID(),
                noteid : noteID,
                eventtype: 'updated',
                modifyid: new Date().getTime()                 
             }).then(function(){
                Alloy.Collections.eventStore.removeEventsForNote(noteID);
                return deferred.resolve(response);                              
            });                 
        }, function(err) {
            var error = JSON.parse(JSON.stringify(err));
            deferred.reject({
                success:  false, message: error
            });
        }); 
        return deferred.promise;    	    
	},
	downloadFromServer : function(noteID,exists){
	    console.debug('downloading noteID:' + noteID);
	    var deferred = Q.defer();  
        var query = "?$filter=id%20eq%" + noteID;
        Alloy.Globals.azure.QueryTable('notes', query, function(jsonResponse) {
            var data = JSON.parse(jsonResponse);
            if(exists){
                //Update existing model
                var note = notes.get(noteID);
                note.set({
                    notetext : data.notetext,
                    modifyid : data.modifyid
                }); 
                note.save();                
            }else{
                //Add new model
                var model = Alloy.createModel('note', {
                  id : data.id,
                  notetext : data.notetext,
                  modifyid : data.modifyid
                });
                // add new model to the global collection
                Alloy.Collections.note.add(model);
                model.save();               
            }
       
            Alloy.Collections.eventStore.removeEventsForNote(noteID);
            deferred.resolve();                
        }, function(err) {
            var error = JSON.parse(JSON.stringify(err));
            deferred.reject({
                success:  false, message: error
            });
        });	
        
        return deferred.promise;    
	},
	getLocalNoteInfo : function(noteID, list){

	    if(_.where(list, {noteid:noteID}).length > 0){
	        return agent.getMaxEvent(noteID,list).modifyid;
	    }
	    
	    return Alloy.Collections.note.get(noteID).modifyid;
	},
	nz : function(value){
	  if(value == undefined || value == null){
	      return 0;
	  }  
	  return value;
	},
    gatherServerInfo : function(localEvents,serverEvents){
            var promises = [];
            var output = [];
            var deferredOutter = Q.defer(); 
                           
            _.each(localEvents, function(note) {
                var deferred = Q.defer();
                var noteID = note.noteid;
                var search = _.where(serverEvents,{noteid: noteID});
                 if(search.length == 0){
                    console.debug("need to lookup server for noteID:" + noteID); 
                    var query = "?$filter=id%20eq%" + noteID;
                    Alloy.Globals.azure.QueryTable('notes', query, function(jsonResponse) {
                        console.debug('adding server version noteID:' + noteID);
                        var data = JSON.parse(jsonResponse);
                        data.id = Ti.Platform.createUUID();
                        data.noteid = noteID;
                        output.push(data);      
                        deferred.resolve(data);                
                    }, function(err) {
                        console.debug('adding missing server version noteID:' + noteID);
                        output.push({
                           id : Ti.Platform.createUUID(),
                           noteid:noteID,
                           modifyid : 0
                        });
                        deferred.resolve();
                    });
                    promises.push(deferred.promise); 
                 }                             
            });
        
            Q.all(promises).done(function(){
               deferredOutter.resolve(output);
            });
            
            return deferredOutter.promise;
    },	
	compare : function(localEvents,serverEvents,eventPublisher){
	    var localIDs = agent.formatToNoteIDList(localEvents);
	    var serverIDs = agent.formatToNoteIDList(serverEvents);
	    var changes = _.uniq(localIDs,serverIDs);
	    var promises = [];
	    _.each(changes, function(noteID) {
	        
	        var exists = Alloy.Collections.note.noteExists(noteID);  
            var localVersion = agent.nz(agent.getLocalNoteInfo(noteID,localEvents));
            var serverVersion = agent.nz(agent.getMaxEvent(noteID,serverEvents).modifyid);
            console.debug("noteID:" + noteID + " localVersion:" + localVersion + " serverVersion:" + serverVersion); 
               
            if(exists & (localVersion == serverVersion)){
                console.debug("Skipping same version information");           
            }

            if(exists & (localVersion > serverVersion)){
                console.debug("Posting to server");
                promises.push(agent.postToServer(noteID,eventPublisher));            
            }
                        
            if((exists == false) || (serverVersion > localVersion)){
               console.debug("Downloading to local");
               promises.push(downloadFromServer(noteID,exists));                 
            }               	          
            
	    });	    
	    
	    return Q.all(promises);
	}
};

var publisher = function(localEvents,serverEvents,eventPublisher){	
	console.debug('Starting : Updated event management');
	var defer = Q.defer();
	localEvents = localEvents.toJSON();
    agent.gatherServerInfo(localEvents,serverEvents)
    .then(function(serverInfoFull){
        return agent.compare(localEvents,serverInfoFull,eventPublisher)
        .then(function(){
            console.debug('Finished : Updated event management');
            defer.resolve({
                sucess:true
            });           
       });
    }).catch(function(err){
        console.error('Error : Updated event management:' + JSON.stringify(err));
        defer.reject({
            success:  false, message: err
        });
    });
		
	return defer.promise;		
};

module.exports = publisher;