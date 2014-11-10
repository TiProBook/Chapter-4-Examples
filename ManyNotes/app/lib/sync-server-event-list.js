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
				evtList[i].eventtype = 'updated';
			}else{
				if(Alloy.Collections.note.noteExists(evtList[i].noteid)){
					evtList[i].eventtype = 'updated';
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
	}
};

var publisher = function(syncLog){
	var defer = Q.defer();
	var serverEvents = [];
	
	console.debug('Starting: getting server event list');
	var lastID = syncLog.findLastTranactionID();
	console.debug('lastID=' + lastID);
	agent.eventsSince(lastID)
		.then(function(){
			console.debug('Finishing: getting server event list');
			defer.resolve({
				sucess:true,
				data:serverEvents
			});		
		}).catch(function(err){
			console.error('Error: getting server event list: ' + JSON.stringify(err));
			defer.reject({
				success:  false,
				message: err
			});
		});		
	
	return defer.promise;
};

module.exports = publisher;