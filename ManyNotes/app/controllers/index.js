var IDConnector = require('id-connector'),
	sync = require('sync'),
	eventCoordinator = require('event-coordinator');

//Shortcut our global reference
var notes = Alloy.Collections.note;
// fetch existing tables from storage
notes && notes.fetch();

var viewController = {
	addNew : function(){
		if(OS_IOS){
			$.index.openWindow(Alloy.createController("note").getView());
		}else{
			Alloy.createController("note").getView().open();
		}
	},
	sync : function(){
		
		function connectThenSync(){
			if(!Ti.Network.online){
				alert("A network connection is needed to sync your notes. Please check your network connection and try again.");
				return;
			}	
			IDConnector.connect(function(e){
				sync(function(r){
 					if(r.success){
 						alert('notes synchronized successfully');
 					}else{
 						alert('Oops error synchronizing due to ' + r.message);
 					}
				});					
			});				
		}
		
		if(IDConnector.hasConnectedBefore()){
			connectThenSync();
			return;
		}
	  	var dialog = Ti.UI.createAlertDialog({
	    	buttonNames: ['No', 'Yes'],
	    	title: 'Information',
	    	message: 'To syncrhonize your notes, we first required you to login. Would you likst to login now?'	   
	  	});
	  	dialog.addEventListener('click', function(e){
	    	if (e.index === 1){
	      		connectThenSync();
	    	}
	  	});
	  	dialog.show();
	}, 
	deleteRecord : function(e){
		//Remove note
		notes.get(e.rowData.noteid).destroy();
	    //Add an event - remove
	    eventCoordinator.addEvent(e.rowData.noteID,'remove');		
	},
	viewNote : function(e){
		var model = notes.get(e.rowData.noteID).toJSON();
		if(OS_IOS){
			$.index.openWindow(Alloy.createController("note",model).getView()); 	
		}else{
			Alloy.createController("note",model).getView().open();
		}			
	}
};

$.index.open();
