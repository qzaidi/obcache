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

  for (var i=0; i < 40; i++) {
    wrapped(i,console.log);
  }

  process.nextTick(function() {
    debug.log();
  });

}());
