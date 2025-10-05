/**
 * High-Performance Async/Await Optimization and Worker Threads
 * ระบบ async/await และ worker threads ที่ปรับแต่งประสิทธิภาพสูงสุด
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import * as path from 'path';
import * as os from 'os';

export interface WorkerTask<T = any> {
  id: string;
  type: string;
  data: T;
  priority: number; // 1-10, higher = more priority
  timeout: number; // milliseconds
}

export interface WorkerResult<T = any> {
  taskId: string;
  success: boolean;
  data?: T;
  error?: string;
  executionTime: number;
}

export interface AsyncConfig {
  // Worker Pool Configuration
  workerPool: {
    enabled: boolean;
    minWorkers: number;
    maxWorkers: number;
    maxTasksPerWorker: number;
    idleTimeout: number;
    taskTimeout: number;
  };

  // Async/Await Configuration
  concurrency: {
    maxConcurrent: number;
    maxQueueSize: number;
    retryAttempts: number;
    retryDelay: number;
  };

  // Performance Monitoring
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    enableDetailedLogging: boolean;
  };
}

export interface AsyncMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
  activeWorkers: number;
  queuedTasks: number;
  throughput: number; // tasks per second
}

/**
 * High-Performance Worker Pool Manager
 */
export class HighPerformanceWorkerPool {
  private workers: Map<string, Worker> = new Map();
  private taskQueue: WorkerTask[] = [];
  private activeTasks = new Map<string, WorkerTask>();
  private config: AsyncConfig;
  private metrics: AsyncMetrics;
  private isShuttingDown: boolean = false;

  constructor(config: AsyncConfig) {
    this.config = config;
    this.metrics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageExecutionTime: 0,
      activeWorkers: 0,
      queuedTasks: 0,
      throughput: 0
    };

    if (config.workerPool.enabled) {
      this.initializeWorkerPool();
    }

