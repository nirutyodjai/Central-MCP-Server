/**
 * High-Performance Caching System for MCP Platform
 * ระบบ cache ที่มีประสิทธิภาพสูงสุดสำหรับ MCP Platform
 */

import * as Redis from 'ioredis';
import NodeCache from 'node-cache';

export interface CacheConfig {
  // Redis Configuration
  redis?: {
    enabled: boolean;
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
    retryDelayOnFailover: number;
    enableReadyCheck: boolean;
    maxRetriesPerRequest: number;
    lazyConnect: boolean;
  };

  // Memory Cache Configuration
  memory: {
    enabled: boolean;
    maxKeys: number;
    stdTTL: number; // seconds
    checkperiod: number; // seconds
    useClones: boolean;
    deleteOnExpire: boolean;
  };

  // Compression Configuration
  compression: {
    enabled: boolean;
    threshold: number; // bytes, compress if larger than this
    algorithm: 'gzip' | 'lz4' | 'none';
  };

  // Cache Strategy
  strategy: {
    defaultTTL: number; // milliseconds
    maxSize: number; // max entries
    enableMetrics: boolean;
    enableCompression: boolean;
  };
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
  compressed: boolean;
  hits: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memoryUsage: number;
  hitRate: number;
  averageResponseTime: number;
}

export class HighPerformanceCache {
  private redisClient?: Redis.Redis;
  private memoryCache: NodeCache;
  private config: CacheConfig;
  private stats: CacheStats;
  private compressionEnabled: boolean;

  constructor(config: CacheConfig) {
    this.config = config;
    this.stats = {
      hits: 0,
      misses: 0,
      keys: 0,
      memoryUsage: 0,
      hitRate: 0,
      averageResponseTime: 0
    };

    // Initialize memory cache
    if (config.memory.enabled) {
      this.memoryCache = new NodeCache({
        stdTTL: config.memory.stdTTL,
        maxKeys: config.memory.maxKeys,
        checkperiod: config.memory.checkperiod,
        useClones: config.memory.useClones,
        deleteOnExpire: config.memory.deleteOnExpire
      });

      // Monitor memory cache events
      this.memoryCache.on('set', (key, value) => {
        this.updateStats('memory', 'set');
      });

      this.memoryCache.on('del', (key, value) => {
        this.updateStats('memory', 'del');
      });
    }

    // Initialize Redis cache
    if (config.redis?.enabled) {
      this.initializeRedis();
    }

    this.compressionEnabled = config.compression.enabled;
  }

