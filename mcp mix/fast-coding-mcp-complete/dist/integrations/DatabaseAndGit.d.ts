export declare class DatabaseManager {
  private db;
  private dbPath;
  constructor(dbPath?: string);
  initialize(): Promise<void>;
  private createTables;
  logOperation(operation: OperationLog): void;
  recordMetric(metric: PerformanceMetric): void;
  recordCacheStats(stats: CacheStats): void;
  logAlert(alert: AlertLog): void;
  storeCodeAnalysis(analysis: CodeAnalysisResult): void;
  getOperationStats(startTime?: number, endTime?: number): OperationStats;
  getPerformanceTrends(hours?: number): MetricTrend[];
  getRecentAlerts(limit?: number): AlertLog[];
  cleanupOldData(daysToKeep?: number): Promise<void>;
  close(): Promise<void>;
  private calculateTrend;
}
export declare class GitIntegration {
  private gitManager;
  constructor(repoPath?: string);
  initialize(): Promise<void>;
  getStatus(): Promise<GitStatus>;
  getCommitHistory(limit?: number): Promise<GitCommit[]>;
  getCurrentBranch(): Promise<string>;
  getBranches(): Promise<string[]>;
  createBranch(branchName: string): Promise<boolean>;
  switchBranch(branchName: string): Promise<boolean>;
  stageFiles(files: string[]): Promise<boolean>;
  commit(message: string): Promise<boolean>;
  push(remote?: string): Promise<boolean>;
  pull(remote?: string): Promise<boolean>;
  getFileHistory(filePath: string): Promise<GitFileHistory[]>;
  getBlame(filePath: string): Promise<GitBlame[]>;
}
interface OperationLog {
  timestamp: number;
  operationType: string;
  clientId?: string;
  toolName?: string;
  duration?: number;
  success: boolean;
  errorMessage?: string;
  metadata?: any;
}
interface PerformanceMetric {
  timestamp: number;
  name: string;
  value: number;
  tags?: Record<string, string>;
  metadata?: any;
}
interface CacheStats {
  timestamp: number;
  cacheType: string;
  hits: number;
  misses: number;
  size: number;
  metadata?: any;
}
interface AlertLog {
  timestamp: number;
  type: string;
  severity: string;
  message: string;
  resolved?: boolean;
  metadata?: any;
}
interface CodeAnalysisResult {
  timestamp: number;
  filePath: string;
  language?: string;
  complexity: number;
  maintainability: number;
  issues?: string[];
  suggestions?: string[];
  metadata?: any;
}
interface OperationStats {
  total: number;
  successful: number;
  failed: number;
  averageDuration: number;
}
interface MetricTrend {
  metricName: string;
  averageValue: number;
  minValue: number;
  maxValue: number;
  dataPoints: number;
  trend: 'up' | 'down' | 'stable';
}
interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  modified: string[];
  staged: string[];
  untracked: string[];
  clean: boolean;
}
interface GitCommit {
  hash: string;
  message: string;
  author: string;
  email: string;
  timestamp: number;
  parents: string[];
}
interface GitFileHistory {
  commit: string;
  author: string;
  timestamp: number;
  message: string;
  changes: number;
}
interface GitBlame {
  line: number;
  commit: string;
  author: string;
  timestamp: number;
  code: string;
}
export {};
//# sourceMappingURL=DatabaseAndGit.d.ts.map