    // Start metrics collection if enabled
    if (config.monitoring.enabled) {
      this.startMetricsCollection();
    }
  }

  /**
   * Initialize worker pool with optimal settings
   */
  private async initializeWorkerPool(): Promise<void> {
    console.log(`🏭 กำลังสร้าง worker pool (${this.config.workerPool.minWorkers}-${this.config.workerPool.maxWorkers} workers)...`);

    const numWorkers = Math.min(
      this.config.workerPool.minWorkers,
      os.cpus().length - 1 // Reserve one CPU for main thread
    );

    for (let i = 0; i < numWorkers; i++) {
      await this.createWorker();
    }

    console.log(`✅ สร้าง worker pool เสร็จสิ้น (${this.workers.size} workers)`);
  }

  /**
   * Create optimized worker
   */
  private async createWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      const workerPath = path.resolve(__dirname, 'worker.js');
      const worker = new Worker(workerPath, {
        workerData: {
          config: this.config
        }
      });

      worker.on('online', () => {
        const workerId = `worker_${this.workers.size}`;
        this.workers.set(workerId, worker);
        this.metrics.activeWorkers++;
        resolve();
      });

      worker.on('error', (error) => {
        console.error('❌ Worker error:', error);
        reject(error);
      });

      worker.on('exit', (code) => {
        this.metrics.activeWorkers--;
        console.log(`🔄 Worker exited with code ${code}`);
      });

      // Handle worker messages
      worker.on('message', (result: WorkerResult) => {
        this.handleWorkerResult(result);
      });
    });
  }

  /**
   * Execute task with high-performance optimizations
   */
  async executeTask<T>(task: WorkerTask<T>): Promise<WorkerResult<T>> {
    if (this.isShuttingDown) {
      throw new Error('Worker pool is shutting down');
    }

    return new Promise((resolve, reject) => {
      // Add timeout
      const timeout = setTimeout(() => {
        this.activeTasks.delete(task.id);
        this.metrics.failedTasks++;
        resolve({
          taskId: task.id,
          success: false,
          error: `Task timeout after ${task.timeout}ms`,
          executionTime: task.timeout
        });
      }, task.timeout);

      // Store task for tracking
      this.activeTasks.set(task.id, task);
      this.metrics.totalTasks++;
      this.metrics.queuedTasks++;

      // Execute in worker if enabled
      if (this.config.workerPool.enabled && this.workers.size > 0) {
        this.executeInWorker(task, timeout, resolve, reject);
      } else {
        // Execute in main thread with optimizations
        this.executeInMainThread(task, timeout, resolve, reject);
      }
    });
  }

  /**
   * Execute task in worker thread
   */
  private executeInWorker<T>(
    task: WorkerTask<T>,
    timeout: NodeJS.Timeout,
    resolve: (result: WorkerResult<T>) => void,
    reject: (error: Error) => void
  ): void {
    // Find available worker
    const availableWorker = Array.from(this.workers.entries())
      .find(([_, worker]) => {
        // Check if worker is not overloaded
        const activeTasksForWorker = Array.from(this.activeTasks.values())
          .filter(t => t.id.startsWith('worker_')).length;
        return activeTasksForWorker < this.config.workerPool.maxTasksPerWorker;
      });

    if (availableWorker) {
      const [workerId, worker] = availableWorker;

      // Send task to worker
      worker.postMessage(task);

      // Handle worker response
      const messageHandler = (result: WorkerResult) => {
        if (result.taskId === task.id) {
          clearTimeout(timeout);
          worker.removeListener('message', messageHandler);
          this.activeTasks.delete(task.id);
          resolve(result);
        }
      };

      worker.on('message', messageHandler);
    } else {
      // Queue task if no workers available
      this.taskQueue.push(task);
      this.taskQueue.sort((a, b) => b.priority - a.priority); // Higher priority first
    }
  }

  /**
   * Execute task in main thread with async optimizations
   */
  private async executeInMainThread<T>(
    task: WorkerTask<T>,
    timeout: NodeJS.Timeout,
    resolve: (result: WorkerResult<T>) => void,
    reject: (error: Error) => void
  ): Promise<void> {
    try {
      const startTime = Date.now();

      // Execute task based on type
      let result: T;

      switch (task.type) {
        case 'mcp-operation':
          result = await this.executeMCPOperation(task.data);
          break;
        case 'data-processing':
          result = await this.executeDataProcessing(task.data);
          break;
        case 'file-operation':
          result = await this.executeFileOperation(task.data);
          break;
        case 'network-request':
          result = await this.executeNetworkRequest(task.data);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      const executionTime = Date.now() - startTime;

      clearTimeout(timeout);
      this.activeTasks.delete(task.id);

      resolve({
        taskId: task.id,
        success: true,
        data: result,
        executionTime
      });

    } catch (error: any) {
      clearTimeout(timeout);
      this.activeTasks.delete(task.id);

      resolve({
        taskId: task.id,
        success: false,
        error: error.message,
        executionTime: task.timeout
      });
    }
  }

  /**
   * Execute MCP operation with optimizations
   */
  private async executeMCPOperation(data: any): Promise<any> {
    // Simulate MCP operation with async optimizations
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

    return {
      operation: 'mcp-operation',
      result: 'completed',
      timestamp: new Date().toISOString(),
      ...data
    };
  }

  /**
   * Execute data processing with optimizations
   */
  private async executeDataProcessing(data: any): Promise<any> {
    // Simulate data processing with async optimizations
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));

    return {
      operation: 'data-processing',
      processed: true,
      items: data.items || 1,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute file operation with optimizations
   */
  private async executeFileOperation(data: any): Promise<any> {
    // Simulate file operation with async optimizations
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200));

    return {
      operation: 'file-operation',
      file: data.file,
      action: data.action,
      success: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute network request with optimizations
   */
  private async executeNetworkRequest(data: any): Promise<any> {
    // Simulate network request with async optimizations
    await new Promise(resolve => setTimeout(resolve, Math.random() * 300));

    return {
      operation: 'network-request',
      url: data.url,
      method: data.method,
      status: 200,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handle worker result
   */
  private handleWorkerResult(result: WorkerResult): void {
    this.activeTasks.delete(result.taskId);

    if (result.success) {
      this.metrics.completedTasks++;
    } else {
      this.metrics.failedTasks++;
    }

    // Process next queued task
    if (this.taskQueue.length > 0) {
      const nextTask = this.taskQueue.shift()!;
      this.executeTask(nextTask);
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateMetrics();
    }, this.config.monitoring.metricsInterval);
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    const totalTime = this.metrics.completedTasks * this.metrics.averageExecutionTime;
    this.metrics.averageExecutionTime = this.metrics.completedTasks > 0 ?
      totalTime / this.metrics.completedTasks : 0;

    // Calculate throughput (tasks per second)
    const elapsedSeconds = this.config.monitoring.metricsInterval / 1000;
    this.metrics.throughput = this.metrics.completedTasks / elapsedSeconds;

    this.metrics.queuedTasks = this.taskQueue.length;
    this.metrics.activeWorkers = this.workers.size;

    if (this.config.monitoring.enableDetailedLogging) {
      console.log('📊 Worker Pool Metrics:', this.metrics);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): AsyncMetrics {
    return { ...this.metrics };
  }

  /**
   * Shutdown worker pool gracefully
   */
  async shutdown(): Promise<void> {
    console.log('🔄 กำลังปิด worker pool...');

    this.isShuttingDown = true;

    // Wait for active tasks to complete
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.activeTasks.size > 0 && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Terminate all workers
    for (const [workerId, worker] of this.workers) {
      worker.terminate();
    }

    this.workers.clear();
    console.log('✅ Worker pool ปิดแล้ว');
  }
}

/**
 * High-Performance Async Utilities
 */
export class HighPerformanceAsyncUtils {
  private static workerPool?: HighPerformanceWorkerPool;

  /**
   * Initialize async utilities with worker pool
   */
  static initialize(config: AsyncConfig): void {
    this.workerPool = new HighPerformanceWorkerPool(config);
  }

  /**
   * Execute tasks in parallel with optimized concurrency
   */
  static async parallel<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    options: {
      concurrency?: number;
      continueOnError?: boolean;
      timeout?: number;
    } = {}
  ): Promise<R[]> {
    const concurrency = options.concurrency || os.cpus().length;
    const results: R[] = [];
    const errors: Error[] = [];

    // Process items in batches based on concurrency
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);

      const batchPromises = batch.map(async (item, index) => {
        try {
          return await Promise.race([
            processor(item, i + index),
            options.timeout ? new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), options.timeout)
            ) : Promise.resolve()
          ]);
        } catch (error) {
          if (options.continueOnError) {
            errors.push(error as Error);
            return null;
          } else {
            throw error;
          }
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value !== null) {
          results.push(result.value);
        }
      }
    }

    if (errors.length > 0 && !options.continueOnError) {
      throw errors[0];
    }

    return results;
  }

  /**
   * Execute task with worker pool if available
   */
  static async executeWithWorker<T>(task: WorkerTask<T>): Promise<WorkerResult<T>> {
    if (this.workerPool) {
      return this.workerPool.executeTask(task);
    } else {
      // Fallback to main thread execution
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            taskId: task.id,
            success: true,
            data: task.data,
            executionTime: 0
          });
        }, 0);
      });
    }
  }

  /**
   * Batch process with automatic retry and circuit breaker
   */
  static async batchProcess<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    options: {
      batchSize?: number;
      retryAttempts?: number;
      retryDelay?: number;
      circuitBreakerThreshold?: number;
    } = {}
  ): Promise<R[]> {
    const batchSize = options.batchSize || 10;
    const retryAttempts = options.retryAttempts || 3;
    const retryDelay = options.retryDelay || 1000;
    const circuitBreakerThreshold = options.circuitBreakerThreshold || 5;

    const results: R[] = [];
    let consecutiveFailures = 0;

    // Process in batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      // Circuit breaker check
      if (consecutiveFailures >= circuitBreakerThreshold) {
        throw new Error(`Circuit breaker opened after ${consecutiveFailures} consecutive failures`);
      }

      // Retry logic
      let attempt = 0;
      let lastError: Error;

      while (attempt < retryAttempts) {
        try {
          const batchResults = await processor(batch);
          results.push(...batchResults);

          consecutiveFailures = 0; // Reset on success
          break;

        } catch (error) {
          lastError = error as Error;
          attempt++;

          if (attempt < retryAttempts) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          }
        }
      }

      if (attempt >= retryAttempts) {
        consecutiveFailures++;
        console.error(`❌ Batch processing failed after ${retryAttempts} attempts:`, lastError);
      }
    }

    return results;
  }

  /**
   * Debounce function with high-performance optimizations
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    options: {
      leading?: boolean;
      trailing?: boolean;
      maxWait?: number;
    } = {}
  ): T {
    const { leading = false, trailing = true, maxWait } = options;

    let timeoutId: NodeJS.Timeout | null = null;
    let maxTimeoutId: NodeJS.Timeout | null = null;
    let lastCallTime = 0;
    let lastInvokeTime = 0;
    let lastArgs: any[] | null = null;

    const invokeFunc = (args: any[]) => {
      lastInvokeTime = Date.now();
      func(...args);
    };

    return ((...args: any[]) => {
      const now = Date.now();
      lastArgs = args;

      if (maxWait && now - lastCallTime >= maxWait) {
        if (maxTimeoutId) {
          clearTimeout(maxTimeoutId);
        }
        invokeFunc(args);
        lastCallTime = now;
        return;
      }

      if (leading && !timeoutId) {
        invokeFunc(args);
      }

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        if (trailing && lastArgs) {
          invokeFunc(lastArgs);
          lastCallTime = Date.now();
        }
        timeoutId = null;
      }, wait);

    }) as T;
  }

  /**
   * Throttle function with high-performance optimizations
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number,
    options: {
      leading?: boolean;
      trailing?: boolean;
    } = {}
  ): T {
    const { leading = true, trailing = true } = options;

    let inThrottle = false;
    let lastResult: any;
    let lastArgs: any[] | null = null;

    return ((...args: any[]) => {
      if (!inThrottle) {
        if (leading) {
          lastResult = func(...args);
        }
        inThrottle = true;

        setTimeout(() => {
          inThrottle = false;
          if (trailing && lastArgs && !leading) {
            lastResult = func(...lastArgs);
          }
          lastArgs = null;
        }, limit);

        return lastResult;
      } else {
        lastArgs = args;
        return lastResult;
      }
    }) as T;
  }

  /**
   * Memory-efficient async iterator
   */
  static async *asyncIterator<T>(
    items: T[],
    options: {
      batchSize?: number;
      delay?: number;
    } = {}
  ): AsyncIterableIterator<T> {
    const batchSize = options.batchSize || 100;
    const delay = options.delay || 0;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      for (const item of batch) {
        yield item;
      }
    }
  }

  /**
   * Get performance metrics
   */
  static getMetrics(): AsyncMetrics | null {
    return this.workerPool?.getMetrics() || null;
  }

  /**
   * Shutdown async utilities
   */
  static async shutdown(): Promise<void> {
    if (this.workerPool) {
      await this.workerPool.shutdown();
    }
  }
}

