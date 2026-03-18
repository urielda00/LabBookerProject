const Redis = require('redis');
require('dotenv').config();

class RedisClient {
	constructor() {
		this.client = null;
		// Do not await in constructor, verify connection lazily or via init
		this.connect();
	}

	async connect() {
		if (this.client && this.client.isOpen) return;

		
		// Ensure REDIS_URL is set in .env
		const redisUrl = process.env.REDIS_URL;

		if (!redisUrl) {
			console.error('❌ Redis Error: REDIS_URL is not defined in environment variables.');
			return;
		}

		try {
			this.client = Redis.createClient({
				url: redisUrl,
			});

			this.client.on('error', (err) => {
				console.error('Redis Client Error:', err);
			});

			this.client.on('connect', () => {
				console.log('🔵 Connected to Redis');
			});

			await this.client.connect();
		} catch (error) {
			console.error('Redis connection initial error:', error);
		}
	}

	async ensureConnection() {
		if (!this.client?.isOpen) {
			await this.connect();
		}
	}

	async ping() {
		try {
			await this.ensureConnection();
			if (!this.client?.isOpen) return { success: false, error: 'Redis not connected' };

			const start = process.hrtime.bigint();
			const result = await this.client.ping();
			const latency = Number(process.hrtime.bigint() - start) / 1_000_000;

			return { success: result === 'PONG', latency };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	async get(key) {
		await this.ensureConnection();
		return await this.client.get(key);
	}

	async set(key, value, ...args) {
		await this.ensureConnection();
		return await this.client.set(key, value, ...args);
	}

	async del(key) {
		await this.ensureConnection();
		return await this.client.del(key);
	}

	async storeToken(userId, token, expiryTime) {
		await this.ensureConnection();
		return await this.client.set(`token:${userId}`, token, 'EX', expiryTime);
	}
}

module.exports = new RedisClient();
