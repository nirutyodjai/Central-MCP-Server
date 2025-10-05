import Database from 'better-sqlite3';
import { GitManager } from './GitIntegration.js';

// Database integration for persistence and analytics
export class DatabaseManager {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string = './data/fast-coding-mcp.db') {
    this.dbPath = dbPath;
  }

  // Initialize database connection
  async initialize(): Promise<void> {
    try {
      // Ensure directory exists
      const fs = await import('fs/promises');
      const path = await import('path');
      const dbDir = path.dirname(this.dbPath);

      try {
        await fs.access(dbDir);
      } catch {
        await fs.mkdir(dbDir, { recursive: true });
      }

      // Initialize database
      this.db = new Database(this.dbPath);

      // Enable WAL mode for better performance
      this.db.pragma('journal_mode = WAL');

      // Create tables
      await this.createTables();

      console.log(`✅ Database initialized: ${this.dbPath}`);
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  // Create database tables
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      // Operations log
      `CREATE TABLE IF NOT EXISTS operations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        operation_type TEXT NOT NULL,
        client_id TEXT,
        tool_name TEXT,
        duration INTEGER,
        success BOOLEAN,
        error_message TEXT,
        metadata TEXT
      )`,

      // Performance metrics
      `CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        tags TEXT,
        metadata TEXT
      )`,

      // Cache statistics
      `CREATE TABLE IF NOT EXISTS cache_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        cache_type TEXT NOT NULL,
        hits INTEGER DEFAULT 0,
        misses INTEGER DEFAULT 0,
        size INTEGER DEFAULT 0,
        metadata TEXT
      )`,

      // Alerts and notifications
      `CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        resolved BOOLEAN DEFAULT FALSE,
        metadata TEXT
      )`,

      // Code analysis results
      `CREATE TABLE IF NOT EXISTS code_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        language TEXT,
        complexity INTEGER,
        maintainability REAL,
        issues TEXT,
        suggestions TEXT,
        metadata TEXT
      )`,
    ];

    for (const tableSQL of tables) {
      this.db.exec(tableSQL);
    }

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_operations_timestamp ON operations(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_operations_type ON operations(operation_type)',
      'CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name)',
      'CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type)',
      'CREATE INDEX IF NOT EXISTS idx_code_analysis_path ON code_analysis(file_path)',
      'CREATE INDEX IF NOT EXISTS idx_code_analysis_timestamp ON code_analysis(timestamp)',
    ];

    for (const indexSQL of indexes) {
      this.db.exec(indexSQL);
    }
  }

  // Log operation
  logOperation(operation: OperationLog): void {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO operations (timestamp, operation_type, client_id, tool_name, duration, success, error_message, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      operation.timestamp,
      operation.operationType,
      operation.clientId,
      operation.toolName,
      operation.duration,
      operation.success,
      operation.errorMessage,
      JSON.stringify(operation.metadata || {})
    );
  }

  // Record performance metric
  recordMetric(metric: PerformanceMetric): void {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO metrics (timestamp, metric_name, metric_value, tags, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      metric.timestamp,
      metric.name,
      metric.value,
      JSON.stringify(metric.tags || {}),
      JSON.stringify(metric.metadata || {})
    );
  }

  // Record cache statistics
  recordCacheStats(stats: CacheStats): void {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO cache_stats (timestamp, cache_type, hits, misses, size, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      stats.timestamp,
      stats.cacheType,
      stats.hits,
      stats.misses,
      stats.size,
      JSON.stringify(stats.metadata || {})
    );
  }

  // Log alert
  logAlert(alert: AlertLog): void {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO alerts (timestamp, alert_type, severity, message, resolved, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      alert.timestamp,
      alert.type,
      alert.severity,
      alert.message,
      alert.resolved || false,
      JSON.stringify(alert.metadata || {})
    );
  }

  // Store code analysis results
  storeCodeAnalysis(analysis: CodeAnalysisResult): void {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO code_analysis (timestamp, file_path, language, complexity, maintainability, issues, suggestions, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      analysis.timestamp,
      analysis.filePath,
      analysis.language,
      analysis.complexity,
      analysis.maintainability,
      JSON.stringify(analysis.issues || []),
      JSON.stringify(analysis.suggestions || []),
      JSON.stringify(analysis.metadata || {})
    );
  }

  // Get operation statistics
  getOperationStats(startTime?: number, endTime?: number): OperationStats {
    if (!this.db)
      return { total: 0, successful: 0, failed: 0, averageDuration: 0 };

    const end = endTime || Date.now();
    const start = startTime || end - 24 * 60 * 60 * 1000; // Last 24 hours

    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed,
        AVG(duration) as avg_duration
      FROM operations
      WHERE timestamp BETWEEN ? AND ?
    `);

    const result = stmt.get(start, end) as any;

    return {
      total: result.total || 0,
      successful: result.successful || 0,
      failed: result.failed || 0,
      averageDuration: result.avg_duration || 0,
    };
  }

  // Get performance trends
  getPerformanceTrends(hours: number = 24): MetricTrend[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT
        metric_name,
        AVG(metric_value) as avg_value,
        MIN(metric_value) as min_value,
        MAX(metric_value) as max_value,
        COUNT(*) as data_points,
        (strftime('%s', 'now') - strftime('%s', datetime(timestamp/1000, 'unixepoch'))) as hours_ago
      FROM metrics
      WHERE timestamp > ?
      GROUP BY metric_name
      ORDER BY metric_name
    `);

    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const results = stmt.all(cutoff) as any[];

    return results.map(result => ({
      metricName: result.metric_name,
      averageValue: result.avg_value,
      minValue: result.min_value,
      maxValue: result.max_value,
      dataPoints: result.data_points,
      trend: this.calculateTrend(result.metric_name, hours),
    }));
  }

  // Get recent alerts
  getRecentAlerts(limit: number = 50): AlertLog[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT * FROM alerts
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const results = stmt.all(limit) as any[];

    return results.map(result => ({
      id: result.id,
      timestamp: result.timestamp,
      type: result.alert_type,
      severity: result.severity,
      message: result.message,
      resolved: result.resolved,
      metadata: JSON.parse(result.metadata || '{}'),
    }));
  }

  // Clean up old data
  async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    if (!this.db) return;

    const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    const tables = [
      'operations',
      'metrics',
      'cache_stats',
      'alerts',
      'code_analysis',
    ];

    for (const table of tables) {
      const stmt = this.db.prepare(`DELETE FROM ${table} WHERE timestamp < ?`);
      const deleted = stmt.run(cutoff);

      if (deleted.changes > 0) {
        console.log(
          `🧹 Cleaned up ${deleted.changes} old records from ${table}`
        );
      }
    }

    // Vacuum database to reclaim space
    this.db.exec('VACUUM');
  }

  // Close database connection
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('🗄️ Database connection closed');
    }
  }

  private calculateTrend(
    metricName: string,
    hours: number
  ): 'up' | 'down' | 'stable' {
    // Simple trend calculation based on recent data
    // In a real implementation, this would analyze the trend over time
    return 'stable';
  }
}

