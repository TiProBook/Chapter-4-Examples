exports.definition = {
	config: {
		columns: {
		    "modifyID": "real"
		},
		adapter: {
			"type": "sql",
			"idAttribute": "modifyID",
			"collection_name": "syncTranactionLog"
		}
	}
};