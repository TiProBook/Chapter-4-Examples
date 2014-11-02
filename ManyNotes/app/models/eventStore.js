
exports.definition = {
	config: {
		columns: {
		    "id": "text primary key",
		    "noteid": "text",
		    "eventtype": "text",
		    "modifyid": "real"
		},
		adapter: {
			"type": "sql",
			"idAttribute": "id",
			"collection_name": "eventStore"
		}
	},
	extendCollection: function(Collection) {
		_.extend(Collection.prototype, {
            initialize: function () {
                //*** Default sort field.  Replace with your own default.
                this.sortField = "modifyid";
                //*** Default sort direction
                this.sortDirection = "DESC";
            },
            //*** Use setSortField to specify field and direction before calling sort method
            setSortField: function (field, direction) {
                this.sortField = field;
                this.sortDirection = direction;
            },
 
            comparator: function(collection) {
                return collection.get(this.sortField);
            },
            //*** Override sortBy to allow sort on any field, either direction 
            sortBy: function (iterator, context) {
                var obj = this.models;
                var direction = this.sortDirection;
 
                return _.pluck(_.map(obj, function (value, index, list) {
                    return {
                        value: value,
                        index: index,
                        criteria: iterator.call(context, value, index, list)
                    };
                }).sort(function (left, right) {
                    // swap a and b for reverse sort
                    var a = direction === "ASC" ? left.criteria : right.criteria;
                    var b = direction === "ASC" ? right.criteria : left.criteria;
 
                    if (a !== b) {
                        if (a > b || a === void 0) return 1;
                        if (a < b || b === void 0) return -1;
                    }
                    return left.index < right.index ? -1 : 1;
                }), 'value');
            },                        			
	        removeAll : function() {
	            var collection = this;	
	            var sql = "DELETE FROM " + collection.config.adapter.collection_name;
	            var db = Ti.Database.open(collection.config.adapter.db_name);
	            db.execute(sql);
	            db.close();
	            collection.trigger('sync');
	        },
	        removeEventsForNote : function(noteID) {
	            var collection = this;	
	            var sql = "DELETE FROM " + collection.config.adapter.collection_name + " WHERE noteid=?" ;
	            var db = Ti.Database.open(collection.config.adapter.db_name);
	            db.execute(sql,noteID);
	            db.close();
	     		collection.trigger('sync');
	        },		        
	        noteHasEventType : function(noteID,eventType) {
	            var collection = this;	
	            var sql = "SELECT id FROM " + collection.config.adapter.collection_name + " WHERE noteid=? and eventtype=?" ;
	            var db = Ti.Database.open(collection.config.adapter.db_name);
	            var dbRecords = db.execute(sql,noteID,eventType);
	            var recordCount = dbRecords.getRowCount();
	            dbRecords.close();
	            db.close();
	     		return (recordCount>0);
	        }	        			
		});

		return Collection;
	}
};