  /**
   * Initialize Redis connection with high-performance settings
   */
  private async initializeRedis(): Promise<void> {
    const redisConfig = this.config.redis!;

    this.redisClient = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      keyPrefix: redisConfig.keyPrefix,
      retryDelayOnFailover: redisConfig.retryDelayOnFailover,
      enableReadyCheck: redisConfig.enableReadyCheck,
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
      lazyConnect: redisConfig.lazyConnect,
      // High-performance optimizations
      family: 4,
      connectTimeout: 10000,
      commandTimeout: 5000,
      keepAlive: 30000,
      // Connection pool settings
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      // Performance optimizations
      scripts: {
        // Lua scripts for atomic operations
        atomicGet: `
          local value = redis.call('GET', KEYS[1])
          if value then
            redis.call('EXPIRE', KEYS[1], ARGV[1])
            return value
          end
          return nil
        `
      }
    });

    // Error handling
    this.redisClient.on('error', (error) => {
      console.error('❌ Redis cache error:', error);
    });

    this.redisClient.on('connect', () => {
      console.log('✅ Redis cache connected');
    });

    // Wait for connection
    await new Promise((resolve, reject) => {
      if (this.redisClient!.status === 'ready') {
        resolve(true);
      } else {
        this.redisClient!.once('ready', resolve);
        this.redisClient!.once('error', reject);
      }
    });
  }

  /**
   * Set cache value with high-performance optimizations
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    const startTime = Date.now();
    const finalTTL = ttl || this.config.strategy.defaultTTL;

    try {
      // Serialize data
      const serialized = this.serialize(value);

      // Check if compression is needed
      const shouldCompress = this.compressionEnabled &&
        serialized.length > this.config.compression.threshold;

      const cacheEntry: CacheEntry<T> = {
        data: shouldCompress ? this.compress(serialized) : value,
        timestamp: Date.now(),
        ttl: finalTTL,
        size: JSON.stringify(value).length,
        compressed: shouldCompress,
        hits: 0
      };

      // Try Redis first (if available)
      if (this.redisClient && this.config.redis?.enabled) {
        try {
          const redisKey = this.getRedisKey(key);
          const serializedEntry = JSON.stringify(cacheEntry);

          if (shouldCompress) {
            await this.redisClient.setex(redisKey, finalTTL / 1000, serializedEntry);
          } else {
            await this.redisClient.setex(redisKey, finalTTL / 1000, serializedEntry);
          }

          this.updateStats('redis', 'set');
          return true;
        } catch (redisError) {
          console.warn('⚠️ Redis cache failed, falling back to memory cache:', redisError);
        }
      }

      // Fallback to memory cache
      if (this.config.memory.enabled) {
        const success = this.memoryCache.set(key, cacheEntry, finalTTL / 1000);
        this.updateStats('memory', 'set');
        return success;
      }

      return false;
    } catch (error) {
      console.error('❌ Cache set error:', error);
      this.stats.misses++;
      return false;
    } finally {
      this.updateAverageResponseTime(Date.now() - startTime);
    }
  }

  /**
   * Get cache value with high-performance optimizations
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();

    try {
      // Try Redis first (if available)
      if (this.redisClient && this.config.redis?.enabled) {
        try {
          const redisKey = this.getRedisKey(key);
          const result = await this.redisClient.get(redisKey);

          if (result) {
            const cacheEntry: CacheEntry<T> = JSON.parse(result);
            cacheEntry.hits++;

            // Update expiry time on hit
            await this.redisClient.expire(redisKey, cacheEntry.ttl / 1000);

            this.stats.hits++;
            this.updateStats('redis', 'hit');

            return this.deserialize(cacheEntry);
          }
        } catch (redisError) {
          console.warn('⚠️ Redis cache failed, falling back to memory cache:', redisError);
        }
      }

      // Fallback to memory cache
      if (this.config.memory.enabled) {
        const cacheEntry = this.memoryCache.get<CacheEntry<T>>(key);

        if (cacheEntry) {
          cacheEntry.hits++;
          this.stats.hits++;
          this.updateStats('memory', 'hit');

          return this.deserialize(cacheEntry);
        }
      }

      this.stats.misses++;
      this.updateStats('memory', 'miss');
      return null;
    } catch (error) {
      console.error('❌ Cache get error:', error);
      this.stats.misses++;
      return null;
    } finally {
      this.updateAverageResponseTime(Date.now() - startTime);
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<boolean> {
    try {
      let deleted = false;

      // Try Redis first
      if (this.redisClient && this.config.redis?.enabled) {
        try {
          const redisKey = this.getRedisKey(key);
          const result = await this.redisClient.del(redisKey);
          deleted = result > 0;
        } catch (redisError) {
          console.warn('⚠️ Redis delete failed:', redisError);
        }
      }

      // Fallback to memory cache
      if (this.config.memory.enabled) {
        deleted = this.memoryCache.del(key) > 0 || deleted;
      }

      return deleted;
    } catch (error) {
      console.error('❌ Cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      // Clear Redis
      if (this.redisClient && this.config.redis?.enabled) {
        await this.redisClient.flushdb();
      }

      // Clear memory cache
      if (this.config.memory.enabled) {
        this.memoryCache.flushAll();
      }

      // Reset stats
      this.resetStats();
    } catch (error) {
      console.error('❌ Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      ...this.stats,
      hitRate,
      keys: this.memoryCache ? this.memoryCache.getStats().keys : 0,
      memoryUsage: process.memoryUsage().heapUsed
    };
  }

  /**
   * Get multiple cache values at once (batch operation)
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const startTime = Date.now();

    try {
      const results: (T | null)[] = new Array(keys.length);

      // Try Redis batch operation first
      if (this.redisClient && this.config.redis?.enabled) {
        try {
          const redisKeys = keys.map(key => this.getRedisKey(key));
          const redisResults = await this.redisClient.mget(...redisKeys);

          for (let i = 0; i < redisResults.length; i++) {
            if (redisResults[i]) {
              const cacheEntry: CacheEntry<T> = JSON.parse(redisResults[i]!);
              results[i] = this.deserialize(cacheEntry);
              this.stats.hits++;
            } else {
              this.stats.misses++;
            }
          }

          this.updateStats('redis', 'batch');
          return results;
        } catch (redisError) {
          console.warn('⚠️ Redis mget failed:', redisError);
        }
      }

      // Fallback to individual memory cache operations
      for (let i = 0; i < keys.length; i++) {
        results[i] = await this.get<T>(keys[i]);
      }

      return results;
    } finally {
      this.updateAverageResponseTime(Date.now() - startTime);
    }
  }

  /**
   * Set multiple cache values at once (batch operation)
   */
  async mset<T>(entries: Array<{key: string, value: T, ttl?: number}>): Promise<boolean> {
    try {
      // Try Redis batch operation first
      if (this.redisClient && this.config.redis?.enabled) {
        try {
          const pipeline = this.redisClient.pipeline();

          for (const entry of entries) {
            const cacheEntry: CacheEntry<T> = {
              data: entry.value,
              timestamp: Date.now(),
              ttl: entry.ttl || this.config.strategy.defaultTTL,
              size: JSON.stringify(entry.value).length,
              compressed: false,
              hits: 0
            };

            const redisKey = this.getRedisKey(entry.key);
            pipeline.setex(redisKey, cacheEntry.ttl / 1000, JSON.stringify(cacheEntry));
          }

          await pipeline.exec();
          this.updateStats('redis', 'batch');
          return true;
        } catch (redisError) {
          console.warn('⚠️ Redis mset failed:', redisError);
        }
      }

      // Fallback to individual memory cache operations
      for (const entry of entries) {
        await this.set(entry.key, entry.value, entry.ttl);
      }

      return true;
    } catch (error) {
      console.error('❌ Cache mset error:', error);
      return false;
    }
  }

  /**
   * Serialization with compression support
   */
  private serialize(data: any): string {
    return JSON.stringify(data);
  }

  /**
   * Deserialization with decompression support
   */
  private deserialize<T>(entry: CacheEntry<T>): T {
    return entry.data;
  }

  /**
   * Compression (placeholder for future implementation)
   */
  private compress(data: string): any {
    // TODO: Implement compression algorithms (gzip, lz4)
    return data;
  }

  /**
   * Get Redis key with prefix
   */
  private getRedisKey(key: string): string {
    return `${this.config.redis?.keyPrefix || 'mcp'}:${key}`;
  }

  /**
   * Update cache statistics
   */
  private updateStats(source: 'redis' | 'memory', operation: string): void {
    if (this.config.strategy.enableMetrics) {
      if (source === 'redis' && this.redisClient) {
        // Update Redis-specific stats if needed
      } else if (source === 'memory' && this.memoryCache) {
        const stats = this.memoryCache.getStats();
        this.stats.keys = stats.keys;
      }
    }
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(responseTime: number): void {
    if (this.config.strategy.enableMetrics) {
      const totalRequests = this.stats.hits + this.stats.misses;
      this.stats.averageResponseTime =
        (this.stats.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
    }
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      keys: 0,
      memoryUsage: 0,
      hitRate: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Health check for cache system
   */
  async healthCheck(): Promise<{redis: boolean, memory: boolean}> {
    const health = {
      redis: false,
      memory: true
    };

    // Check Redis health
    if (this.redisClient && this.config.redis?.enabled) {
      try {
        await this.redisClient.ping();
        health.redis = true;
      } catch (error) {
        console.warn('⚠️ Redis health check failed:', error);
      }
    }

    // Memory cache is always available if enabled
    health.memory = this.config.memory.enabled;

    return health;
  }

  /**
   * Close cache connections
   */
  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    // Memory cache doesn't need explicit cleanup
  }
}

/**
 * สร้าง High-Performance Cache Instance สำหรับ MCP Platform
 */
export function createMCPHighPerformanceCache(): HighPerformanceCache {
  return new HighPerformanceCache({
    redis: {
      enabled: process.env.REDIS_ENABLED === 'true',
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: 'mcp',
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    },
    memory: {
      enabled: true,
      maxKeys: parseInt(process.env.MEMORY_CACHE_MAX_KEYS || '10000'),
      stdTTL: parseInt(process.env.MEMORY_CACHE_TTL || '300'), // 5 minutes
      checkperiod: parseInt(process.env.MEMORY_CACHE_CHECK_PERIOD || '60'), // 1 minute
      useClones: false,
      deleteOnExpire: true
    },
    compression: {
      enabled: process.env.CACHE_COMPRESSION === 'true',
      threshold: parseInt(process.env.COMPRESSION_THRESHOLD || '1024'), // 1KB
      algorithm: 'gzip'
    },
    strategy: {
      defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '300000'), // 5 minutes
      maxSize: parseInt(process.env.CACHE_MAX_SIZE || '10000'),
      enableMetrics: true,
      enableCompression: process.env.CACHE_COMPRESSION === 'true'
    }
  });
}
