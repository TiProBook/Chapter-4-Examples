
// Create the Note Collection, this will be used to store all of our notes
Alloy.Collections.note = Alloy.createCollection('note');
Alloy.Collections.eventStore = Alloy.createCollection('eventStore');
Alloy.Collections.syncTransactionLog = Alloy.createCollection('syncTranactionLog');

//Add Azure Application Information
//This is where you would put your azure mobile services name
Alloy.CFG.azureAppInfo = {
	name :'<---APP NAME---->'
};

//Require our Azure Mobile Services Native Module
var azure = require('com.winwire.azuremobileservices');
//Add the module to Alloy.Globals so we can use it anywhere in the application
Alloy.Globals.azure = new azure.AzureMobileServices();
//Set the Azure Mobile Services Name, this only needs to be done once
Alloy.Globals.azure.setAppName(Alloy.CFG.azureAppInfo.name);