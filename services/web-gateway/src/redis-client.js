/**
 * Redis client for caching at the web-gateway level
 * Provides graceful fallback if Redis is unavailable
 */

const redis = require('redis');
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

// Create Redis client with retry strategy
const client = redis.createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis max retries exceeded', {
          handler: 'RedisClient',
          retries
        });
        return new Error('Redis connection failed after max retries');
      }
      const delay = Math.min(retries * 100, 3000);
      logger.warn('Redis reconnecting', {
        handler: 'RedisClient',
        retries,
        delay_ms: delay
      });
      return delay;
    }
  }
});

// Track connection status for graceful degradation
let isConnected = false;

client.on('connect', () => {
  logger.info('Redis client connecting', {
    handler: 'RedisClient',
    redis_url: REDIS_URL
  });
});

client.on('ready', () => {
  isConnected = true;
  logger.info('Redis client ready', {
    handler: 'RedisClient',
    redis_url: REDIS_URL
  });
});

client.on('error', (err) => {
  isConnected = false;
  logger.error('Redis client error', {
    handler: 'RedisClient',
    error: err.message
  });
});

client.on('end', () => {
  isConnected = false;
  logger.warn('Redis client connection ended', {
    handler: 'RedisClient'
  });
});

// Connect to Redis
client.connect().catch((err) => {
  logger.error('Redis initial connection failed', {
    handler: 'RedisClient',
    error: err.message
  });
});

/**
 * Get cached value by key
 * Returns null on cache miss or if Redis is unavailable
 */
async function getCache(key) {
  if (!isConnected) {
    logger.warn('Redis not connected, cache miss', {
      handler: 'RedisClient',
      key
    });
    return null;
  }

  try {
    const value = await client.get(key);
    if (value === null) {
      return null;
    }
    return JSON.parse(value);
  } catch (err) {
    logger.error('Redis GET failed', {
      handler: 'RedisClient',
      key,
      error: err.message
    });
    return null;
  }
}

/**
 * Set cached value with TTL
 * Fails gracefully if Redis is unavailable
 */
async function setCache(key, value, ttlSeconds = 60) {
  if (!isConnected) {
    logger.warn('Redis not connected, cache set skipped', {
      handler: 'RedisClient',
      key
    });
    return false;
  }

  try {
    const serialized = JSON.stringify(value);
    await client.set(key, serialized, {
      EX: ttlSeconds
    });
    return true;
  } catch (err) {
    logger.error('Redis SET failed', {
      handler: 'RedisClient',
      key,
      error: err.message
    });
    return false;
  }
}

module.exports = {
  getCache,
  setCache,
  client
};
