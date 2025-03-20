const Redis = require("redis");

class RedisClient {
  constructor() {
    this.client = null;
    this.connect();
  }

  async connect() {
    try {
      this.client = Redis.createClient({
        url: process.env.REDIS_URL || "redis://red-cvdgc6d6l47c73941a3g:6379", // Make sure this points to the Redis service in Docker Compose
      });
      console.log("🔵 Redis URL from ENV:", process.env.REDIS_URL);

      this.client.on("error", (err) => {
        console.error("Redis Client Error:", err);
      });
      await this.client.connect();
    } catch (error) {
      console.error("Redis connection error:", error);
    }
  }

  // Ping check for Redis
  async ping() {
    try {
      const start = process.hrtime.bigint();
      const result = await this.client.ping();
      const latency = Number(process.hrtime.bigint() - start) / 1_000_000;
      return { success: result === "PONG", latency };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async get(key) {
    try {
      if (!this.client.isOpen) {
        await this.connect();
      }
      return await this.client.get(key);
    } catch (error) {
      console.error("Redis get error:", error);
      throw error;
    }
  }

  async set(key, value, ...args) {
    try {
      if (!this.client.isOpen) {
        await this.connect();
      }
      return await this.client.set(key, value, ...args);
    } catch (error) {
      console.error("Redis set error:", error);
      throw error;
    }
  }

  async del(key) {
    try {
      if (!this.client.isOpen) {
        await this.connect();
      }
      return await this.client.del(key);
    } catch (error) {
      console.error("Redis del error:", error);
      throw error;
    }
  }

  async storeToken(userId, token, expiryTime) {
    try {
      if (!this.client.isOpen) {
        await this.connect();
      }
      return await this.client.set(`token:${userId}`, token, "EX", expiryTime);
    } catch (error) {
      console.error("Redis store token error:", error);
      throw error;
    }
  }
}

module.exports = new RedisClient();
