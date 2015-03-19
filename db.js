var gn = require('../gracenode');
var logger = gn.log.create('mongodb-db');
var Collection = require('./collection');

function Db(name, db) {
	this._name = name;
	this._db = db;
}

Db.prototype.collection = function (name) {
	return new Collection(this._name, name, this._db.collection(name));
};

Db.prototype.collectionNames = function (cb) {
	this._db.collectionNames(function (error, list) {
		if (error) {
			logger.error(error);
			return cb(error);
		}
		logger.verbose(list);
		cb(null, list);
	});
};

// detailed collection metadata
Db.prototype.collections = function (cb) {
	this._db.collections(function (error, list) {
		if (error) {
			logger.error(error);
			return cb(error);
		}
		logger.verbose(list);
		cb(null, list);
	});
};

module.exports = Db;
