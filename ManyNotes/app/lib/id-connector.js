//Add authenticate method to Alloy.Globals so we can authenticate anywhere within the app

var authenticationClients = ['Facebook', 'Twitter'];

if (OS_IOS) {
    authenticationClients.push('Cancel');
}

var providerHelpers = {
	reminder : function(provider){
		Ti.App.Properties.setString('OAUTH_PROVIDER',provider);
	},
	forget :function(){
		Ti.App.Properties.removeProperty('OAUTH_PROVIDER');
	},
	find : function(){
		if(!Ti.App.Properties.hasProperty('OAUTH_PROVIDER')){
			return null;
		}
		return Ti.App.Properties.getString('OAUTH_PROVIDER');
	}	
};

exports.hasConnectedBefore = function(){
	return (providerHelpers.find() !== null);
};
    
exports.connect = function(callback){

	function performAutho(provider){
        Alloy.Globals.azure.authorizeClient(provider, function(data) {
        	if(!data){
        		providerHelpers.forget();
        	}
			callback(data);
        });		
	};
	
	if(providerHelpers.find()!=null){
		performAutho(providerHelpers.find());
		return;
	}
	
    var dialog = Ti.UI.createOptionDialog({
        options : authenticationClients, title : 'Select a login'
    });

    dialog.addEventListener('click', function(evt) {        
        if (evt.index >= 0 && evt.index <= 1) {
            var authorizeClient = authenticationClients[evt.index].replace(/ /g, '').toLowerCase();
            providerHelpers.reminder(authorizeClient);
			performAutho(authorizeClient);
        }else{        	
          	providerHelpers.forget();        	
            dialog.hide();
            callback(false);
        }
    });
    
    dialog.show();		
};
