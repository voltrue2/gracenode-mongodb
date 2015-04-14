# MongoDB Module

MongoDB module for gracenode framework

This is designed to function within gracenode framework.

## How to include it in my project

To add this package as your gracenode module, add the following to your package.json:

```
"dependencies": {
        "gracenode": "",
        "gracenode-mongodb": ""
}
```

To use this module in your application, add the following to your gracenode bootstrap code:

```
var gracenode = require('gracenode');
// this tells gracenode to load the module
gracenode.use('gracenode-mongodb');
```

To access the module:

```
// the prefix gracenode- will be removed automatically
gracenode.mongodb
```


Access
<pre>
gracenode.mongodb
</pre>

Configurations
```javascript
"modules": {
	"gracenode-mongodb": {
		"configNameOfYourChoice": {
			"host": "host name or IP address" or an array of hosts,
			"port": <port number> or an array of ports,
			"database": "database name",
			"poolSize": <optional>,
			"user": <optional>,
			"password": <optional>,
			"replicaSet": <optional>,
			"readPreference": "<optional>"
		}{...}
	}
}
```

##### .create(configName [string])

Returns an instance of Db class

#### Db class

##### .collection(collectionName [string])

Returns an instance of Collection class

##### .collectionNames(callback [function])

Returns a list of all collection names in a database.

##### .collections(callback [function])

Returns detailed collection metadata in a database.

##### .drop(collectionName [string], callback [function])

Drops an entire collection.

### Collection class

##### .stream(query [object], fields [array], options [object])

This is very useful when reading a very large data set

```javascript
var myDb = gracenode.mongodb.create('myDb');
var myCol = myDb.collection('myCol');
var stream = myCol.stream({ age: { $gte: 20 } }, ['_id', 'name', 'age'], { limit: 100 });
stream.on('data', function (data) {
	// read one record at a time up to limit (100)
});
stream.on('error', function (error) {
	// error
});
stream.on('close', function () {
	// all done
});
```

##### .findOne(query [object], fields [array], callback [function])

```javascript
var myDb = gracenode.mongodb.create('myDb');
var myCol = myDb.collection('myCol');
myCol.findOne({ _id: 123456 }, ['_id', 'name'], function (error, doc) {
	// do something
});
```

##### .findMany(query [object], feilds [array], pagenate [object], callback [function])

pagenate:

```
{
	limit: <int>
	offset: <int>
	sort: <object>
	toArray: <boolean>
}
```

**NOTE:** If `toArray` in `pagenate` is `true`, it will use `.toArray()` to read the data.

```javascript
var myDb = gracenode.mongodb.create('myDb');
var myCol = myDb.collection('myCol');
// query upto 10 documents and offset from 5th record matched. Plus sort the records by 'age'
myCol.findMany({ _id: 123456 }, ['_id', 'name'], { limit: 10, offset: 5, sort: { age: -1 } }, function (error, doc) {
	// do something
});
```

##### .findEach(query [object], fields [array], limit [integer], sort [*object], eachCallback [function], finalCallback [function])

Executes findMany with the given limit and auto-iterate until it finds no more record. Each iteration will call eachCallback.

When it reaches the end, it will call finalCallback.

This operation can be very expensive.

Example:

```javascript
var myDb = gracenode.mongodb.create('myDb');
var myCol = gracenode.mongodb.collection('myCol');
myCol.findEach({ _id: /name/ }, ['age'], { sort: { age: -1 } }, function (list, next) {
	// do something with list
	next();
},
function (error) {
	// done
});
```

##### .ensureIndex(indexes [object], options [object], callback [function])

##### .insert(values [object], callback [function])

##### .update(conditions [object], updates [object], callback [function])

**NOTE**: safe and multi are always true and upsert is false)

##### .upsert(conditions [object], updates [object], multi [boolean], callback [function])

##### .increment(conditions [object], propertyName [string], incrementBy [number], maxNumAllowed [number], callback [function])

Does NOT allow the target property to exceed maximum number given

##### .decrement(conditions [object], propertyName [string], decrementBy [number], callback [function])

Does NOT allow the target property to fall below 0

##### .save(values [object], callback [function])

##### .delete(values [object], callback [function])

##### .findAndModify(query [object], sort [object], update [object], options [object], callback [function])

##### .count(object query, callback [function])

```javascript
var mongo = gracenode.mongodb.create('mongoDatabase').collection('cookieJar');
mongo.count({ type: 'cookies' }, function (error, count) {
	console.log('There are', count, 'cookies in the jar');
});
```

##### .mapReduce(map [function], reduce [function], options [object], callback [function])

<a href="http://docs.mongodb.org/manual/tutorial/map-reduce-examples/">MongoDB Map Reduce Example</a>

##### .aggregate(pipeline [array], callback [function])
