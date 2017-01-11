"use strict";

var zlib = require('zlib');
var snappy = require('snappy');

var compression = {

  SUPPORTED_TYPES: ['zlib', 'snappy'],

  zlib:{
    // compress str
    pack: function(str) {
      return zlib.deflateSync(str).toString('base64');
    },

    // uncompress str
    unpack: function(str){
      return zlib.inflateSync(new Buffer(str, 'base64')).toString();
    }
  },

  snappy: {
    // compress str
    pack: function(str) {
      return snappy.compressSync(str).toString('base64');
    },

    // uncompress str
    unpack: function(str){
      return snappy.uncompressSync(new Buffer(str, 'base64')).toString();
    }
  }

};

module.exports = compression;
