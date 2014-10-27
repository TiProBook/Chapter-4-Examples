
var eventStorage = {
	skipRecordEvent: function(noteID, eventType){
		var addedNotSynced = Alloy.Collections.eventStore.noteHasEventType(noteID,'add');
		
		//If added but not synced yet, don't record update event
		//We will just publish the add event with all changes
		if(addedNotSynced && eventType == 'update'){
			return true;
		}
		
		//If added but not synced yet, then removed delete the event since we have nothing to publish
		if(addedNotSynced && eventType == 'remove'){
			evtStore.removeEventsForNote(noteid);
			return true;
		}
		
		return false;
	},
	addEvent : function(noteID,eventType){
		var evtStore = Alloy.Collections.eventStore;
		
		//Check if this event should be recorded
		if(eventStorage.skipRecordEvent(noteID,eventType)){
			return;
		}
				
		//Create a new event for this note				
	    var model = Alloy.createModel('eventStore', {
	        id : Ti.Platform.createUUID(),
	        noteid : noteID,
	        eventtype: eventType,
	        modifyid: new Date().getTime()
	    });
	    //Add to our collection
	    evtStore.add(model);
	    //Save the event model
	    model.save();
	    //Update the eventStore collection
	    evtStore.fetch();
	},
	clearEvents : function(){
		Alloy.Collections.eventStore.removeAll();
	    //Update the eventStore collection
	    evtStore.fetch();		
	}
};

module.exports = eventStorage;
