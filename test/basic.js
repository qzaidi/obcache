"use strict";

var obcache = require('../index');

var cache = new obcache.Create();

(function() {
  var original = function (id,cb) {
    process.nextTick(function() {
      cb(null,id);
    });
  };
  var wrapped = cache.wrap(original);

  original(5,console.log);
  wrapped(5,console.log);

  // this should find it in cache
  process.nextTick(function() { 
    wrapped(5,console.log)
  });
}());
