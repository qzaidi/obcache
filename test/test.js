"use strict";

var obcache = require('../index');
var debug = require('../debug');
var assert = require('assert');

var cache = debug.register(new obcache.Create({ queueEnabled: true, reset: { interval: 2000, firstReset: new Date(Date.now() + 1000) } }));

(function() {
  var original = function (id,cb) {
    process.nextTick(function() {
      process.nextTick(function() {
        var v = JSON.stringify({ p: id });
        cb(null,v);
      });
    });
  };
  var wrapped = cache.wrap(original);

  describe('Basic', function() {
    describe('#callback sanity', function() {
      it('original should return a value', function(done) {
        original(5,function(err,res){
          assert.equal(5,(JSON.parse(res)).p);
          done();
        });
      });
      it('callback should return the same value', function(done) {
        wrapped(5,function(err,res) {
          assert.equal(5,(JSON.parse(res)).p);
          done();
        });
      });
      it('debug should report one key in cache', function(done) {
        debug.log(function(res) {
          assert.equal(1,res.data[0].size);
          done();
        });
      });
      it('cache hit rate should be zero', function(done) {
        debug.log(function(res){ 
          assert.equal(0,res.data[0].hitrate);
          done();
        });
      });
      it('cache hit rate should be 50% on next call', function(done) {
        wrapped(5,function(err,res) {
          assert.equal(5,(JSON.parse(res)).p);
          debug.log(function(res){ 
            assert.equal(50,res.data[0].hitrate);
            done();
          });
        });
      });
    });

    describe('#warmup', function() {

      before(function() {
        cache.warmup(wrapped,10,'iamwarmedupnow');
      });

      it('warmup should increase key count', function(done) {
        debug.log(function(res) {
          assert.equal(2,res.data[0].size);
          done();
        });
      });

      it('there should be no miss for warmedup value', function(done) {
        wrapped(10, function(err,res) {
          assert.equal('iamwarmedupnow', res);
          debug.log(function(res) {
            assert.equal(66, res.data[0].hitrate);
            done();
          });
        });
      });
    });

    describe('#pending', function() {
      it('pending count should be 1 for each unique value', function(done) {
        var max = 3;
        function cb() {
          max--;
          if (max == -3) {
            assert.ok('all callbacks called');
            debug.log(function(res) {
              assert.equal(0, res.data[0].pending);
              done();
            });
          }
        }

        for (var i = 0; i < 3; i++) {
          wrapped(7, cb);
          wrapped(8, cb);
        }

        debug.log(function(res) {
          assert.equal(2, res.data[0].pending);
        });

      });

    });

  });

}());
