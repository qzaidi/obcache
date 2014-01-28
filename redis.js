"use strict";

var redis = require('redis');

var redisStore = {

  init: function(options) {

    var client = redis.createClient(options.redis);
    var maxAge = options && options.maxAge || 60000;
    var prefix = 'obc:';

    var rcache = {
      maxAge : maxAge,
      client : client,
      get : function(key, cb) {
        key = prefix + key;
        var ttl = this.maxAge/1000;
        client.get(key, function(err, data){
          var result;
          if (err || !data) {
            return cb(err);
          }
          data = data.toString();
          try {
            result = JSON.parse(data); 
          } catch (e) {
            return cb(e);
          }
          client.expire(key,ttl);
          return cb(null, result);
        });
      },

      set : function(key, val, cb){
        key = prefix + key;
        try {
          var ttl = this.maxAge/1000;
          var obj = JSON.stringify(val);

          client.setex(key, ttl, obj, function(err){
            if (cb) {
              cb.apply(this, arguments);
            }
          });
        } catch (err) {
          if (cb) { 
            cb(err);
          }
        } 
      },

      reset: function(key,val,cb) {

      },

      size: function() {
        return 0;
      },

      keycount: function() {
        return 0;
      }
    };
    return rcache;

  }
};

module.exports = redisStore;
