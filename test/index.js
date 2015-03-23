var async = require('async');
var assert = require('assert');
var gn = require('gracenode');
var prefix = require('./prefix');

describe('mongodb module ->', function () {

	console.log('***Notice: This test requires gracenode installed in the same directory as this module.');
	console.log('***Notice: For this unit test, you need to have mongodb running at mongo://127.0.0.1:27017');

	var id = 1;

	var doc = {
		_id: id,
		key: 'test',
		value: [0, 1, 2],
		num: 0
	};

	var db;
	var collection;

	it('Can create connections', function (done) {
		
		gn.setConfigPath(prefix + 'gracenode-mongodb/test/configs/');
		gn.setConfigFiles(['mongodb.json']);
		gn.use('gracenode-mongodb');
		gn.setup(function (error) {
			assert.equal(error, undefined);
			db = gn.mongodb.create('test');
			collection = db.collection('unit-test');
			assert(collection);
			done();
		});

	});

	it('Can add an index to a collection', function (done) {
		collection.ensureIndex({ key: 1 }, null, function (error) {
			assert.equal(error, undefined);
			done();
		});
	});

	it('Can clean up the collection first', function (done) {
		collection.delete({ key: 'test' }, function (error) {
			assert.equal(error, undefined);
			done();
		})
	});

	it('Can insert a document and find it', function (done) {
		collection.insert(doc, function (error) {
			assert.equal(error, undefined);
			collection.findOne({ _id: id }, [], function (error, item) {
				assert.equal(error, undefined);
				assert.equal(item._id, doc._id);
				assert.equal(item.key, doc.key);
				assert.equal(item.value[0], doc.value[0]);
				assert.equal(item.value[1], doc.value[1]);
				assert.equal(item.value[2], doc.value[2]);
				assert.equal(item.num, 0);
				done();
			});
		});
	});

	it('Can update a document and find', function (done) {
		collection.update(doc, { $push: { value: 3 } }, function (error) {
			assert.equal(error, undefined);
			collection.findOne({ _id: id }, [], function (error, item) {
				assert.equal(error, undefined);
				assert.equal(item._id, doc._id);
				assert.equal(item.key, doc.key);
				assert.equal(item.value[0], doc.value[0]);
				assert.equal(item.value[1], doc.value[1]);
				assert.equal(item.value[2], doc.value[2]);
				assert.equal(item.value[3], 3);
				done();
			});
		});
	});
	
	it('Can increment', function (done) {
		collection.increment({ _id: id }, 'num', 10, 100, function (error) {
			assert.equal(error, undefined);
			collection.findOne({ _id: id }, [], function (error, item) {
				assert.equal(error, undefined);
				assert.equal(item.num, 10);
				done();
			});
		});
	});

	it('Can prevent increment if it exceeds the maximum allowed', function (done) {
		collection.increment({ _id: id }, 'num', 91, 100, function (error) {
			assert(error);
			collection.findOne({ _id: id }, [], function (error, item) {
				assert.equal(error, undefined);
				assert.equal(item.num, 10);
				done();
			});
		});
	});
	
	it('Can increment to maxmimun', function (done) {
		collection.increment({ _id: id }, 'num', 90, 100, function (error) {
			assert.equal(error, undefined);
			collection.findOne({ _id: id }, [], function (error, item) {
				assert.equal(error, undefined);
				assert.equal(item.num, 100);
				done();
			});
		});
	});
	
	it('Can decrement', function (done) {
		collection.decrement({ _id: id }, 'num', 10, function (error) {
			assert.equal(error, undefined);
			collection.findOne({ _id: id }, [], function (error, item) {
				assert.equal(error, undefined);
				assert.equal(item.num, 90);
				done();
			});
		});
	});

	it('Can prevent derecement if it goes below 0', function (done) {
		collection.decrement({ _id: id }, 'num', 100, function (error) {
			assert(error);
			collection.findOne({ _id: id }, [], function (error, item) {
				assert.equal(error, undefined);
				assert.equal(item.num, 90);
				done();
			});
		});
	});
	
	it('Can decrement to 0', function (done) {
		collection.decrement({ _id: id }, 'num', 90, function (error) {
			assert.equal(error, undefined);
			collection.findOne({ _id: id }, [], function (error, item) {
				assert.equal(error, undefined);
				assert.equal(item.num, 0);
				done();
			});
		});
	});

	it('Can upsert a document', function (done) {
		collection.upsert({ _id: 2, key: 'test', value: [4, 5, 6] }, { _id: 2, key: 'test', value: [4, 5, 6] }, false, function (error) {
			assert.equal(error, undefined);
			collection.findOne({ _id: 2 }, [], function (error, item) {
				assert.equal(error, undefined);
				assert.equal(item._id, 2);
				assert.equal(item.key, doc.key);
				assert.equal(item.value[0], 4);
				assert.equal(item.value[1], 5);
				assert.equal(item.value[2], 6);
				done();
			});
			
		});
	});

	it('Can save a document', function (done) {
		collection.save(doc, function (error) {
			assert.equal(error, undefined);
			collection.findOne({ _id: id }, [], function (error, item) {
				assert.equal(error, undefined);
				assert.equal(item._id, doc._id);
				assert.equal(item.key, doc.key);
				assert.equal(item.value[0], doc.value[0]);
				assert.equal(item.value[1], doc.value[1]);
				assert.equal(item.value[2], doc.value[2]);
				assert.equal(item.num, 0);
				done();
			});
		});
	});

	it('Can "findAndModify" a document', function (done) {
		collection.findAndModify({ _id: id }, ['_id'], { $set: { num: 5 } }, { new: true }, function (error, item) {
			assert.equal(error, undefined);
			assert.equal(item.num, 5);
			done();
		});
	});

	it('Can count documents', function (done) {
		collection.count({ key: 'test' }, function (error, count) {
			assert.equal(error, undefined);
			assert.equal(count, 2);
			done();
		});
	});

	it('Can "stream" 1 document', function (done) {
		var stream = collection.stream({ key: 'test' }, [], { limit: 1 });
		var list = [];
		stream.on('data', function (data) {
			list.push(data);
		});
		stream.on('error', function (error) {
			throw error;
		});
		stream.on('close', function () {
			assert.equal(list.length, 1);
			done();
		});
	});

	it('Can "stream" 1 document with offset of 1', function (done) {
		var stream = collection.stream({ key: 'test' }, [], { limit: 1, offset: 1 });
		var list = [];
		stream.on('data', function (data) {
			list.push(data);
		});
		stream.on('error', function (error) {
			throw error;
		});
		stream.on('close', function () {
			assert.equal(list.length, 1);
			assert.equal(list[0]._id, 2);
			done();
		});
	});

	it('Can "stream" 2 documents', function (done) {
		var stream = collection.stream({ key: 'test' }, [], { limit: 2 });
		var list = [];
		stream.on('data', function (data) {
			list.push(data);
		});
		stream.on('error', function (error) {
			throw error;
		});
		stream.on('close', function () {
			assert.equal(list.length, 2);
			done();
		});
	});

	it('Can "stream" 2 sorted documents', function (done) {
		var stream = collection.stream({ key: 'test' }, [], { limit: 2, sort: { _id: 1 } });
		var list = [];
		stream.on('data', function (data) {
			list.push(data);
			assert.equal(list.length, data._id);
		});
		stream.on('error', function (error) {
			throw error;
		});
		stream.on('close', function () {
			assert.equal(list.length, 2);
			done();
		});
	});

	it('Can "findMay" documents', function (done) {
		collection.findMany({ key: 'test' }, [], { limit: 2, offset: 0 }, function (error, list) {
			assert.equal(error, undefined);
			assert.equal(list.length, 2);
			done();
		});
	});

	it('Can "findEach" documents', function (done) {
		var list = [];
		collection.findEach({ key: 'test' }, [], 1, null, function (item, next) {
			list.push(item);
			next();
		},
		function (error) {
			assert.equal(error, undefined);
			assert.equal(list.length, 2);
			done();
		});
	});

	it('Can execute aggregate on documents', function (done) {
		var counter = 0;
		
		var docInserter = function (next) {
			var doc = {
				key: 'test',
				shared: 100,
				id: Date.now(),
				value: 10 
			};
			collection.insert(doc, function (error) {
				counter++;
				next(error);
			});
		};
	 
		var aggregate = function (next) {
			collection.aggregate([
				{ $match: { key: 'test', shared: 100 } },
				{ $group: { _id: '$id', valueAvg: { $avg: '$value' } } }
			],
			function (error, res) {
				for (var i = 0, len = res.length; i < len; i++) {
					assert.equal(res[i].valueAvg, 10);
				}
				done();
			});
		}; 

		var tasks = [
			docInserter,
			docInserter,
			docInserter,
			docInserter,
		];

		async.series(tasks, aggregate);

	});

	it('Can delete documents', function (done) {
		collection.delete({ key: 'test' }, function (error) {
			assert.equal(error, undefined);
			done();
		});
	});

	it('Can remove an index', function (done) {
		collection.dropIndex({ key: 1 }, function (error) {
			assert.equal(error, undefined);
			done();
		});
	})

	it('Can get a list of all collection details in a database', function (done) {
		db.collections(function (error, list) {
			assert.equal(error, null);
			assert(list);
			done();
		});
	});
	
	it('Can get a list of all collection names in a database', function (done) {
		db.collectionNames(function (error, list) {
			assert.equal(error, null);
			assert(list);
			done();
		});
	});

	it('Can drop a collection', function (done) {
		db.drop('unit-test', function (error, reply) {
			assert.equal(error, null);
			assert(reply);
			done();
		});
	});

});
