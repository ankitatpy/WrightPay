import Redis, { RedisOptions } from 'ioredis';
import { config } from '../config/env.config';

export class RedisClient {
  private client: Redis;

  constructor(redisUrl?: string, options?: RedisOptions) {
    const url = redisUrl || config.redisUrl;
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 1000);
      },
      ...options,
    });

    this.client.on('error', (err) => {
      console.error('[RedisClient] Error encountered on Redis connection:', err.message);
    });
  }

  /**
   * Connect to Redis if not already connected.
   */
  async connect(): Promise<void> {
    if (this.client.status === 'wait' || this.client.status === 'close') {
      await this.client.connect();
    }
  }

  /**
   * Retrieve string value by key. Returns null if not found.
   */
  async get(key: string): Promise<string | null> {
    await this.connect();
    return this.client.get(key);
  }

  /**
   * Set key-value pair with optional TTL in seconds.
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK' | null> {
    await this.connect();
    if (ttlSeconds && ttlSeconds > 0) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  /**
   * Delete a specific key. Returns number of keys deleted (0 or 1).
   */
  async del(key: string): Promise<number> {
    await this.connect();
    return this.client.del(key);
  }

  /**
   * Get remaining TTL for a key in seconds.
   * Returns -2 if key does not exist, -1 if key exists with no expiry.
   */
  async ttl(key: string): Promise<number> {
    await this.connect();
    return this.client.ttl(key);
  }

  /**
   * Check if a key exists in Redis.
   */
  async exists(key: string): Promise<boolean> {
    await this.connect();
    const count = await this.client.exists(key);
    return count > 0;
  }

  /**
   * Health check verifying ping/pong response from Redis.
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.connect();
      const response = await this.client.ping();
      return response === 'PONG';
    } catch (error) {
      console.error('[RedisClient] Health check failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Graceful disconnect from Redis.
   */
  async close(): Promise<void> {
    if (this.client.status === 'ready' || this.client.status === 'connecting') {
      await this.client.quit();
    }
  }

  /**
   * Get underlying IORedis instance for advanced operations.
   */
  getClient(): Redis {
    return this.client;
  }
}

export const redisClient = new RedisClient();
export default redisClient;
