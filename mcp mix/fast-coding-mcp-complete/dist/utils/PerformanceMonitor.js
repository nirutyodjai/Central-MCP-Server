// Performance monitoring system inspired by Kilo Code
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
  }
  // Record operation start time
  startOperation(operationId) {
    this.startTimes.set(operationId, Date.now());
  }
  // Record operation completion
  endOperation(operationId, success = true) {
    const startTime = this.startTimes.get(operationId);
    if (!startTime) {
      console.warn(`No start time found for operation: ${operationId}`);
      return;
    }
    const duration = Date.now() - startTime;
    this.recordMetric(operationId, duration, success);
    this.startTimes.delete(operationId);
  }
  // Record cache hit/miss
  recordCacheHit(type) {
    this.recordMetric(`cache_${type}_hit`, 0, true);
  }
  recordCacheMiss(type) {
    this.recordMetric(`cache_${type}_miss`, 0, true);
  }
  // Record tool execution
  recordToolExecution(toolName, duration) {
    this.recordMetric(`tool_${toolName}`, duration, true);
  }
  // Record tool error
  recordToolError(toolName, duration) {
    this.recordMetric(`tool_${toolName}`, duration, false);
  }
  // Get performance statistics
  getStats() {
    const stats = {
      operations: {},
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
      },
      tools: {},
      summary: {
        totalOperations: 0,
        averageResponseTime: 0,
        successRate: 0,
      },
    };
    let totalResponseTime = 0;
    let totalOperations = 0;
    let totalSuccesses = 0;
    for (const [key, data] of this.metrics) {
      if (key.startsWith('cache_')) {
        if (key.includes('_hit')) {
          stats.cache.hits += data.count;
        } else if (key.includes('_miss')) {
          stats.cache.misses += data.count;
        }
      } else if (key.startsWith('tool_')) {
        const toolName = key.replace('tool_', '');
        stats.tools[toolName] = {
          executions: data.count,
          averageTime: data.totalTime / data.count,
          successRate: data.successCount / data.count,
        };
      } else if (key.startsWith('operation_')) {
        const opName = key.replace('operation_', '');
        stats.operations[opName] = {
          executions: data.count,
          averageTime: data.totalTime / data.count,
          successRate: data.successCount / data.count,
        };
      }
      totalResponseTime += data.totalTime;
      totalOperations += data.count;
      totalSuccesses += data.successCount;
    }
    // Calculate cache hit rate
    const totalCacheOps = stats.cache.hits + stats.cache.misses;
    stats.cache.hitRate =
      totalCacheOps > 0 ? stats.cache.hits / totalCacheOps : 0;
    // Calculate summary stats
    stats.summary = {
      totalOperations,
      averageResponseTime:
        totalOperations > 0 ? totalResponseTime / totalOperations : 0,
      successRate: totalOperations > 0 ? totalSuccesses / totalOperations : 0,
    };
    return stats;
  }
  // Reset all metrics
  reset() {
    this.metrics.clear();
    this.startTimes.clear();
  }
  // Get slow operations for optimization
  getSlowOperations(threshold = 1000) {
    const slowOps = [];
    for (const [key, data] of this.metrics) {
      if (key.startsWith('operation_') || key.startsWith('tool_')) {
        const averageTime = data.totalTime / data.count;
        if (averageTime > threshold) {
          const operation = key.replace(/^(operation_|tool_)/, '');
          slowOps.push({ operation, averageTime });
        }
      }
    }
    return slowOps.sort((a, b) => b.averageTime - a.averageTime);
  }
  recordMetric(key, duration, success) {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        totalTime: 0,
        successCount: 0,
        errorCount: 0,
      });
    }
    const data = this.metrics.get(key);
    data.count++;
    data.totalTime += duration;
    if (success) {
      data.successCount++;
    } else {
      data.errorCount++;
    }
  }
}
// Debounce utility for performance optimization
export function debounce(func, wait, immediate = false) {
  let timeout = null;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}
// Throttle utility for rate limiting
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
// Batch processor for handling multiple operations
export class BatchProcessor {
  constructor(processor, delay = 100, batchSize = 10) {
    this.items = [];
    this.timeout = null;
    this.processor = processor;
    this.delay = delay;
    this.batchSize = batchSize;
  }
  add(item) {
    this.items.push(item);
    if (this.items.length >= this.batchSize) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }
  scheduleFlush() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.timeout = setTimeout(() => {
      this.flush();
    }, this.delay);
  }
  async flush() {
    if (this.items.length === 0) return;
    const itemsToProcess = [...this.items];
    this.items = [];
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    try {
      await this.processor(itemsToProcess);
    } catch (error) {
      console.error('Batch processing error:', error);
    }
  }
  async forceFlush() {
    await this.flush();
  }
}
//# sourceMappingURL=PerformanceMonitor.js.map
