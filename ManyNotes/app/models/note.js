exports.definition = {
	config: {
		columns: {
		    "id": "text primary key",
		    "notetext": "text",
		    "modifyid": "real"
		},
		adapter: {
			"type": "sql",
			"idAttribute": "id",
			"collection_name": "note"
		}
	},
	extendModel: function(Model) {
		_.extend(Model.prototype, {
			createNote : function(text){
     			 this.set({
                        id : Ti.Platform.createUUID(),
                        notetext : text,
                        modifyid : new Date().getTime()
                 });
                 this.save();				
			},
			updateNote : function(text){
		     	this.set({
		     		 notetext : text,
                     modifyid : new Date().getTime()
                });
                this.save();				
			}
		});

		return Model;
	},
	extendCollection: function(Collection) {
		_.extend(Collection.prototype, {
			noteExists : function(id){
		        var collection = this;	
	            var sql = "SELECT id FROM " + collection.config.adapter.collection_name + " WHERE id=?" ;
	            var db = Ti.Database.open(collection.config.adapter.db_name);
	            var dbRecords = db.execute(sql,id);
	            var recordCount = dbRecords.getRowCount();
	            dbRecords.close();
	            db.close();
	     		return (recordCount>0);			
			}			
		});
		return Collection;
	}
};