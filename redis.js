"use strict";

var redis = require('redis');
var debug = require('debug')('obcache');

var redisStore = {

  init: function(options) {

    var client ;
    var prefix;
    var keylen = 0;
    var maxAge = (options && options.maxAge) || 60000;
    var port = options.redis.port;
    var host = options.redis.host;

    function setKeylen(err,size) {
      keylen = size;
    }


    if (!options || isNaN(Number(options.id)) ) {
      throw new Error('Specify an integer cacheid for persistence across reboots, not ' + options.id);
    }

    client = redis.createClient(port, host);
    client.select(options.id);
    client.dbsize(setKeylen);
    prefix = 'obc:' + options.id + ':' ;

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
          // don't reset the ttl
          //client.expire(key,ttl);
          return cb(null, result);
        });
      },

      set : function(key, val, cb){
        key = prefix + key;
        try {
          var ttl = this.maxAge/1000;
          var obj = JSON.stringify(val);

          debug('setting key ' + key + ' in redis with ttl ' + ttl);
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

      expire: function(key,cb) {
        key = prefix + key;
        client.expire(key,0,cb || function() {});
      },

      reset: function() {
        client.flushdb();
      },

      size: function() {
        return 0;
      },

      keycount: function() {
        // this is a hack to make this function sync, 
        // second call will return a truer keycount
        client.dbsize(setKeylen);
        return keylen;
      }
    };
    return rcache;

  }
};

module.exports = redisStore;

(function() {
  if (require.main === module) {
    var store = redisStore.init({ redis: { port: 6379 }, id: 0 });
    console.log('created cache ' + store);
    store.keycount(console.log);
  }
}());
