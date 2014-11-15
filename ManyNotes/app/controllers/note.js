var args = arguments[0] || {};

var eventCoordinator = require('event-coordinator');

//Check if we have the noteText and noteID value, if so we are in edit mode
var isEdit = args.hasOwnProperty("notetext") && args.hasOwnProperty("id");

//Set our time depending on if we are editing or not
$.noteWindow.title = (isEdit ? "Edit Note" : "Add Note");

//If we are editing add the values
//Otherwise just use place-holder text
if(isEdit){
	$.txtNote.value = args.notetext;
	$.labelUpdated.text = String.format("Updated: %s %s",String.formatDate(new Date(parseFloat(args.modifyid))),String.formatTime(new Date(parseFloat(args.modifyid))));	
}else{
	$.labelUpdated.text = "Updated: Now";
}

//Create a shortcut to the note collection
var notes = Alloy.Collections.note;
	    
var viewController = {
	create :function(){
	    // Create a new model for the note collection
	    var noteID = Ti.Platform.createUUID();
	    var model = Alloy.createModel('note', {
	      id : noteID,
	      notetext: $.txtNote.value,
	      modifyid: new Date().getTime()
	    });
	    // add new model to the global collection
	    notes.add(model);
	    model.save();
	    //Add an event - add
	    eventCoordinator.addEvent(noteID,'added');
	},
	update : function(){
		//Get the note we need to update
		var model = notes.get(args.id);
		//Update the note text
		model.notetext = $.txtNote.value;
		//Update the modified time
		model.modifyid = new Date().getTime();
		//Save our updated model
		model.save();
	    //Add an event - update
	    eventCoordinator.addEvent(args.id,'updated');		
	},
	remove : function(){
		//Get the note we need to remove
		notes.get(args.id).destroy();
	    //Add an event - remove
	    eventCoordinator.addEvent(args.id,'removed');			
	},
	changed : function(){
		//If no text entered, close window without saving
		if($.txtNote.value.trim().length===0){
			//If we are in edit mode, assume we are deleting if next removed
			if(isEdit){
				viewController.remove();
				$.noteWindow.close();
			}
			return;
		}
		
		if(isEdit){
			viewController.update();
		}else{
			viewController.create();
		}
		//Close the note window
		$.noteWindow.close();			
	},
	deleteRecord : function(){
		//Check that we are in edit mode
		if(isEdit){
			viewController.remove();		
		}
					
		//Close the note window
		$.noteWindow.close();
	}
};

$.txtNote.addEventListener('change',function(e){
	noteChanged = true;
});

$.noteWindow.addEventListener('close',function(e){
	if(noteChanged){
	//Persist Notes
	viewController.changed();
	}
	// update views from sql storage
	notes.fetch();		
});
