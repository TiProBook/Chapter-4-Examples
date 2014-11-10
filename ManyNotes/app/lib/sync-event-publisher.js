var Q = require("q");

var publisher = function(event){
	if(event !=undefined || event !=null){
		return;
	}
	event.modifyid = new Date().getTime(); // Force the event to published with the current time.	
	var request = JSON.stringify(event);	
	var defer = Q.defer();          	
	Alloy.Globals.azure.InsertTable('noteEvents', request, function(data) {
		deferred.resolve(data);				
    }, function(err) {
        var error = JSON.parse(JSON.stringify(err));
		defer.reject({
			success:  false,
			message: error
		});
    });
	return defer.promise;		
};

module.exports = publisher;