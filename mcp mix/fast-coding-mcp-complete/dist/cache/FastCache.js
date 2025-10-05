import NodeCache from 'node-cache';
import { LRUCache } from 'lru-cache';
// High-performance cache system inspired by Kilo Code techniques
export class FastCache {
  constructor() {
    // LRU Cache for frequently accessed data (inspired by Kilo Code)
    this.memoryCache = new LRUCache({
      max: 500, // Maximum 500 items
      ttl: 1000 * 60 * 30, // 30 minutes TTL
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });
    // Node cache for persistent data
    this.persistentCache = new NodeCache({
      stdTTL: 1000 * 60 * 60, // 1 hour default TTL
      checkperiod: 1000 * 60 * 5, // Check for expired keys every 5 minutes
      maxKeys: 1000, // Maximum 1000 keys
      deleteOnExpire: true,
      useClones: false, // Use references for better performance
    });
  }
  static getInstance() {
    if (!FastCache.instance) {
      FastCache.instance = new FastCache();
    }
    return FastCache.instance;
  }
  // Get data from cache with fallback to persistent cache
  get(key) {
    // Try memory cache first (fastest)
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult !== undefined) {
      return memoryResult;
    }
    // Fallback to persistent cache
    const persistentResult = this.persistentCache.get(key);
    if (persistentResult !== undefined) {
      // Move to memory cache for faster future access
      this.memoryCache.set(key, persistentResult);
      return persistentResult;
    }
    return undefined;
  }
  // Set data in both caches
  set(key, value, ttl) {
    // Set in memory cache (always)
    this.memoryCache.set(key, value, { ttl: ttl ? ttl * 1000 : undefined });
    // Set in persistent cache if TTL is provided or for important data
    if (ttl || this.isImportantData(key)) {
      return this.persistentCache.set(key, value, ttl ?? 0);
    }
    return true;
  }
  // Delete from both caches
  delete(key) {
    this.memoryCache.delete(key);
    this.persistentCache.del(key);
  }
  // Clear all caches
  clear() {
    this.memoryCache.clear();
    this.persistentCache.flushAll();
  }
  // Get cache statistics
  getStats() {
    return {
      memoryCache: {
        size: this.memoryCache.size,
        maxSize: this.memoryCache.max,
        calculatedSize: this.memoryCache.calculatedSize,
      },
      persistentCache: {
        keys: this.persistentCache.getStats().keys,
        hits: this.persistentCache.getStats().hits,
        misses: this.persistentCache.getStats().misses,
        ksize: this.persistentCache.getStats().ksize,
        vsize: this.persistentCache.getStats().vsize,
      },
    };
  }
  // Batch operations for better performance
  async batchGet(keys) {
    const results = new Map();
    // Batch process keys for better performance
    const batchSize = 10;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      const batchPromises = batch.map(async key => {
        const value = await this.get(key);
        return { key, value };
      });
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ key, value }) => {
        results.set(key, value);
      });
    }
    return results;
  }
  async batchSet(entries) {
    try {
      // Use Promise.all for concurrent setting
      await Promise.all(
        entries.map(({ key, value, ttl }) => this.set(key, value, ttl))
      );
      return true;
    } catch (error) {
      console.error('Batch set error:', error);
      return false;
    }
  }
  isImportantData(key) {
    // Define keys that should be persisted
    const importantPrefixes = ['config', 'user', 'settings', 'template'];
    return importantPrefixes.some(prefix => key.startsWith(prefix));
  }
}
// Debounced cache decorator (inspired by Kilo Code)
export function debounceCache(fn, keyFn, delay = 1000) {
  const cache = FastCache.getInstance();
  let debounceTimer;
  return (...args) => {
    const key = keyFn(...args);
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    return new Promise(resolve => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const result = await fn(...args);
        cache.set(key, result, 300); // Cache for 5 minutes
        resolve(result);
      }, delay);
    });
  };
}
//# sourceMappingURL=FastCache.js.map
