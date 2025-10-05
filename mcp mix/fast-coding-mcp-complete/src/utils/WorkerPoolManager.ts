import { Worker } from 'worker_threads';
import path from 'path';
import os from 'os';

// Worker Pool Manager for high-performance concurrent processing
export class WorkerPoolManager {
  private workers: Worker[] = [];
  private taskQueue: Array<{ task: any; resolve: Function; reject: Function }> =
    [];
  private maxWorkers: number;
  private activeWorkers = 0;

  constructor(maxWorkers?: number) {
    this.maxWorkers = maxWorkers || Math.max(1, os.cpus().length - 1);
  }

  // Initialize worker pool
  async initialize(): Promise<void> {
    console.log(
      `🏭 Initializing worker pool with ${this.maxWorkers} workers...`
    );

    for (let i = 0; i < this.maxWorkers; i++) {
      await this.createWorker();
    }

    console.log(
      `✅ Worker pool initialized with ${this.workers.length} workers`
    );
  }

  // Execute task in worker pool
  async executeTask<T>(taskData: WorkerTask): Promise<T> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ task: taskData, resolve, reject });
      this.processQueue();
    });
  }

  // Execute multiple tasks concurrently
  async executeBatch(tasks: WorkerTask[]): Promise<any[]> {
    const promises = tasks.map(task => this.executeTask(task));
    return Promise.allSettled(promises);
  }

  // Get pool statistics
  getStats(): WorkerPoolStats {
    return {
      totalWorkers: this.workers.length,
      activeWorkers: this.activeWorkers,
      queuedTasks: this.taskQueue.length,
      maxWorkers: this.maxWorkers,
    };
  }

  // Cleanup worker pool
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up worker pool...');

    // Wait for all tasks to complete
    while (this.taskQueue.length > 0 || this.activeWorkers > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Terminate all workers
    for (const worker of this.workers) {
      await worker.terminate();
    }

    this.workers = [];
    this.taskQueue = [];
    this.activeWorkers = 0;

    console.log('✅ Worker pool cleaned up');
  }

  // Private methods

  private async createWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'worker.js');
      const worker = new Worker(workerPath);

      worker.on('online', () => {
        this.workers.push(worker);
        resolve();
      });

      worker.on('error', error => {
        console.error('Worker error:', error);
        reject(error);
      });

      worker.on('message', result => {
        this.activeWorkers--;
        this.processQueue();
      });

      worker.on('exit', code => {
        console.log(`Worker exited with code ${code}`);
        const index = this.workers.indexOf(worker);
        if (index > -1) {
          this.workers.splice(index, 1);
        }
      });
    });
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0 || this.activeWorkers >= this.maxWorkers) {
      return;
    }

    const availableWorkers = this.maxWorkers - this.activeWorkers;
    const tasksToProcess = this.taskQueue.splice(0, availableWorkers);

    for (const { task, resolve, reject } of tasksToProcess) {
      const worker = this.workers[this.workers.length - 1]; // Simple load balancing

      if (worker) {
        this.activeWorkers++;

        worker.postMessage(task);

        // Handle worker response
        const messageHandler = (result: any) => {
          worker.removeListener('message', messageHandler);

          if (result.success) {
            resolve(result.data);
          } else {
            reject(new Error(result.error));
          }
        };

        worker.on('message', messageHandler);
      }
    }
  }
}

// Worker task types
export interface WorkerTask {
  type: 'code_analysis' | 'performance_check' | 'file_processing' | 'custom';
  data: any;
  options?: {
    timeout?: number;
    priority?: 'low' | 'normal' | 'high';
  };
}

// Worker pool statistics
export interface WorkerPoolStats {
  totalWorkers: number;
  activeWorkers: number;
  queuedTasks: number;
  maxWorkers: number;
}
