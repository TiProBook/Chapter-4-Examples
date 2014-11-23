var Q = require("q");

var agent = {
    formatDownloadResults :function(input){
        try{
            var data = JSON.parse(input);
            return (( Object.prototype.toString.call( data ) === '[object Array]' ) ? data[0] : data);
        }catch(err){
            return null;
        }
    },    
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
	    console.debug('downloadFromServer noteID:' + noteID);
	    var deferred = Q.defer();  
	    var query = "?$filter=id%20eq%20%27" + noteID + "%27";
        Alloy.Globals.azure.QueryTable('notes', query, function(jsonResponse) {
            var data = agent.formatDownloadResults(jsonResponse);          
            if(exists){
                //Update existing model
                var note = Alloy.Collections.note.get(noteID);
                note.set({
                    notetext : data.notetext,
                    modifyid : data.modifyid
                }); 
                note.save();                
            }else{
                //Add new model
                var model = Alloy.createModel('note', {
                  id : Ti.Platform.createUUID(),
                  notetext : data.notetext,
                  modifyid : new Date().getTime()
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
                    var query = "?$filter=id%20eq%20%27" + noteID + "%27";
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
	    var changes = _.uniq(_.union(localIDs,serverIDs));
	    var promises = [];
	    
	    console.debug("evaluating " + changes.length + " changes");	    
	    _.each(changes, function(noteID) {
	        
	        var exists = Alloy.Collections.note.noteExists(noteID);  
            var localVersion = exists ? agent.nz(agent.getLocalNoteInfo(noteID,localEvents)) : -1 ;
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
               promises.push(agent.downloadFromServer(noteID,exists));                 
            }               	          
            
	    });	    
	    
	    return Q.all(promises);
	}
};

var publisher = function(localEvents,serverEvents,eventPublisher){	
	console.debug('Starting : Updated event management');
    var localUpdateEvts = _.where(localEvents.toJSON(),{eventtype:'updated'});
    var serverUpdateEvts = _.where(serverEvents,{eventtype:'updated'});

    function serverCorrelationRequire(){
        var defer = Q.defer();
        console.debug("Server Lookup required to match local evenets");
        agent.gatherServerInfo(localEvents,serverUpdateEvts)
        .then(function(serverInfoFull){
            return agent.compare(localUpdateEvts,serverInfoFull,eventPublisher)
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
    
    function serverProcessOnly(){
        var defer = Q.defer();
        console.debug("Running Update Server Processing Only");
        agent.compare(localUpdateEvts,serverUpdateEvts,eventPublisher)
        .then(function(){
            console.debug('Finished : Updated event management');
            defer.resolve({
                sucess:true
            });           
        }).catch(function(err){
            console.error('Error : Updated event management:' + JSON.stringify(err));
            defer.reject({
                success:  false, message: err
            });
        }); 
        
        return defer.promise;       
    } 
        	
	return (localUpdateEvts.length===0) ? serverProcessOnly() : serverCorrelationRequire();		
};

module.exports = publisher;