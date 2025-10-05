export declare class WorkerPoolManager {
  private workers;
  private taskQueue;
  private maxWorkers;
  private activeWorkers;
  constructor(maxWorkers?: number);
  initialize(): Promise<void>;
  executeTask<T>(taskData: WorkerTask): Promise<T>;
  executeBatch(tasks: WorkerTask[]): Promise<any[]>;
  getStats(): WorkerPoolStats;
  cleanup(): Promise<void>;
  private createWorker;
  private processQueue;
}
export interface WorkerTask {
  type: 'code_analysis' | 'performance_check' | 'file_processing' | 'custom';
  data: any;
  options?: {
    timeout?: number;
    priority?: 'low' | 'normal' | 'high';
  };
}
export interface WorkerPoolStats {
  totalWorkers: number;
  activeWorkers: number;
  queuedTasks: number;
  maxWorkers: number;
}
//# sourceMappingURL=WorkerPoolManager.d.ts.map
