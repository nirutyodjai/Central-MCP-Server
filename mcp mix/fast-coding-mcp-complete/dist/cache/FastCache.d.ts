export declare class FastCache {
  private memoryCache;
  private persistentCache;
  private static instance;
  private constructor();
  static getInstance(): FastCache;
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): boolean;
  delete(key: string): void;
  clear(): void;
  getStats(): {
    memoryCache: {
      size: number;
      maxSize: number;
      calculatedSize: number;
    };
    persistentCache: {
      keys: number;
      hits: number;
      misses: number;
      ksize: number;
      vsize: number;
    };
  };
  batchGet<T>(keys: string[]): Promise<Map<string, T | undefined>>;
  batchSet<T>(
    entries: Array<{
      key: string;
      value: T;
      ttl?: number;
    }>
  ): Promise<boolean>;
  private isImportantData;
}
export declare function debounceCache<T extends (...args: any[]) => any>(
  fn: T,
  keyFn: (...args: Parameters<T>) => string,
  delay?: number
): T;
//# sourceMappingURL=FastCache.d.ts.map
