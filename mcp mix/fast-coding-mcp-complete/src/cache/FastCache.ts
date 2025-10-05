import NodeCache from 'node-cache';
import { LRUCache } from 'lru-cache';

// High-performance cache system inspired by Kilo Code techniques
export class FastCache {
  private memoryCache: LRUCache<string, any>;
  private persistentCache: NodeCache;
  private static instance: FastCache;

  private constructor() {
    // LRU Cache for frequently accessed data (inspired by Kilo Code)
    this.memoryCache = new LRUCache<string, any>({
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

  static getInstance(): FastCache {
    if (!FastCache.instance) {
      FastCache.instance = new FastCache();
    }
    return FastCache.instance;
  }

  // Get data from cache with fallback to persistent cache
  get<T>(key: string): T | undefined {
    // Try memory cache first (fastest)
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult !== undefined) {
      return memoryResult as T;
    }

    // Fallback to persistent cache
    const persistentResult = this.persistentCache.get<T>(key);
    if (persistentResult !== undefined) {
      // Move to memory cache for faster future access
      this.memoryCache.set(key, persistentResult);
      return persistentResult;
    }

    return undefined;
  }

  // Set data in both caches
  set<T>(key: string, value: T, ttl?: number): boolean {
    // Set in memory cache (always)
    this.memoryCache.set(key, value, { ttl: ttl ? ttl * 1000 : undefined });

    // Set in persistent cache if TTL is provided or for important data
    if (ttl || this.isImportantData(key)) {
      return this.persistentCache.set(key, value, ttl ?? 0);
    }

    return true;
  }

  // Delete from both caches
  delete(key: string): void {
    this.memoryCache.delete(key);
    this.persistentCache.del(key);
  }

  // Clear all caches
  clear(): void {
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
  async batchGet<T>(keys: string[]): Promise<Map<string, T | undefined>> {
    const results = new Map<string, T | undefined>();

    // Batch process keys for better performance
    const batchSize = 10;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      const batchPromises = batch.map(async key => {
        const value = await this.get<T>(key);
        return { key, value };
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ key, value }) => {
        results.set(key, value);
      });
    }

    return results;
  }

  async batchSet<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<boolean> {
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

  private isImportantData(key: string): boolean {
    // Define keys that should be persisted
    const importantPrefixes = ['config', 'user', 'settings', 'template'];
    return importantPrefixes.some(prefix => key.startsWith(prefix));
  }
}

// Debounced cache decorator (inspired by Kilo Code)
export function debounceCache<T extends (...args: any[]) => any>(
  fn: T,
  keyFn: (...args: Parameters<T>) => string,
  delay: number = 1000
): T {
  const cache = FastCache.getInstance();
  let debounceTimer: NodeJS.Timeout;

  return ((...args: Parameters<T>) => {
    const key = keyFn(...args);
    const cached = cache.get<ReturnType<T>>(key);

    if (cached !== undefined) {
      return cached;
    }

    return new Promise<ReturnType<T>>(resolve => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const result = await fn(...args);
        cache.set(key, result, 300); // Cache for 5 minutes
        resolve(result);
      }, delay);
    });
  }) as T;
}
