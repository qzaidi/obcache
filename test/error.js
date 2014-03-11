"use strict";

var obcache = require('../index');
var debug = require('../debug');

var cache = debug.register(new obcache.Create({ reset: { interval: 2000, firstReset: new Date(Date.now() + 1000) } }));

(function() {
  var original = function (id,cb) {
    process.nextTick(function() {
      cb(new obcache.Error(),id);
    });
  };
  var wrapped = cache.wrap(original);

  original(5,console.log);
  wrapped(5,console.log);

  // this should find it in cache
  process.nextTick(function() { 
    wrapped(5,console.log)
    debug.log();
  });

  setTimeout(function() {
    wrapped(5,console.log);
  },5000);

  setTimeout(function() {
    debug.log();
  },10000);
}());
