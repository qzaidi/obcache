"use strict";

/* 
 * This test only demonstrates the overhead of the cache.
 */

var obcache = require('../index');
var cache = new obcache.Create();
var rcache = new obcache.Create({ redis: { port: 6379 } });
var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();

(function() {
  var original = function (id,cb) {
    process.nextTick(function() {
      cb(null,id);
    });
  };
  var wrapped = cache.wrap(original);
  var rwrapped = rcache.wrap(original);

  suite.add('uncached', function() {
    original(5,function(){});
  })
  .add('cached', function() {
    wrapped(5,function() {});
  })
  .add('redis', function() {
    wrapped(5,function() {});
  })
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').pluck('name'));
  })
  .run({ async: true });
}());