/**
 * Worker thread implementation for high-performance operations
 */
if (!isMainThread && workerData) {
  parentPort!.on('message', async (task: WorkerTask) => {
    const startTime = Date.now();

    try {
      let result: any;

      // Execute task based on type in worker thread
      switch (task.type) {
        case 'cpu-intensive':
          result = await executeCPUIntensiveTask(task.data);
          break;
        case 'io-intensive':
          result = await executeIOIntensiveTask(task.data);
          break;
        case 'memory-intensive':
          result = await executeMemoryIntensiveTask(task.data);
          break;
        default:
          throw new Error(`Unknown task type in worker: ${task.type}`);
      }

      const executionTime = Date.now() - startTime;

      parentPort!.postMessage({
        taskId: task.id,
        success: true,
        data: result,
        executionTime
      });

    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      parentPort!.postMessage({
        taskId: task.id,
        success: false,
        error: error.message,
        executionTime
      });
    }
  });
}

/**
 * CPU-intensive task execution
 */
async function executeCPUIntensiveTask(data: any): Promise<any> {
  // Simulate CPU-intensive operation
  let result = 0;
  for (let i = 0; i < (data.iterations || 1000000); i++) {
    result += Math.random() * Math.sin(i);
  }

  return {
    type: 'cpu-intensive',
    result: result,
    iterations: data.iterations,
    timestamp: new Date().toISOString()
  };
}

