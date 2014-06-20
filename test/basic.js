"use strict";

var obcache = require('../index');
var debug = require('../debug');

var cache = debug.register(new obcache.Create({ max: 1000, maxAge: 300000, reset: { interval: 2000, firstReset: new Date(Date.now() + 1000) } }));

(function() {
  var original = function (id,cb) {
    process.nextTick(function() {
      var v = JSON.stringify({ p: id });
      cb(null,v);
    });
  };
  var wrapped = cache.wrap(original);
  cache.warmup(wrapped,10,'iamwarmedupnow');

  original(5,console.log);
  wrapped(5,console.log);
  wrapped(10,console.log);

  // this should find it in cache
  process.nextTick(function() { 
    wrapped(5,console.log)
    cache.invalidate(wrapped,10);
    debug.log();
  });

  setTimeout(function() {
    wrapped(5,console.log);
    wrapped(10,console.log);
  },5000);


  setTimeout(function() {
    debug.log();
  },10000);
}());
