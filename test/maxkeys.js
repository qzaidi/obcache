"use strict";

var obcache = require('../index');
var debug = require('../debug');
var cache = debug.register(new obcache.Create({ max: 20, 
                                                dispose: console.log.bind('deposed '), 
                                                queueEnabled: true, 
                                                reset: { interval: 2000, firstReset: new Date(Date.now() + 1000) } 
                                              }));

(function() {
  var original = function (id,cb) {
    console.log('original called for ' + id);
    process.nextTick(function() {
      var v = JSON.stringify({ p: id });
      cb(null,v);
    });
  };
  var wrapped = cache.wrap(original);

  function run() {
    for (var i=0; i < 100; i++) {
      wrapped(i,console.log);
    }
    process.nextTick(function() {
      debug.log();
    });

  }

  run();

  process.nextTick(run);


}());
