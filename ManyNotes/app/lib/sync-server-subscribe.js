var Q = require("q");
var notes =  Alloy.Collections.note;

var agent = {
	formatResults :function(input){
		try{
			var data = JSON.parse(input);
			return (( Object.prototype.toString.call( data ) === '[object Array]' ) ? data[0] : data);
		}catch(err){
			return null;
		}
	},
	verifyStatus:function(evtList){
		var iLength= evtList.length;
		for (var i=0;i<iLength;i++){
			evtList[i].noteRefCount = _.where(evtList, {noteid: evtList[i].noteid}).length;
			if(evtList[i].noteRefCount > 1){
				evtList[i].eventtype = 'update';
			}else{
				if(Alloy.Collections.note.noteExists(evtList[i].noteid)){
					evtList[i].eventtype = 'update';
				}					
			}				
		}
		return evtList;	
	},
	eventsSince : function(modifyID){
		modifyID = modifyID || -1;
		var defer = Q.defer();
		console.debug('finding server events greater than ' + modifyID);
		var query = "?$filter=modifyid%20gt%20" + modifyID;
	    Alloy.Globals.azure.QueryTable('noteEvents', query, function(jsonResponse) {	       
	       var data = JSON.parse(jsonResponse);
	       var serverEvts = agent.verifyStatus(data);
	       console.debug('obtained ' + serverEvts.length + ' server events');
	       defer.resolve(serverEvts);	       
	       
	    }, function(err) {
	    	console.error('Error eventsSince:' + err);
	        var error = JSON.parse(JSON.stringify(err));
			defer.reject({
				success:  false,
				message: error
			});
	    });				
		return defer.promise;		
	},
	add : function(evtList,evtStore){
		var promises = [];
		var addList = _(evtList).filter(function (x) { return x.eventtype == 'add';});		
		console.debug('downloading ' + addList.length + ' notes');
		
		_.each(addList, function(evt) {
			var deferred = Q.defer();
			console.debug('preparing to dowload document id ' + evt.noteid);
			var query = "?$filter=id%20eq%20'" + evt.noteid + "'";
		    Alloy.Globals.azure.QueryTable('notes', query, function(jsonResponse) {
		      var data = agent.formatResults(jsonResponse);
			  if(data == null){
		       		console.error('invalid document description skipping id ' + evt.noteid);
		       		return defer.resolve();
		      }
		       
		      console.debug('creating local note with id ' + evt.noteid);
				// Create a new model for the note collection
			    var note = Alloy.createModel('note',{
			    	id: data.id,		
			    	notetext: data.notetext,
			    	modifyid : data.modifyid			    	
			    });
			    // add new note model to our collection and save
			    notes.add(note);		       
       			note.save();
       			console.debug('note ' + data.id + ' created');
       			deferred.resolve();			       
		    }, function(err) {
		    	console.error('Error add:' + err);
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
	remove : function(evtList){
		var removeList = _(evtList).filter(function (x) { return x.eventtype == 'remove';});
		_.each(removeList, function(event) {
			Alloy.Collections.note.get(event.noteid).destroy();
		});
	}
};

var publisher = function(evtStore,syncLog){
	var defer = Q.defer();
	var serverEvents = [];
	
	console.debug('Starting server subscriber');
	var lastID = syncLog.findLastTranactionID();
	console.debug('lastID=' + lastID);
	agent.eventsSince(lastID)
		.then(function(evtList){
			serverEvents = evtList;
			agent.remove(serverEvents);
			return agent.add(serverEvents);
		}).then(function(){
			console.debug('Finishing server subscriber');
			defer.resolve({
				sucess:true,
				data:serverEvents
			});		
		}).catch(function(err){
			console.error('Error server subscriber: ' + JSON.stringify(err));
			defer.reject({
				success:  false,
				message: err
			});
		});		
	
	return defer.promise;
};

module.exports = publisher;