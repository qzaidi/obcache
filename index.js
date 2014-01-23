"use strict";

var LRU = require('lru-cache');
var sigmund = require('sigmund');

function keygen(name,args) {
  var input = { f: name, a: args };
  return sigmund(input,6);
}

var cache = {

  /**
   * ## cache.Create
   *
   * Constructor
   *
   * Creates a new instance with its own LRU Cache
   *
   * @param {Object} Cache Options
   * ```js
   * {
   *  reset: {
   *    interval: 10000, // msec reset interval
   *    firstReset: 1000, // time for first reset (optional)
   *  }
   *  maxAge: 10000 // lru max age
   *  ...
   * }
   *
   * ```
   *
   **/
  Create: function(options) {
    var lru = LRU(options);
    var anonFnId = 0;
    this.lru = lru;
    this.stats = { hit: 0, miss: 0, reset: 0};
    var nextResetTime;

    if (options.reset) {
      nextResetTime = options.reset.firstReset || Date.now() + options.reset.interval;
    }
    /**
    *
    * ## cache.wrap
    *
    * @param {Function} function to be wrapped
    * @param {Object} this object for the function being wrapped. Optional
    * @return {Function} Wrapped function that is cache aware
    *
    * Workhorse
    *
    * Given a function, generates a cache aware version of it.
    * The given function must have a callback as its last argument
    *
    **/
    this.wrap = function (fn,thisobj) {
      var lru = this.lru;
      var stats = this.stats;
      var fname = fn.name || anonFnId++;

      return function() {
        var self = thisobj || this;
        var args = Array.prototype.slice.apply(arguments);
        var callback = args.pop();
        var key,data;

        if (typeof callback !== 'function') {
          throw new Error('last argument to ' + fname + ' should be a function');
        }

        if (nextResetTime && (nextResetTime < Date.now())) {
          console.log('resetting cache ' + nextResetTime);
          lru.reset();
          stats.reset++;
          nextResetTime += options.reset.interval;
        }

        key = keygen(fname,args);

        data = lru.get(key);
        // while LRU is sync - we need to support redis like stores in future, which won't be sync, 
        // and hence this function.
        (function(err, data) {
          if (!err && data) {
            process.nextTick(function() {
              callback.call(self,err,data); // found in cache
            });
            stats.hit++;
            return;
          }

          args.push(function(err,res) {
            if (!err) { 
              lru.set(key,res);
            }
            callback.call(self,err,res);
          });

          fn.apply(self,args);
          return stats.miss++;
        }(null,data));
      };
    };

    // re-export keys and values
    this.keys = this.lru.keys.bind(this.lru);
    this.values = this.lru.values.bind(this.lru);
  },

  debug: require('./debug')
};

module.exports = cache;
