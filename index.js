"use strict";

var LRU = require('lru-cache');
var sigmund = require('sigmund');

function keygen(name,args) {
  var input = { f: name, a: args };
  return sigmund(input,4);
}

var cache = {

  /**
   * ## cache.Create
   *
   * Constructor
   *
   * Creates a new instance with its own LRU Cache
   *
   * @param {Object} LRU Options
   *
   **/
  Create: function(options) {
    var lru = LRU(options);
    this.lru = lru;
    /**
    *
    * ## cache.wrap
    *
    * @param {Function} function to be wrapped
    * @return {Function} Wrapped function that is cache aware
    *
    * Workhorse
    *
    * Given a function, generates a cache aware version of it.
    * The given function must have a callback as its last argument
    * Giving a name to the function being wrapped is preferred
    *
    **/
    this.wrap = function (fn) {
      var lru = this.lru;
      var fname = fn.name || Date.now();

      return function() {
        var self = this;
        var args = Array.prototype.slice.apply(arguments);
        var callback = args.pop();
        var key,data;

        if (typeof callback !== 'function') {
          throw new Error('last argument to ' + fname + ' should be a function');
        }

        key = keygen(fname,args);

        data = lru.get(key);
        // while LRU is sync - we need to support redis like stores in future, which won't be sync, 
        // and hence this function.
        (function(err, data) {
          if (!err && data) {
            return callback.call(self,err,data); // found in cache
          }


          args.push(function(err,res) {
            if (!err) { 
              lru.set(key,res);
            }
            callback.call(self,err,res);
          });

          fn.apply(self,args);
        }(null,data));

      };
    };
  }
};

module.exports = cache;
