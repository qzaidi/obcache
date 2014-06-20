"use strict";

var LRU = require('lru-cache');

var lru = {

  init: function(options) {

    var lru,store;
    var lruOptions = {};

    if (options.maxSize) {
      lruOptions.length = function(v) {
        return JSON.stringify(v).length;
      };
      lruOptions.max = options.maxSize;
    } else {
      lruOptions.max = options.max;
    }

    lruOptions.maxAge = options.maxAge;
    lruOptions.dispose = options.dispose;

    lru = LRU(lruOptions);

    store = {
      
      lru: lru,

      get : function(key,cb) {
        var data = lru.get(key);
        cb(null,data);
      },

      set: function(key,val,cb) {
        lru.set(key,val);
        if (cb) {
          cb(null,val);
        }
      },

      expire: function(key,cb) {
        lru.del(key);
        cb && cb(null);
      },

      reset: function() {
        lru.reset();
      },

      size: function() {
        return lru.length
      },

      keycount: function() {
        return lru.itemCount;
      },

      values: lru.values.bind(lru)
    };

    return store;
  }

};

module.exports = lru;
