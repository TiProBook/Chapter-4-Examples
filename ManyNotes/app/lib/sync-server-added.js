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
	add : function(evtList,evtStore){
		var promises = [];
		var addList = _(evtList).filter(function (x) { return x.eventtype == 'added';});		
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
	}
};

var publisher = function(serverEvents){
	var defer = Q.defer();
	
	console.debug('Starting server added events sync');
	agent.add(serverEvents)
		.then(function(){
			console.debug('Finishing server added events sync');
			defer.resolve({
				sucess:true,
				data:serverEvents
			});		
		}).catch(function(err){
			console.error('Error server added event sync: ' + JSON.stringify(err));
			defer.reject({
				success:  false,
				message: err
			});
		});		
	
	return defer.promise;
};

module.exports = publisher;