// ============================================
// src/config/redis.config.ts
// Upstash Redis configuration (HTTP-based) + ioredis (Pub/Sub)
// ============================================

import { Redis as UpstashRedis } from "@upstash/redis";
import { Redis as IORedis } from "ioredis";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export class RedisConnection {
  private static instance: RedisConnection;
  private client: UpstashRedis;
  private subscriber: IORedis | null = null;
  private subscriberInitialized = false;

  private constructor() {
    logger.debug('Initializing Upstash Redis client');

    this.client = new UpstashRedis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
      automaticDeserialization: false,
    });

    logger.debug('Upstash Redis client initialized');
  }

  /** Get singleton instance */
  static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  /** HTTP Redis client (for normal operations: get/set/incr/expire etc.) */
  getClient(): UpstashRedis {
    return this.client;
  }

  /** TCP Redis subscriber (only if you use Pub/Sub later) */
  getSubscriber(): IORedis {
    if (!this.subscriber) {
      const tcpUrl = env.REDIS_TCP_URL;

      if (!tcpUrl) {
        throw new Error("❌ Missing REDIS_TCP_URL for Redis Pub/Sub");
      }

      logger.debug('Initializing ioredis subscriber');

      this.subscriber = new IORedis(tcpUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      if (!this.subscriberInitialized) {
        this.subscriber.on("connect", () => logger.debug('ioredis connected'));
        this.subscriber.on("ready", () => logger.debug('ioredis ready'));
        this.subscriber.on("error", (err) =>
          logger.error('ioredis error', { error: err.message })
        );
        this.subscriber.on("close", () =>
          logger.warn('ioredis connection closed')
        );
        this.subscriber.on("reconnecting", () =>
          logger.debug('ioredis reconnecting')
        );

        this.subscriberInitialized = true;
      }
    }

    return this.subscriber;
  }

  /** Test connection */
  async connect(): Promise<void> {
    try {
      const res = await this.client.ping();
      logger.info('Redis connected', { response: res });
    } catch (error: any) {
      logger.error('Redis connection failed', { error: error.message });
      throw error;
    }
  }

  /** Health Check */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error: any) {
      logger.error('Redis health check failed', { error: error.message });
      return false;
    }
  }

  /** Disconnect */
  async disconnect(): Promise<void> {
    logger.debug('Closing Redis connections');

    if (this.subscriber) {
      try {
        await this.subscriber.quit();
        this.subscriber = null;
        this.subscriberInitialized = false;
        logger.debug('ioredis subscriber closed');
      } catch (error: any) {
        logger.warn('Error closing ioredis', { error: error.message });
      }
    }
  }
}

const redisConnection = RedisConnection.getInstance();

// HTTP Redis client for direct operations
export const redis = redisConnection.getClient();

// Compatibility patch: add setEx support to Upstash Redis instance for legacy node-redis callers
if (typeof (redis as any).setEx !== 'function') {
  (redis as any).setEx = async (key: string, seconds: number, value: string) => {
    return redis.set(key, value, { ex: seconds });
  };
}

// Backward-compatible aliases used elsewhere in the backend
export const redisClient = redis;

export const connectRedis = async (): Promise<UpstashRedis> => {
  await redisConnection.connect();
  return redis;
};

export const disconnectRedis = async (): Promise<void> => {
  await redisConnection.disconnect();
};

export default redisClient;