/**
 * I/O-intensive task execution
 */
async function executeIOIntensiveTask(data: any): Promise<any> {
  // Simulate I/O-intensive operation
  await new Promise(resolve => setTimeout(resolve, data.delay || 100));

  return {
    type: 'io-intensive',
    result: 'completed',
    delay: data.delay,
    timestamp: new Date().toISOString()
  };
}

/**
 * Memory-intensive task execution
 */
async function executeMemoryIntensiveTask(data: any): Promise<any> {
  // Simulate memory-intensive operation
  const arrays: number[][] = [];

  for (let i = 0; i < (data.arrays || 10); i++) {
    const array = new Array(data.size || 10000).fill(0).map(() => Math.random());
    arrays.push(array);
  }

  return {
    type: 'memory-intensive',
    arrays: arrays.length,
    totalSize: arrays.length * (data.size || 10000),
    timestamp: new Date().toISOString()
  };
}

/**
 * Create optimized async configuration for MCP Platform
 */
export function createOptimizedAsyncConfig(): AsyncConfig {
  const cpuCount = os.cpus().length;

  return {
    workerPool: {
      enabled: true,
      minWorkers: Math.max(1, cpuCount - 2),
      maxWorkers: cpuCount - 1,
      maxTasksPerWorker: 5,
      idleTimeout: 30000,
      taskTimeout: 60000
    },
    concurrency: {
      maxConcurrent: cpuCount * 2,
      maxQueueSize: 1000,
      retryAttempts: 3,
      retryDelay: 1000
    },
    monitoring: {
      enabled: true,
      metricsInterval: 10000,
      enableDetailedLogging: process.env.NODE_ENV === 'development'
    }
  };
}
