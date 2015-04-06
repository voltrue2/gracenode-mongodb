var gracenode = require('../gracenode');
var logger = gracenode.log.create('mongodb-collection');
var EventEmitter = require('events').EventEmitter;

var updateOptions = {
	safe: true,
	multi: true,
	upsert: false
};

module.exports = Collection;

function Collection(dbName, name, collection) {
	this._collection = collection;
	this._name = '[' +  dbName + '.' + name + ']';
}

Collection.prototype.applyOptions = function (find, options) {
	if (options) {
		if (options.sort) {
			find = find.sort(options.sort);
		}
		if (options.limit) {
			find = find.limit(options.limit);
		}
		if (options.offset) {
			find = find.skip(options.offset);
		}
	}
	return find;
};

Collection.prototype.aggregate = function (pipeline, cb) {
	
	logger.verbose('execute aggregate:', pipeline);

	this._collection.aggregate(pipeline, function (error, res) {
		if (error) {
			return cb(error);
		}
		logger.verbose('aggregate executed:', pipeline, res);
		cb(null, res);
	});
};

/*
query: <object>
fields: <array>
options: <object>
options {
	limit: <number>
}

return: stream

stream.on('data', callback)
stream.on('error', callback)
stream.on('close', callback)
*/
Collection.prototype.stream = function (query, fields, options) {
	
	logger.verbose('execute a find query for data stream:', query, fields, options);

	var find = this.applyOptions(this._collection.find(query, fields), options);

	var emitter = new EventEmitter();

	var stream = find.stream();

	// this is very useful when handling a very large batch of data
	stream.on('data', function (data) {
		setImmediate(function () {
	
			logger.verbose('streaming query:', query, '\ndata:', data);

			emitter.emit('data', data);
		});
	});

	stream.on('error', function (error) {
		setImmediate(function () {
	
			logger.error('streaming error', query, error);

			emitter.emit('error', error);
		});
	});

	stream.on('close', function () {
		setImmediate(function () {

			logger.verbose('streaming closed', query);

			emitter.emit('close');
		});
	});

	return emitter;
};

/*
query: <object>
fields: <array>
*/
Collection.prototype.findOne = function (query, fields, cb) {
	
	logger.verbose('execte a find query:', query, fields);

	this._collection.find(query, fields, function (error, cursor) {
		if (error) {
			return cb(error);
		}
		cursor.nextObject(function (error, doc) {
			if (error) {
				return cb(error);
			}
			logger.verbose('query exected:', query, fields);
			cb(null, doc);
		});
	});
};

/*
query: <object>
fields: <array>
pagenate: <object>
// pagenate is optional
pagenate: {
	limit: <int>
	offset: <int>
	sort: <object>,
	asArray: <bool>
}
*/
Collection.prototype.findMany = function (query, fields, pagenate, cb) {
	
	logger.verbose('execte a find query:', this._name, query, fields, pagenate);

	var that = this;

	this._collection.find(query, fields, function (error, cursor) {
		if (error) {
			return cb(error);
		}
		if (pagenate) {
			cursor = that.applyOptions(cursor, pagenate);
			
			logger.verbose('query executed:', that._name, query, fields, pagenate);

			if (pagenate.asArray) {
				return cursor.toArray(cb);	
			}

			return extractResults(cursor, cb);
		}
		// no pagenation
		extractResults(cursor, cb);
	});
};

/*
find records upto limit and iterate the same operation until there is no more record
- eachCallback will be call on each iteration. eachCallback will reveive found records and next callback as arguments
- cb will be called when the iteration completes
- sort is optional
*/ 
Collection.prototype.findEach = function (query, fields, limit, sort, eachCallback, cb) {
	var pagenate = {
		offset: 0,
		limit: limit
	};
	if (sort) {
		pagenate.sort = sort;
	}

	var that = this;

	var iterator = function (pagenate, finalCallback) {
		that.findMany(query, fields, pagenate, function (error, results) {
			if (error) {
				// we will call the final callback on error
				logger.error(error);
				return finalCallback(error);
			}

			// we exit if an empty array is found
			if (!results.length) {
				return finalCallback();
			}		
	
			var next;
			// check the found records
			if (results.length < limit) {
				// this is the last iteration
				next = finalCallback;				
			} else {
				// there is more
				pagenate.offset += limit;
				next = function () {
					iterator(pagenate, finalCallback);
				};
			}

			eachCallback(results, next);
		});
	};

	iterator(pagenate, cb);
};

Collection.prototype.distinct = function (key, filterQuery, options, cb) {
	
	logger.verbose('execute distinct on:', key, filterQuery, options);

	this._collection.distinct(key, filterQuery, options, function (error, doc) {
		if (error) {
			logger.error(error);
			return cb(error);
		}
		logger.verbose('executed distinct:', doc);
		cb(null, doc);
	});

};

/*
vlaues: { object to be stored }

to insert more than one document
values: [ {object to be sotred}, {object to be stored}, {...} ]

*/
Collection.prototype.insert = function (values, cb) {
	
	logger.verbose('inserting to mongodb:', this._name, values);
	
	var that = this;

	this._collection.insert(values, function (error, res) {
		if (error) {
			return cb(error);
		}
		cb(null, res);
	});
};

Collection.prototype.update = function (conditions, update, cb) {
	
	logger.verbose('updating document(s) in mongodb:', this._name, conditions, update);

	var that = this;

	this._collection.update(conditions, update, updateOptions, function (error, res) {
		if (error) {
			return cb(error);
		}
		cb(null, res);
	});
};

