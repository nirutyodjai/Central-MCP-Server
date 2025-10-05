export declare class PerformanceMonitor {
  private metrics;
  private startTimes;
  startOperation(operationId: string): void;
  endOperation(operationId: string, success?: boolean): void;
  recordCacheHit(type: string): void;
  recordCacheMiss(type: string): void;
  recordToolExecution(toolName: string, duration: number): void;
  recordToolError(toolName: string, duration: number): void;
  getStats(): PerformanceStats;
  reset(): void;
  getSlowOperations(threshold?: number): Array<{
    operation: string;
    averageTime: number;
  }>;
  private recordMetric;
}
export declare function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void;
export declare function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void;
export declare class BatchProcessor<T, R> {
  private items;
  private processor;
  private delay;
  private batchSize;
  private timeout;
  constructor(
    processor: (items: T[]) => Promise<R[]>,
    delay?: number,
    batchSize?: number
  );
  add(item: T): void;
  private scheduleFlush;
  private flush;
  forceFlush(): Promise<void>;
}
export interface PerformanceStats {
  operations: Record<
    string,
    {
      executions: number;
      averageTime: number;
      successRate: number;
    }
  >;
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  tools: Record<
    string,
    {
      executions: number;
      averageTime: number;
      successRate: number;
    }
  >;
  summary: {
    totalOperations: number;
    averageResponseTime: number;
    successRate: number;
  };
}
//# sourceMappingURL=PerformanceMonitor.d.ts.map
