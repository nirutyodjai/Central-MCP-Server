/**
 * Database MCP Server
 * จัดการฐานข้อมูล SQLite สำหรับ MCP Platform
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

export interface DatabaseConfig {
  databasePath: string;
  enableMigrations: boolean;
  enableLogging: boolean;
  maxConnections: number;
}

export interface MCPLogEntry {
  id?: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
  metadata?: string;
}

export interface MCPSession {
  id?: number;
  sessionId: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'error';
  operations: number;
  metadata?: string;
}

export interface MCPPerformance {
  id?: number;
  timestamp: string;
  operation: string;
  duration: number;
  success: boolean;
  metadata?: string;
}

export class DatabaseMCPServer {
  private db: Database.Database;
  private config: DatabaseConfig;
  private isInitialized: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * เริ่มต้น Database MCP Server
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 กำลังเริ่มต้น Database MCP Server...');

      // สร้างโฟลเดอร์ data ถ้ายังไม่มี
      const dataDir = path.dirname(this.config.databasePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // เชื่อมต่อฐานข้อมูล
      this.db = new Database(this.config.databasePath);

      // ตั้งค่า optimizations
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 10000');
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('temp_store = MEMORY');

      if (this.config.enableLogging) {
        console.log(`📦 เชื่อมต่อฐานข้อมูล: ${this.config.databasePath}`);
      }

      // สร้างตารางพื้นฐาน
      await this.createTables();

      // รัน migrations ถ้าต้องการ
      if (this.config.enableMigrations) {
        await this.runMigrations();
      }

      this.isInitialized = true;
      console.log('✅ Database MCP Server พร้อมใช้งาน');

    } catch (error) {
      console.error('❌ ไม่สามารถเริ่มต้น Database MCP Server:', error);
      throw error;
    }
  }

  /**
   * สร้างตารางพื้นฐาน
   */
  private async createTables(): Promise<void> {
    const tables = [
      // ตารางสำหรับเก็บ logs ของ MCP
      `CREATE TABLE IF NOT EXISTS mcp_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        source TEXT NOT NULL,
        metadata TEXT
      )`,

      // ตารางสำหรับเก็บ sessions ของ MCP
      `CREATE TABLE IF NOT EXISTS mcp_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        status TEXT NOT NULL,
        operations INTEGER DEFAULT 0,
        metadata TEXT
      )`,

      // ตารางสำหรับเก็บ performance metrics
      `CREATE TABLE IF NOT EXISTS mcp_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        operation TEXT NOT NULL,
        duration INTEGER NOT NULL,
        success BOOLEAN NOT NULL,
        metadata TEXT
      )`,

      // ตารางสำหรับเก็บข้อมูล MCP servers
      `CREATE TABLE IF NOT EXISTS mcp_servers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        config TEXT,
        last_seen TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // ตารางสำหรับเก็บ cache
      `CREATE TABLE IF NOT EXISTS mcp_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        expires_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const sql of tables) {
      this.db.exec(sql);
    }

    if (this.config.enableLogging) {
      console.log('📋 สร้างตารางฐานข้อมูลเสร็จสิ้น');
    }
  }

  /**
   * รัน database migrations
   */
  private async runMigrations(): Promise<void> {
    // ในที่นี้จะใช้ simple versioning
    const migrations = [
      // Migration 1: เพิ่ม index สำหรับประสิทธิภาพ
      `CREATE INDEX IF NOT EXISTS idx_mcp_logs_timestamp ON mcp_logs(timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_mcp_logs_level ON mcp_logs(level)`,
      `CREATE INDEX IF NOT EXISTS idx_mcp_sessions_start_time ON mcp_sessions(start_time)`,
      `CREATE INDEX IF NOT EXISTS idx_mcp_performance_timestamp ON mcp_performance(timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_mcp_cache_key ON mcp_cache(key)`,
      `CREATE INDEX IF NOT EXISTS idx_mcp_cache_expires ON mcp_cache(expires_at)`
    ];

    for (const migration of migrations) {
      this.db.exec(migration);
    }

    if (this.config.enableLogging) {
      console.log('🔄 รัน database migrations เสร็จสิ้น');
    }
  }

  /**
   * บันทึก log
   */
  log(entry: MCPLogEntry): void {
    if (!this.isInitialized) return;

    const stmt = this.db.prepare(`
      INSERT INTO mcp_logs (timestamp, level, message, source, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      entry.timestamp,
      entry.level,
      entry.message,
      entry.source,
      JSON.stringify(entry.metadata || {})
    );
  }

  /**
   * ดึง logs ตามเงื่อนไข
   */
  getLogs(options: {
    level?: string;
    source?: string;
    limit?: number;
    from?: string;
    to?: string;
  } = {}): MCPLogEntry[] {
    if (!this.isInitialized) return [];

    let query = 'SELECT * FROM mcp_logs WHERE 1=1';
    const params: any[] = [];

    if (options.level) {
      query += ' AND level = ?';
      params.push(options.level);
    }

    if (options.source) {
      query += ' AND source = ?';
      params.push(options.source);
    }

    if (options.from) {
      query += ' AND timestamp >= ?';
      params.push(options.from);
    }

    if (options.to) {
      query += ' AND timestamp <= ?';
      params.push(options.to);
    }

    query += ' ORDER BY timestamp DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);

    return rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      level: row.level,
      message: row.message,
      source: row.source,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  /**
   * สร้าง session ใหม่
   */
  createSession(sessionId: string): MCPSession {
    if (!this.isInitialized) {
      throw new Error('Database MCP Server ยังไม่ได้เริ่มต้น');
    }

    const stmt = this.db.prepare(`
      INSERT INTO mcp_sessions (session_id, start_time, status)
      VALUES (?, ?, ?)
    `);

    const timestamp = new Date().toISOString();
    stmt.run(sessionId, timestamp, 'active');

    return {
      sessionId,
      startTime: timestamp,
      status: 'active',
      operations: 0
    };
  }

  /**
   * อัปเดต session
   */
  updateSession(sessionId: string, updates: Partial<MCPSession>): void {
    if (!this.isInitialized) return;

    const fields = Object.keys(updates);
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field as keyof MCPSession]);

    const stmt = this.db.prepare(`
      UPDATE mcp_sessions SET ${setClause} WHERE session_id = ?
    `);

    stmt.run(...values, sessionId);
  }

  /**
   * ดึง session ข้อมูล
   */
  getSession(sessionId: string): MCPSession | null {
    if (!this.isInitialized) return null;

    const stmt = this.db.prepare('SELECT * FROM mcp_sessions WHERE session_id = ?');
    const row = stmt.get(sessionId) as any;

    if (!row) return null;

    return {
      id: row.id,
      sessionId: row.session_id,
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status,
      operations: row.operations,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  /**
   * บันทึก performance metrics
   */
  recordPerformance(operation: string, duration: number, success: boolean, metadata?: any): void {
    if (!this.isInitialized) return;

    const stmt = this.db.prepare(`
      INSERT INTO mcp_performance (timestamp, operation, duration, success, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      new Date().toISOString(),
      operation,
      duration,
      success,
      JSON.stringify(metadata || {})
    );
  }

  /**
   * ดึง performance metrics
   */
  getPerformanceMetrics(options: {
    operation?: string;
    limit?: number;
    from?: string;
    to?: string;
  } = {}): MCPPerformance[] {
    if (!this.isInitialized) return [];

    let query = 'SELECT * FROM mcp_performance WHERE 1=1';
    const params: any[] = [];

    if (options.operation) {
      query += ' AND operation = ?';
      params.push(options.operation);
    }

    if (options.from) {
      query += ' AND timestamp >= ?';
      params.push(options.from);
    }

    if (options.to) {
      query += ' AND timestamp <= ?';
      params.push(options.to);
    }

    query += ' ORDER BY timestamp DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);

    return rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      operation: row.operation,
      duration: row.duration,
      success: Boolean(row.success),
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  /**
   * จัดการ MCP servers
   */
  registerMCPServer(name: string, type: string, config?: any): void {
    if (!this.isInitialized) return;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO mcp_servers (name, type, status, config, last_seen)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      name,
      type,
      'active',
      JSON.stringify(config || {}),
      new Date().toISOString()
    );
  }

  /**
   * อัปเดตสถานะ MCP server
   */
  updateMCPServerStatus(name: string, status: string): void {
    if (!this.isInitialized) return;

    const stmt = this.db.prepare(`
      UPDATE mcp_servers SET status = ?, last_seen = ? WHERE name = ?
    `);

    stmt.run(status, new Date().toISOString(), name);
  }

  /**
   * ดึงข้อมูล MCP servers
   */
  getMCPServers(): any[] {
    if (!this.isInitialized) return [];

    const stmt = this.db.prepare('SELECT * FROM mcp_servers ORDER BY created_at DESC');
    const rows = stmt.all();

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      config: JSON.parse(row.config || '{}'),
      lastSeen: row.last_seen,
      createdAt: row.created_at
    }));
  }

  /**
   * จัดการ cache
   */
  setCache(key: string, value: any, ttl?: number): void {
    if (!this.isInitialized) return;

    const expiresAt = ttl ? new Date(Date.now() + ttl * 1000).toISOString() : null;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO mcp_cache (key, value, expires_at)
      VALUES (?, ?, ?)
    `);

    stmt.run(key, JSON.stringify(value), expiresAt);
  }

  /**
   * ดึงข้อมูลจาก cache
   */
  getCache(key: string): any | null {
    if (!this.isInitialized) return null;

    const stmt = this.db.prepare(`
      SELECT * FROM mcp_cache WHERE key = ? AND (expires_at IS NULL OR expires_at > ?)
    `);

    const row = stmt.get(key, new Date().toISOString()) as any;

    if (!row) return null;

    return JSON.parse(row.value);
  }

  /**
   * ลบ cache ที่หมดอายุ
   */
  cleanExpiredCache(): number {
    if (!this.isInitialized) return 0;

    const stmt = this.db.prepare(`
      DELETE FROM mcp_cache WHERE expires_at IS NOT NULL AND expires_at <= ?
    `);

    const result = stmt.run(new Date().toISOString());
    return result.changes;
  }

  /**
   * ปิดการเชื่อมต่อฐานข้อมูล
   */
  close(): void {
    if (this.db) {
      this.db.close();
      console.log('🔒 ปิดการเชื่อมต่อฐานข้อมูล');
    }
  }

  /**
   * ดึงสถิติฐานข้อมูล
   */
  getStats(): any {
    if (!this.isInitialized) return {};

    const stats = {
      logs: this.db.prepare('SELECT COUNT(*) as count FROM mcp_logs').get(),
      sessions: this.db.prepare('SELECT COUNT(*) as count FROM mcp_sessions').get(),
      performance: this.db.prepare('SELECT COUNT(*) as count FROM mcp_performance').get(),
      servers: this.db.prepare('SELECT COUNT(*) as count FROM mcp_servers').get(),
      cache: this.db.prepare('SELECT COUNT(*) as count FROM mcp_cache').get(),
      databaseSize: this.getDatabaseSize()
    };

    return stats;
  }

  /**
   * ดึงขนาดฐานข้อมูล
   */
  private getDatabaseSize(): string {
    try {
      if (fs.existsSync(this.config.databasePath)) {
        const stats = fs.statSync(this.config.databasePath);
        return `${(stats.size / 1024 / 1024).toFixed(2)} MB`;
      }
    } catch (error) {
      // ignore
    }
    return 'unknown';
  }
}

/**
 * ฟังก์ชันสำหรับ launch Database MCP Server
 */
export async function launchDatabaseMCP(gitMemory: any, platform: any): Promise<DatabaseMCPServer> {
  console.log('🗄️ Launching Database MCP Server...');

  const dbPath = path.join(process.cwd(), 'data', 'mcp-platform.db');

  const databaseServer = new DatabaseMCPServer({
    databasePath: dbPath,
    enableMigrations: true,
    enableLogging: true,
    maxConnections: 10
  });

  try {
    await databaseServer.initialize();

    // แสดงสถิติฐานข้อมูล
    const stats = databaseServer.getStats();
    console.log('📊 Database Stats:', stats);

    // ทดสอบการบันทึก log
    databaseServer.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Database MCP Server เริ่มทำงานแล้ว',
      source: 'database-mcp'
    });

    console.log('✅ Database MCP Server เริ่มทำงานสำเร็จ');

    return databaseServer;
  } catch (error) {
    console.error('❌ ไม่สามารถเริ่ม Database MCP Server:', error);
    throw error;
  }
}
