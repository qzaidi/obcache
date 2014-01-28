"use strict";

var redis = require('redis');

var redisStore = {
  prefix: 'obc:',

  maxAge: 60000,

  client: null,

  init: function(options) {
    this.maxAge = options.maxAge || 60000;
    this.client = redis.createClient(options.redis);
  },

  get : function(key, cb){
    key = this.prefix + key;
    var client = this.client;
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
    key = this.prefix + key;
    try {
      var ttl = this.maxAge/1000;
      var obj = JSON.stringify(val);

      this.client.setex(key, ttl, obj, function(err){
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

module.exports = redisStore;
