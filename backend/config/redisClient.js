const redis = require("redis");
require('dotenv').config();

const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});

redisClient.on("connect", () => console.log("Connected to Redis."));
redisClient.on("error", (err) => {
  if(process.env.NODE_ENV !== 'production') {
    console.error("Redis error:", err);
  }else{
    console.error("Redis error:", err.message);
  }
});

redisClient.connect();

module.exports = redisClient;
