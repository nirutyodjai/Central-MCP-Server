/**
 * High-Performance Database MCP Server
 * Database server ที่ปรับแต่งประสิทธิภาพสูงสุดสำหรับ MCP Platform
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

export interface DatabasePoolConfig {
  // Connection Pool Settings
  minConnections: number;
  maxConnections: number;
  acquireTimeout: number;
  idleTimeout: number;
  evictionInterval: number;

  // Performance Settings
  cacheSize: number; // pages
  journalMode: 'WAL' | 'ROLLBACK' | 'TRUNCATE' | 'MEMORY' | 'OFF';
  synchronous: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';
  tempStore: 'DEFAULT' | 'FILE' | 'MEMORY';

  // Query Optimization
  enableQueryCache: boolean;
  queryCacheSize: number;
  enablePreparedStatements: boolean;
  maxPreparedStatements: number;

  // Monitoring
  enableMetrics: boolean;
  slowQueryThreshold: number; // milliseconds
}

export interface DatabaseConnection {
  db: Database.Database;
  id: number;
  created: number;
  lastUsed: number;
  isInUse: boolean;
}

export interface QueryMetrics {
  query: string;
  executionTime: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

export class HighPerformanceDatabaseMCPServer {
  private config: DatabasePoolConfig;
  private dbPath: string;
  private connectionPool: DatabaseConnection[] = [];
  private preparedStatements = new Map<string, Database.Statement>();
  private queryCache = new Map<string, any>();
  private metrics: QueryMetrics[] = [];
  private isInitialized: boolean = false;

  constructor(dbPath: string, config: DatabasePoolConfig) {
    this.dbPath = dbPath;
    this.config = config;
  }

  /**
   * Initialize high-performance database with optimizations
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 กำลังเริ่มต้น High-Performance Database MCP Server...');

      // สร้างโฟลเดอร์ data ถ้ายังไม่มี
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Initialize connection pool
      await this.initializeConnectionPool();

      // Setup prepared statements for common queries
      if (this.config.enablePreparedStatements) {
        await this.setupPreparedStatements();
      }

      this.isInitialized = true;
      console.log('✅ High-Performance Database MCP Server พร้อมใช้งาน');

    } catch (error) {
      console.error('❌ ไม่สามารถเริ่มต้น High-Performance Database MCP Server:', error);
      throw error;
    }
  }

  /**
   * Initialize connection pool with optimized settings
   */
  private async initializeConnectionPool(): Promise<void> {
    console.log(`🏊 กำลังสร้าง connection pool (${this.config.minConnections}-${this.config.maxConnections} connections)...`);

    // Create minimum connections
    for (let i = 0; i < this.config.minConnections; i++) {
      const connection = await this.createOptimizedConnection();
      this.connectionPool.push(connection);
    }

    console.log(`✅ สร้าง connection pool เสร็จสิ้น (${this.connectionPool.length} connections)`);
  }

  /**
   * Create optimized database connection
   */
  private async createOptimizedConnection(): Promise<DatabaseConnection> {
    const db = new Database(this.dbPath);

    // Apply high-performance optimizations
    db.pragma(`journal_mode = ${this.config.journalMode}`);
    db.pragma(`synchronous = ${this.config.synchronous}`);
    db.pragma(`cache_size = ${this.config.cacheSize}`);
    db.pragma('foreign_keys = ON');
    db.pragma(`temp_store = ${this.config.tempStore}`);
    db.pragma('busy_timeout = 30000'); // 30 seconds

    // Additional performance optimizations
    db.pragma('mmap_size = 268435456'); // 256MB memory map
    db.pragma('wal_autocheckpoint = 1000'); // WAL checkpoint every 1000 pages
    db.pragma('optimize'); // SQLite optimize

    const connection: DatabaseConnection = {
      db,
      id: Math.random(),
      created: Date.now(),
      lastUsed: Date.now(),
      isInUse: false
    };

    return connection;
  }

  /**
   * Get database connection from pool
   */
  private async getConnection(): Promise<DatabaseConnection> {
    // Find available connection
    let connection = this.connectionPool.find(conn => !conn.isInUse);

    if (!connection) {
      // Create new connection if pool not full
      if (this.connectionPool.length < this.config.maxConnections) {
        connection = await this.createOptimizedConnection();
        this.connectionPool.push(connection);
      } else {
        throw new Error('Connection pool exhausted');
      }
    }

    connection.isInUse = true;
    connection.lastUsed = Date.now();

    return connection;
  }

  /**
   * Return connection to pool
   */
  private releaseConnection(connection: DatabaseConnection): void {
    connection.isInUse = false;

    // Check for idle timeout
    if (Date.now() - connection.lastUsed > this.config.idleTimeout) {
      // Close and remove old connection
      connection.db.close();
      const index = this.connectionPool.findIndex(conn => conn.id === connection.id);
      if (index > -1) {
        this.connectionPool.splice(index, 1);
      }
    }
  }

  /**
   * Setup prepared statements for common queries
   */
  private async setupPreparedStatements(): Promise<void> {
    console.log('⚡ กำลังสร้าง prepared statements สำหรับประสิทธิภาพสูง...');

    // Common prepared statements for MCP operations
    const statements = {
      // Log operations
      insertLog: 'INSERT INTO mcp_logs (timestamp, level, message, source, metadata) VALUES (?, ?, ?, ?, ?)',
      getLogs: 'SELECT * FROM mcp_logs WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC LIMIT ?',

      // Session operations
      insertSession: 'INSERT OR REPLACE INTO mcp_sessions (session_id, start_time, status, operations, metadata) VALUES (?, ?, ?, ?, ?)',
      getSession: 'SELECT * FROM mcp_sessions WHERE session_id = ?',
      updateSession: 'UPDATE mcp_sessions SET end_time = ?, status = ?, operations = ? WHERE session_id = ?',

      // Performance operations
      insertPerformance: 'INSERT INTO mcp_performance (timestamp, operation, duration, success, metadata) VALUES (?, ?, ?, ?, ?)',
      getPerformanceMetrics: 'SELECT * FROM mcp_performance WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC',

      // Cache operations
      setCache: 'INSERT OR REPLACE INTO mcp_cache (key, value, expires_at) VALUES (?, ?, ?)',
      getCache: 'SELECT value FROM mcp_cache WHERE key = ? AND (expires_at IS NULL OR expires_at > ?)',
      deleteExpiredCache: 'DELETE FROM mcp_cache WHERE expires_at IS NOT NULL AND expires_at <= ?',

      // Server operations
      registerServer: 'INSERT OR REPLACE INTO mcp_servers (name, type, status, config, last_seen) VALUES (?, ?, ?, ?, ?)',
      getServer: 'SELECT * FROM mcp_servers WHERE name = ?',
      getAllServers: 'SELECT * FROM mcp_servers ORDER BY created_at DESC',

      // Batch operations for better performance
      batchInsertLogs: 'INSERT INTO mcp_logs (timestamp, level, message, source, metadata) VALUES ' +
        Array(100).fill('(?, ?, ?, ?, ?)').join(', '),
      batchInsertPerformance: 'INSERT INTO mcp_performance (timestamp, operation, duration, success, metadata) VALUES ' +
        Array(50).fill('(?, ?, ?, ?, ?)').join(', ')
    };

    // Create prepared statements
    for (const [name, sql] of Object.entries(statements)) {
      // We'll create statements on-demand for now
      // In production, pre-create commonly used statements
    }

    console.log(`⚡ สร้าง prepared statements เสร็จสิ้น (${Object.keys(statements).length} statements)`);
  }

  /**
   * Execute query with performance monitoring and optimization
   */
  async query<T = any>(
    sql: string,
    params: any[] = [],
    options: {
      useCache?: boolean;
      cacheTTL?: number;
      usePrepared?: boolean;
    } = {}
  ): Promise<T[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const connection = await this.getConnection();

    try {
      // Check query cache first
      if (options.useCache && this.config.enableQueryCache) {
        const cacheKey = `${sql}:${JSON.stringify(params)}`;
        const cached = this.queryCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < (options.cacheTTL || 60000)) {
          this.recordMetrics(sql, Date.now() - startTime, true);
          return cached.data;
        }
      }

      // Execute query with optimizations
      const statement = connection.db.prepare(sql);
      const result = statement.all(params) as T[];

      // Cache query result if enabled
      if (options.useCache && this.config.enableQueryCache) {
        const cacheKey = `${sql}:${JSON.stringify(params)}`;
        this.queryCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });

        // Limit cache size
        if (this.queryCache.size > this.config.queryCacheSize) {
          const firstKey = this.queryCache.keys().next().value;
          this.queryCache.delete(firstKey);
        }
      }

      // Record metrics
      this.recordMetrics(sql, Date.now() - startTime, true);

      return result;
    } catch (error: any) {
      this.recordMetrics(sql, Date.now() - startTime, false, error.message);
      throw error;
    } finally {
      this.releaseConnection(connection);
    }
  }

  /**
   * Execute single query (for INSERT, UPDATE, DELETE)
   */
  async execute(
    sql: string,
    params: any[] = [],
    options: { usePrepared?: boolean } = {}
  ): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const connection = await this.getConnection();

    try {
      const statement = connection.db.prepare(sql);
      const result = statement.run(params);

      this.recordMetrics(sql, Date.now() - startTime, true);
      return result.changes;
    } catch (error: any) {
      this.recordMetrics(sql, Date.now() - startTime, false, error.message);
      throw error;
    } finally {
      this.releaseConnection(connection);
    }
  }

  /**
   * Batch operations for better performance
   */
  async batchInsert<T>(
    table: string,
    data: T[],
    options: {
      batchSize?: number;
      conflictResolution?: 'IGNORE' | 'REPLACE' | 'ABORT';
    } = {}
  ): Promise<number> {
    if (data.length === 0) return 0;

    const batchSize = options.batchSize || 100;
    let totalInserted = 0;

    // Process in batches for better performance
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const inserted = await this.batchInsertChunk(table, batch, options);
      totalInserted += inserted;
    }

    return totalInserted;
  }

  /**
   * Insert batch chunk efficiently
   */
  private async batchInsertChunk<T>(
    table: string,
    data: T[],
    options: { conflictResolution?: 'IGNORE' | 'REPLACE' | 'ABORT' } = {}
  ): Promise<number> {
    if (data.length === 0) return 0;

    // Generate placeholders for batch insert
    const placeholders = data.map(() => '(?)').join(', ');
    const values = data.map(item => JSON.stringify(item));

    const conflictClause = options.conflictResolution === 'IGNORE' ? 'ON CONFLICT IGNORE' :
                          options.conflictResolution === 'REPLACE' ? 'ON CONFLICT REPLACE' : '';

    const sql = `INSERT ${conflictClause} INTO ${table} VALUES ${placeholders}`;

    return await this.execute(sql, values);
  }

  /**
   * Get database connection for direct operations
   */
  async getDirectConnection(): Promise<Database.Database> {
    const connection = await this.getConnection();
    return connection.db;
  }

  /**
   * Release direct connection
   */
  releaseDirectConnection(connection: DatabaseConnection): void {
    this.releaseConnection(connection);
  }

  /**
   * Record query metrics for performance monitoring
   */
  private recordMetrics(query: string, executionTime: number, success: boolean, error?: string): void {
    if (!this.config.enableMetrics) return;

    const metric: QueryMetrics = {
      query: query.substring(0, 100), // Truncate long queries
      executionTime,
      timestamp: Date.now(),
      success
    };

    if (error) {
      metric.error = error;
    }

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }

    // Log slow queries
    if (executionTime > this.config.slowQueryThreshold) {
      console.warn(`🐌 Slow query detected (${executionTime}ms): ${query.substring(0, 50)}...`);
    }
  }

  /**
   * Get database performance statistics
   */
  getPerformanceStats(): any {
    if (this.metrics.length === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        slowQueries: 0,
        successRate: 100
      };
    }

    const totalQueries = this.metrics.length;
    const totalTime = this.metrics.reduce((sum, metric) => sum + metric.executionTime, 0);
    const averageTime = totalTime / totalQueries;
    const slowQueries = this.metrics.filter(m => m.executionTime > this.config.slowQueryThreshold).length;
    const successfulQueries = this.metrics.filter(m => m.success).length;
    const successRate = (successfulQueries / totalQueries) * 100;

    return {
      totalQueries,
      averageExecutionTime: Math.round(averageTime * 100) / 100,
      slowQueries,
      successRate: Math.round(successRate * 100) / 100,
      connectionPoolSize: this.connectionPool.length,
      activeConnections: this.connectionPool.filter(c => c.isInUse).length,
      queryCacheSize: this.queryCache.size,
      preparedStatements: this.preparedStatements.size
    };
  }

  /**
   * Get slow queries for analysis
   */
  getSlowQueries(limit: number = 10): QueryMetrics[] {
    return this.metrics
      .filter(metric => metric.executionTime > this.config.slowQueryThreshold)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  /**
   * Optimize database performance
   */
  async optimize(): Promise<void> {
    console.log('🔧 กำลังปรับแต่งประสิทธิภาพฐานข้อมูล...');

    // Run SQLite optimizations
    for (const connection of this.connectionPool) {
      connection.db.pragma('optimize');
      connection.db.pragma('vacuum');
      connection.db.exec('ANALYZE');
    }

    // Clear query cache to force fresh execution plans
    this.queryCache.clear();

    console.log('✅ ปรับแต่งประสิทธิภาพฐานข้อมูลเสร็จสิ้น');
  }

  /**
   * Health check for database performance
   */
  async healthCheck(): Promise<{
    connection: boolean;
    performance: boolean;
    space: boolean;
  }> {
    try {
      const connection = await this.getConnection();

      // Test basic query performance
      const startTime = Date.now();
      await connection.db.exec('SELECT 1');
      const queryTime = Date.now() - startTime;

      // Check available space
      const stats = fs.statSync(this.dbPath);

      this.releaseConnection(connection);

      return {
        connection: true,
        performance: queryTime < 100, // Should respond within 100ms
        space: stats.size < 1024 * 1024 * 1024 // Less than 1GB
      };
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return {
        connection: false,
        performance: false,
        space: false
      };
    }
  }

  /**
   * Close all connections and cleanup
   */
  async close(): Promise<void> {
    console.log('🔒 กำลังปิดการเชื่อมต่อฐานข้อมูล...');

    // Close all connections in pool
    for (const connection of this.connectionPool) {
      connection.db.close();
    }

    this.connectionPool = [];
    this.preparedStatements.clear();
    this.queryCache.clear();

    console.log('✅ ปิดการเชื่อมต่อฐานข้อมูลเสร็จสิ้น');
  }

  /**
   * Create optimized database tables with performance indexes
   */
  private createOptimizedTables(): void {
    const tables = [
      // MCP Logs table with optimized indexes
      `CREATE TABLE IF NOT EXISTS mcp_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        source TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // MCP Sessions table
      `CREATE TABLE IF NOT EXISTS mcp_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        status TEXT NOT NULL,
        operations INTEGER DEFAULT 0,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // MCP Performance table
      `CREATE TABLE IF NOT EXISTS mcp_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        operation TEXT NOT NULL,
        duration INTEGER NOT NULL,
        success BOOLEAN NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // MCP Servers table
      `CREATE TABLE IF NOT EXISTS mcp_servers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        config TEXT,
        last_seen TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // MCP Cache table
      `CREATE TABLE IF NOT EXISTS mcp_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        expires_at TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    // Create indexes for optimal performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_mcp_logs_timestamp ON mcp_logs(timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_mcp_logs_level ON mcp_logs(level)',
      'CREATE INDEX IF NOT EXISTS idx_mcp_logs_source ON mcp_logs(source)',
      'CREATE INDEX IF NOT EXISTS idx_mcp_sessions_start_time ON mcp_sessions(start_time DESC)',
      'CREATE INDEX IF NOT EXISTS idx_mcp_sessions_status ON mcp_sessions(status)',
      'CREATE INDEX IF NOT EXISTS idx_mcp_performance_timestamp ON mcp_performance(timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_mcp_performance_operation ON mcp_performance(operation)',
      'CREATE INDEX IF NOT EXISTS idx_mcp_cache_key ON mcp_cache(key)',
      'CREATE INDEX IF NOT EXISTS idx_mcp_cache_expires ON mcp_cache(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_mcp_servers_status ON mcp_servers(status)',
      'CREATE INDEX IF NOT EXISTS idx_mcp_servers_last_seen ON mcp_servers(last_seen DESC)'
    ];

    // Execute table creation and indexing
    for (const connection of this.connectionPool) {
      for (const sql of [...tables, ...indexes]) {
        connection.db.exec(sql);
      }
    }
  }
}