// Git integration for version control operations
export class GitIntegration {
  private gitManager: GitManager;

  constructor(repoPath?: string) {
    this.gitManager = new GitManager(repoPath);
  }

  // Initialize git repository
  async initialize(): Promise<void> {
    await this.gitManager.initialize();
  }

  // Get repository status
  async getStatus(): Promise<GitStatus> {
    return await this.gitManager.getStatus();
  }

  // Get commit history
  async getCommitHistory(limit: number = 50): Promise<GitCommit[]> {
    return await this.gitManager.getCommitHistory(limit);
  }

  // Get current branch
  async getCurrentBranch(): Promise<string> {
    return await this.gitManager.getCurrentBranch();
  }

  // Get available branches
  async getBranches(): Promise<string[]> {
    return await this.gitManager.getBranches();
  }

  // Create new branch
  async createBranch(branchName: string): Promise<boolean> {
    return await this.gitManager.createBranch(branchName);
  }

  // Switch to branch
  async switchBranch(branchName: string): Promise<boolean> {
    return await this.gitManager.switchBranch(branchName);
  }

  // Stage files
  async stageFiles(files: string[]): Promise<boolean> {
    return await this.gitManager.stageFiles(files);
  }

  // Commit changes
  async commit(message: string): Promise<boolean> {
    return await this.gitManager.commit(message);
  }

  // Push changes
  async push(remote: string = 'origin'): Promise<boolean> {
    return await this.gitManager.push(remote);
  }

  // Pull changes
  async pull(remote: string = 'origin'): Promise<boolean> {
    return await this.gitManager.pull(remote);
  }

  // Get file history
  async getFileHistory(filePath: string): Promise<GitFileHistory[]> {
    return await this.gitManager.getFileHistory(filePath);
  }

  // Get blame information
  async getBlame(filePath: string): Promise<GitBlame[]> {
    return await this.gitManager.getBlame(filePath);
  }
}

// Types for database operations
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

// Git-related types
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