// multi: <boolean> false by default
Collection.prototype.upsert = function (conditions, update, multi, cb) {
	logger.verbose('upserting document(s) in mongodb:', this._name, conditions, update);
	var that = this;
	var options = {
		safe: true,
		multi: multi || false,
		upsert: true
	};
	this._collection.update(conditions, update, options, function (error, res) {
		if (error) {
			return cb(error);
		}
		cb(null, res);
	});
};

// incValue must NOT be zero or negative
// threshhold is the maximum value allowed and it must be bigger than incValue
Collection.prototype.increment = function (conditions, propName, incValue, threshhold, cb) {
	if (!incValue) {
		return cb(new Error('invalidIncrementvalue'));
	}
	if (incValue > threshhold) {
		return cb(new Error('incrementValueExceedsMax'));
	}
	logger.verbose('incrementing a property of document(s) in mongodb:', this._name, conditions, incValue, threshhold);
	var that = this;
	var update = { $inc: {} };
	update.$inc[propName] = incValue;
	conditions[propName] = {
		$lte: threshhold - incValue
	};
	this._collection.update(conditions, update, function (error, res) {
		if (error) {
			return cb(error);
		}
		if (!res) {
			return cb(new Error('blockedExceedMaxIncrement'));
		}
		cb(null, res);
	});
};

// decrementValue must NOT be zero or negative
// value = value - decrementValue where value >= decrementValue
// this operation will prevent the target value to go below 0
Collection.prototype.decrement = function (conditions, propName, decrementValue, cb) {
	
	if (!decrementValue) {
		return cb(new Error('invalidDecrementValue'));
	}

	logger.verbose('decrementing a property of document(s) in mongodb:', this._name, conditions, decrementValue);

	var that = this;
	var update = { $inc: {} };
	update.$inc[propName] = -1 * decrementValue;
	conditions[propName] = {
		$gte: decrementValue
	};

	this._collection.update(conditions, update, function (error, res) {
		if (error) {
			return cb(error);
		}
		if (!res) {
			return cb(new Error('blockedNegativeDecrement'));
		}
		cb(null, res);
	});

};

/*
values: { object to be deleted }

to delete more than one document
values: { keyToMatch: { '$in': [keys to match] } }
*/
Collection.prototype.delete = function (values, cb) {
	
	logger.verbose('deleting from mongodb:', this._name, values);

	var that = this;

	this._collection.remove(values, function (error) {
		if (error) {
			return cb(error);
		}
		cb();
	});
};

// you MUST provide _id for updating
// you can NOT save moe than one document at a time
Collection.prototype.save = function (values, cb) {

	logger.verbose('saving to mongodb:', this._name, values);

	var that = this;

	this._collection.save(values, function (error, res) {
		if (error) {
			return cb(error);
		}
		cb(null, res);
	});
};

Collection.prototype.findAndModify = function (query, sort, update, options, cb) {
	
	logger.verbose('find and modifying:', query, sort, update, options);

	this._collection.findAndModify(query, sort, update, options, function (error, result) {
		if (error) {
			return cb(error);
		}

		logger.info('find and modified:', query, sort, update, result);

		cb(null, result);	
	});
};

Collection.prototype.findAndRemove = function (query, sort, options, cb) {
	
	logger.verbose('find and removing:', query, sort, options);

	this._collection.findAndRemove(query, sort, options, function (error, result) {
		if (error) {
			return cb(error);
		}
		
		logger.info('find and removed:', query, sort, result);
		
		cb(null, result);
	});
};

Collection.prototype.ensureIndex = function (indexes, options, cb) {
	logger.verbose('adding index(es) to a document in mongodb:', this._name, indexes, options);
	var that = this;
	this._collection.ensureIndex(indexes, options, function (error, res) {
		if (error) {
			return cb(error);
		}
		cb(null, res);
	});
};

Collection.prototype.dropIndex = function (indexes, options, cb) {
	logger.verbose('removing index(es) to a document in mongodb:', this._name, indexes, options);
	var that = this;
	this._collection.dropIndex(indexes, options, function (error, res) {
		if (error) {
			return cb(error);
		}
		cb(null, res);
	});
};

Collection.prototype.count = function (query, cb) {
	logger.verbose('getting count for', this._name, 'with query:', query);
	var that = this;
	this._collection.count(query, function (error, res) {
		if (error) {
			return cb(error);
		}
		cb(null, res);
	});
};

// assigns map function and reduce function on the collection
Collection.prototype.mapReduce = function (mapFunc, reduceFunc, options, cb) {
	logger.verbose('assigning map function and reduce function to', this._name);
	if (typeof mapFunc !== 'function' || typeof reduceFunc !== 'function') {
		throw new Error('mapReduce expects argument 1 and 2 to be functions');
	}
	var that = this;
	this._collection.mapReduce(mapFunc, reduceFunc, options, function (error, results) {
		if (error) {
			return cb(error);
		}
		cb(null, results);
	});
};

function extractResults(cursor, cb) {
	var results = [];
	walk(results, cursor, cb);
}

function walk(results, cursor, cb) {
	cursor.nextObject(function (error, doc) {
		if (error) {
			return cb(error);
		}
		if (!doc) {
			// no more result > we consider done
			return cb(null, results);
		}
		results.push(doc);
		walk(results, cursor, cb);
	});
}
