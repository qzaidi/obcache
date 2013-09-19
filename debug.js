"use strict";

/**
 * For debugging caches in an express APP
 *
 * first, register all your caches with this module
 *
 * debug.register(cache1);
 * debug.register(cache2)
 *
 * You can do so while creating, like this
 *
 * ```
 * var obcache = require('obcache');
 * var cache = obcache.debug.register(new obcache.Create({ max: 100, maxAge: 300}),'mycache');
 * ```
 *
 * Then expose debug.view on some route to see all keys in cache
 * app.get('/debug/caches',debug.view);
 *
 **/

var caches = {};
var index = 0;

var debug = {
  register: function(cache,name) {
    var cname = name || ('anon_' + index++);
    caches[cname] = cache;
    return cache;
  },

  view: function(req,res,next) {
    var data = [];
    var cnames = Object.keys(caches);
    cnames.forEach(function(cname) {
      var cache = caches[cname];
      var values = cache.values();
      var stats = { name: cname, size: JSON.stringify(values).length, keycount: cache.keys().length };
      if (req.query.detail) {
        stats.values = values;
      }
      data.push(stats);
    });
    res.json(data);
  }

};

module.exports = debug;
