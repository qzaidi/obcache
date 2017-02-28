'use strict';

var redis = require('redis');
var debug = require('debug')('obcache');

var redisStore = {

  init: function(options) {

    var writeClient, readClient, prefix;
    var keylen = 0;
    var maxAge = (options && options.maxAge) || 60000;

    var writeConfig = options.redis;

    // readConfig is completely optional and will be useful when we've master slave configuration.
    // All writes can go to master and reads can be moved to slave
    var readConfig  = options.readRedis;

    var ropts       = {};
    var readRopts   = {};


    function setKeylen(err,size) {
      keylen = size;
    }

    if (!options || isNaN(Number(options.id)) ) {
      throw new Error('Specify an integer cacheid for persistence across reboots, not ' + options.id);
    }

    if (writeConfig.twemproxy) {
      ropts.no_ready_check = true;
      debug('twemproxy compat mode for writeConfig. multi-get etc wouldn\'t be available.');
    }
    writeClient = redis.createClient(writeConfig.port, writeConfig.host, ropts);
    writeClient.on('error', function(err) {
      debug('redis error ' + err);
    });
    if (!writeConfig.twemproxy) {
      writeClient.select(options.id);
      writeClient.dbsize(setKeylen);
    }


    readClient = writeClient;

    if (readConfig) {
      if (readConfig.twemproxy) {
        readRopts.no_ready_check = true;
        debug('twemproxy compat mode for readConfig. stats on keys will not be available.');
      }
      readClient = redis.createClient(readConfig.port, readConfig.host, readRopts);
      readClient.on('error', function(err) {
        debug('redis error ' + err);
      });

      if (!readConfig.twemproxy) {
        readClient.select(options.id);
        readClient.dbsize(setKeylen);
      }
    }


    prefix = 'obc:' + options.id + ':' ;

    var rcache = {
      maxAge : maxAge,
      client : writeClient,
      get : function(key, cb) {
        key = prefix + key;
        readClient.get(key, function(err, data){
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
          writeClient.setex(key, ttl, obj, function(err){
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
        writeClient.expire(key,0,cb || function() {});
      },

      reset: function() {
        if (options.redis.twemproxy) {
          throw new Error('Reset is not possible in twemproxy compat mode');
        }
        writeClient.flushdb();
      },

      size: function() {
        return 0;
      },

      keycount: function() {
        // this is a hack to make this function sync, 
        // second call will return a truer keycount
        if (options.redis.twemproxy) {
          return -1;
        }
        readClient.dbsize(setKeylen);
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
