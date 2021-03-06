var transaction = {
	collection: null,
	init : function(){
		transaction.collection = Alloy.Collections.transactionLog;
		transaction.collection.fetch({
			query: 'SELECT max(modifyID) as modifyID FROM ' + transaction.collection.config.adapter.collection_name		
		});				
	},
	findLastTranactionID : function(){
		if(transaction.collection.models.length==0){
			return null;
		}
		if(transaction.collection.models.length > 0){
			console.debug('trans models:' + JSON.stringify(transaction.collection.models));
			return transaction.collection.models[0].toJSON().modifyID;
		}		
	},
	saveTimestamp :function(){
	    // Create a new model for the note collection
	    var trans = Alloy.createModel('syncTranactionLog', {
	    	modifyID: new Date().getTime()
	    });		
	    // add new model to the global collection
	    Alloy.Collections.transactionLog.add(trans);
		//Save model update
		trans.save();
	}
};
	
module.exports = transaction;