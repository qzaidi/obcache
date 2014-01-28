"use strict";

var LRU = require('lru-cache');

var lru = {

  init: function(options) {

    var lru = LRU(options);

    var store = {
      
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

      reset: function() {
        lru.reset();
      },

      size: function() {
        return JSON.stringify(lru.values()).length;
      },

      keycount: function() {
        return lru.keys().length;
      }
    };

    return store;
  }

};

module.exports = lru;
