
= Cached =

Object caching module node.js

== Usage ==

var obcache = require('obcache');

// create a cache with max 10000 items and a TTL of 300 seconds
var cache = new obcache.Create({ max: 10000, maxAge: 300 });

Then wrap your original function like this

var wrapper = cache.wrap(original);

Now call the wrapper as you would call the original

wrapper(arg1,arg2...argn,function(err,res) {
  if (!err) {
     // do something with res
  }
});



