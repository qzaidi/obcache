"use strict";
/*jslint undef: true */

var lru = require('./lru');
var LRU = require('lru-cache');
var sigmund = require('sigmund');
var log = require('debug')('obcache');
var util = require('util');
var compression = require('./compression');

function keygen(name,args, opts) {
  var input = { f: name, a: args};
  if(Object.keys(opts).length !== 0) input.o = opts;
  return sigmund(input,8);
}

function CacheError() {
  Error.captureStackTrace(this, CacheError);
}

function pack(obj, cacheObj, cb){
  try {
    var data = JSON.stringify(obj);
    if (cacheObj.compressType) data = compression[cacheObj.compressType].pack(data);
    return cb(null, data);
  } catch (e) {
    return cb(e);
  }
}

function unpack(str, cacheObj, cb){
  var data;
  try {
    if (cacheObj.compressType) {
      str = compression[cacheObj.compressType].unpack(str);
    }
    data = str.toString();
    data = JSON.parse(data);
    return cb(null, data);
  } catch (e) {
    return cb(e);
  }
}

util.inherits(CacheError,Error);


var cache = {
  
  Error: CacheError,

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
    var store;

    if (options && options.redis) {
      log('creating a redis cache');
      store = require('./redis').init(options);
    } else {
      store = require('./lru').init(options);
    }

    this.store = store;

    this.pending = options.queueEnabled?{}:false;

    this.stats = { hit: 0, miss: 0, reset: 0, pending: 0};

    if (options.compressType &&
      compression.SUPPORTED_TYPES.indexOf(options.compressType) !== -1 &&
      compression[options.compressType]) {
      this.compressType = options.compressType;
    }

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
      var cachedfunc;
      var pending = this.pending;
      var cacheObj = this;

      log('wrapping function ' + fname);

      cachedfunc = function() {
        var self = thisobj || this;
        var keyOpts = {};
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
          // we aren't resetting pending here, don't think we need to.
        }

        // keyOpts will be used in key generation logic
        // use minified key names here like ct for compression type
        if (cacheObj.compressType) keyOpts.ct = cacheObj.compressType;

        key = keygen(fname,args, keyOpts);

        log('fetching from cache ' + key);
        data = store.get(key, processValue);

        function processValue(e,r){
          if(e) onget(e,r);
          unpack(r, cacheObj, onget);
        }

        function onget(err, data) {
          var v;

          if (!err && data != undefined) {
            log('cache hit' + key);

            process.nextTick(function() {
              callback.call(self,err,data); // found in cache
            });
            stats.hit++;
            return;
          }

          log('cache miss ' + key);

          if (pending) {
            v = pending[key];
            if (v == undefined) {
              pending[key] = [log];
              stats.pending++;
            } else {
              log('fetch is pending, queuing up for ' + key);
              return v.push(callback);
            }
          }

          // this gets called when the original function returns.
          // we will first save the result in cache, and then 
          // call the callback
          args.push(function(err,res) {

            if(err) processPacked(err, res);

            pack(res, cacheObj, processPacked);

            function processPacked(e, r){

              err = err || e;

              if (!err) {
                log('saving key ' + key);
                store.set(key,r);
              }

              if (err && (err instanceof CacheError)) {
                log('skipping from cache, overwriting error');
                err = undefined;
              }
              callback.call(self,err,res);

              // call any remaining callbacks

              if (pending) {
                v = pending[key];
                if ( v != undefined && v.length) {
                  log('fetch completed, processing queue for ' + key);
                  // by doing this in next tick, we are just ensuring correctness of pending stats,
                  // else the callback will see incorrect value of pending.
                  // this also ensures that the callbacks are called in the correct order, with the
                  // first caller getting the value first instead of last.
                  process.nextTick(function() {
                    v.forEach(function(x) { x.call(self,err,res); });
                  });
                  log('pending queue cleared for ' + key);
                  stats.pending--;
                  delete pending[key];
                }
              }
            }
          });

          fn.apply(self,args);
          return stats.miss++;
        }

      };
      log('created new cache function with name ' + fname + JSON.stringify(options));
      cachedfunc.cacheName = fname;
      return cachedfunc;
    };


    /* first argument is the function, last is the value */
    this.warmup = function() {
      var args = Array.prototype.slice.apply(arguments);
      var func = args.shift();
      var res = args.pop();
      var fname,key;

      if (!func || typeof(func) != 'function' || !func.cacheName) {
        throw new Error('Not a obcache function');
      }

      fname = func.cacheName;
      key = keygen(fname,args);
      log('warming up cache for ' + fname + ' with key ' + key);
      store.set(key,res);
    };

    this.invalidate = function() {
      var args = Array.prototype.slice.apply(arguments);
      var func = args.shift();
      var fname,key;

      if (!func || typeof(func) != 'function' || !func.cacheName) {
        throw new Error('Not a obcache function');
      }

      fname = func.cacheName;
      key = keygen(fname,args);
      log('invalidating cache for ' + fname + ' with key ' + key);
      store.expire(key);
    };

  },

  debug: require('./debug')
};

module.exports = cache;
