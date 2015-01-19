var mongodb = require('mongodb');
var async = require('async');
var gracenode = require('../gracenode');
var logger = gracenode.log.create('mongodb');
var Db = require('./db');

var config = null;
var pools = {};

/*
"mongodb": {
	"name of your choice": {
		"host": "host name or ip address" or an array of hosts,
		"port": port number or an array of port numbers,
		"database": "database name",
		"poolSize": <optional>, // default is 5
		"user": "db user", // optional
		"password": "db password" // optional,
		"replicaSet": "target replicaset name" optional
		"readPreference": "read preference (secondary etc)" optional
	} {...}
}
*/

module.exports.readConfig = function (configIn) {
	if (!configIn) {
		return new Error('invalid configurations given:\n' + JSON.stringify(configIn));
	}
	config = configIn;
};

module.exports.setup = function (cb) {
	var keys = Object.keys(config);
	var client = mongodb.MongoClient;
	async.eachSeries(keys, function (name, next) {
		var configData = config[name];
		var url = 'mongodb://';
		var glue = '?';
		
		// use user and password
		if (configData.user && configData.password) {
			url += configData.user + ':' + configData.password + '@';
		}

		if (Array.isArray(configData.host)) {
			// connecting to multiple mongo
			var isPortArray = Array.isArray(configData.port);
			for (var i = 0, len = configData.host.length; i < len; i++) {
				url += configData.host[i] + ((isPortArray && configData.port[i]) ? ':' + configData.port[i] : '');
				var end = ',';
				if (i === len - 1) {
					end = '/';
				}
				url += end;
			}
			url += configData.database;
		} else {
			// connecting to a single mongo
			url += configData.host + ':' + configData.port + '/' + configData.database;
		}

		if (configData.poolSize) {
			url += '?maxPoolSize=' + configData.poolSize;
		}
		
		if (url.indexOf('?') !== -1) {
			glue = '&';
		}

		if (configData.replicaSet) {
			url += glue + 'replicaSet=' + configData.replicaSet;
		}
		
		if (url.indexOf('?') !== -1) {
			glue = '&';
		}
	
		if (configData.readPreference) {
			url += glue + 'readPreference=' + configData.readPreference;
		}
	
		logger.verbose('creating connection pool to mongodb [' +  configData.database + ']:', url);

		client.connect(url, function (error, db) {
			if (error) {
				return cb(error);
			}
			pools[name] = { db: db, database: configData.database };
			
			logger.info('connection pool to mongodb created [' +  configData.database + ']');
			
			next();
		});
	},
	function () {
		// register graceful exit cleaner
		gracenode.registerShutdownTask('mongodb', function (done) {
			var names = Object.keys(pools);
			async.eachSeries(names, function (name, next) {
				pools[name].db.close(function (error) {
					if (error) {
						logger.error('failed to close connection to mongodb [' + pools[name].database + ']', error);
					}
					logger.info('connection pool to mongodb closed [' + pools[name].database + ']');
					delete pools[name];
					next();
				});
			}, done);
		});
		// all is done
		cb();
	});
};

module.exports.create = function (name) {
	if (pools[name]) {
		return new Db(pools[name].database, pools[name].db);
	}
	return null;
};
