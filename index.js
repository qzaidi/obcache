"use strict";
/*jslint undef: true */

var lru = require('./lru');
var sigmund = require('sigmund');
var log = require('debug')('obcache');

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
   *  },
   *  maxAge: 10000 // lru max age
   *  ...
   * }
   *
   * ```
   *
   **/
  Create: function(options) {
    var nextResetTime;
    var anonFnId = 0;

    var store = this.store = lru.init(options);
    this.stats = { hit: 0, miss: 0, reset: 0};

    if (options && options.reset) {
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
      var stats = this.stats;
      var fname = (fn.name || '_' ) + anonFnId++;

      log('wrapping function ' + fname);

      return function() {
        var self = thisobj || this;
        var args = Array.prototype.slice.apply(arguments);
        var callback = args.pop();
        var key,data;

        if (typeof callback !== 'function') {
          throw new Error('last argument to ' + fname + ' should be a function');
        }

        if (nextResetTime && (nextResetTime < Date.now())) {
          log('resetting cache ' + nextResetTime);
          store.reset();
          stats.reset++;
          nextResetTime += options.reset.interval;
        }

        key = keygen(fname,args);

        log('fetching from cache ' + key);
        data = store.get(key, onget);

        function onget(err, data) {
          if (!err && data) {
            log('cache hit' + key);
            process.nextTick(function() {
              callback.call(self,err,data); // found in cache
            });
            stats.hit++;
            return;
          }

          log('cache miss ' + key);
          args.push(function(err,res) {
            if (!err) {
              log('saving key ' + key);
              store.set(key,res);
            }

            callback.call(self,err,res);
          });

          fn.apply(self,args);
          return stats.miss++;
        }

      };
    };

  },

  debug: require('./debug')
};

module.exports = cache;
