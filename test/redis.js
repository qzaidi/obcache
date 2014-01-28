var redis = require('../redis');

redis.create({ maxAge: 60000 });
redis.set('hello', { world: 1, universe: 20 });

setTimeout(function() {
  redis.get('hello',console.log);
},1000);
