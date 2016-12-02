"use strict";

var zlib = require('zlib');

var compression = {

  // compress str
  pack: function(str) {
    return zlib.deflateSync(str).toString('base64');
  },

  // uncompress str
  unpack: function(str){
    return zlib.inflateSync(new Buffer(str, 'base64')).toString();
  }
};

module.exports = compression;
