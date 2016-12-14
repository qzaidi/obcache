ObCache
=======

ObCache is an Object caching module for node.js. Objects are cached in memory, via a backing store.

Currently 2 stores are supported.

 - Memory
 - Redis

Use Redis for persistent caches.

Optionally use snappy/deflate compression. To enable compression pass compressType: 'snappy'/'zlib' in cache options.

Usage
------

```
var obcache = require('obcache');

// create a cache with max 10000 items and a TTL of 300 seconds
var cache = new obcache.Create({ max: 10000, maxAge: 300});

```

The max parameter above indicates the maximum keys that can be cached. If your values are variable sized and you want a finer control
on cache memory usage, specify maxSize instead. If no max is specified, max keys supported are Inifinity, and size
of the cache will be governed by maxAge alone. compressType parameter will enable compression if set to snappy/zlib.

Then wrap your original function like this

```
var wrapper = cache.wrap(original);
```

Now call the wrapper as you would call the original

```
wrapper(arg1,arg2...argn,function(err,res) {
  if (!err) {
     // do something with res
  }
});
```

API
---

### obcache.Create
Creates a new cache and returns it

### cache.wrap 
Wraps a given function and returns a cached version of it.
Functions to be wrapped must have a callback function as the last argument. The callback function is expected to recieve 2 arguments - err and data. data gets stored in the cache.
Sometimes, you may want to use a different value of this inside the caller function. cache.wrap has an optional second argument which becomes the this object when calling the original function.

The first n-1 arguments are used to create the key. Subsequently, when the wrapped function is called with the same n arguments, it would lookup the key in LRU, and if found, call the callback with the associated data. It is expected that the callback will never modified the returned data, as any modifications of the original will change the object in cache. 

### cache.warmup
Warmup the cache.

The first argument is the cache function, and the last argument is the value. 

E.g.

```
var myfunc = cache.wrap(function(q, r, cb) {
  ...
});

cache.warmup(myfunc, q, r, 123);

```

### cache.invalidate

Invalidate the cache contents. Subsequent calls will trigger a new fetch.
```
cache.invalidate(myfunc,q,r);
```

### cache.debug

The debug interface exposes 2 functions, register and view. register is used to register a cache for debugging. view is a connect middleware that can be used to view all the registered caches and their data/keys.
