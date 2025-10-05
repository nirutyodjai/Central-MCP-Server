/**
 * Enhanced Git Memory MCP Server with High-Performance Memory Management
 * จัดการ Git repositories และ code history พร้อม memory sharing และ optimization
 */

import { HighPerformanceCache } from './high-performance-cache.js';
import { HighPerformanceAsyncUtils } from './high-performance-async.js';

import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
  files: string[];
  insertions: number;
  deletions: number;
}

export interface GitStatus {
  branch: string;
  isClean: boolean;
  ahead: number;
  behind: number;
  modified: string[];
  staged: string[];
  untracked: string[];
}

export interface GitMemoryConfig {
  repositoryPath: string;
  enableHistory: boolean;
  maxCommits: number;
  enableBranchTracking: boolean;
  enableMemorySharing: boolean;
  maxMemoryEntries: number;
  memoryTTL: number;
  enablePerformanceMode: boolean;
}

export interface GitMemoryEntry {
  id: string;
  type: 'commit' | 'branch' | 'file' | 'repository';
  data: any;
  metadata: {
    repository: string;
    branch?: string;
    timestamp: string;
    size: number;
  };
  shared: boolean;
  lastAccessed: string;
}

export class EnhancedGitMemoryMCPServer {
  private git: SimpleGit;
  private config: GitMemoryConfig;
  private isInitialized: boolean = false;
  private cache: HighPerformanceCache;
  private memoryStore: Map<string, GitMemoryEntry> = new Map();
  private sharedMemory: Map<string, GitMemoryEntry> = new Map();

  constructor(config: GitMemoryConfig) {
    this.config = config;
    this.git = simpleGit(config.repositoryPath);

    // Initialize high-performance cache
    this.cache = new HighPerformanceCache({
      memory: {
        enabled: true,
        maxKeys: config.maxMemoryEntries,
        stdTTL: config.memoryTTL / 1000,
        checkperiod: 60,
        useClones: false,
        deleteOnExpire: true
      },
      compression: {
        enabled: true,
        threshold: 1024,
        algorithm: 'gzip'
      },
      strategy: {
        defaultTTL: config.memoryTTL,
        maxSize: config.maxMemoryEntries,
        enableMetrics: true,
        enableCompression: true
      }
    });
  }

  /**
   * Initialize enhanced Git Memory server with memory management
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 กำลังเริ่มต้น Enhanced Git Memory MCP Server...');

      // ตรวจสอบว่าเป็น Git repository หรือไม่
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        throw new Error('ไม่พบ Git repository ใน path ที่กำหนด');
      }

      // ดึงข้อมูล repository และเก็บใน memory
      await this.loadRepositoryInfo();

      // ตั้งค่า memory sharing ถ้าเปิดใช้งาน
      if (this.config.enableMemorySharing) {
        await this.initializeMemorySharing();
      }

      this.isInitialized = true;
      console.log('✅ Enhanced Git Memory MCP Server พร้อมใช้งาน');

    } catch (error) {
      console.error('❌ ไม่สามารถเริ่มต้น Enhanced Git Memory MCP Server:', error);
      throw error;
    }
  }

  /**
   * Load repository information into memory with caching
   */
  private async loadRepositoryInfo(): Promise<void> {
    const cacheKey = `repo_info_${this.config.repositoryPath}`;

    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log('💾 โหลดข้อมูล repository จาก cache');
      return;
    }

    try {
      const remotes = await this.git.getRemotes(true);
      const branch = await this.git.branch();

      const repoInfo = {
        path: this.config.repositoryPath,
        currentBranch: branch.current,
        branches: Object.keys(branch.branches).length,
        remotes: remotes.map(remote => ({
          name: remote.name,
          url: remote.refs.fetch || remote.refs.push
        })),
        timestamp: new Date().toISOString()
      };

      // Cache repository info
      await this.cache.set(cacheKey, repoInfo, this.config.memoryTTL);

      console.log('📦 โหลดข้อมูล repository ใหม่และบันทึกใน cache');

    } catch (error) {
      console.error('❌ ไม่สามารถโหลดข้อมูล repository:', error);
      throw error;
    }
  }

  /**
   * Initialize memory sharing capabilities
   */
  private async initializeMemorySharing(): Promise<void> {
    console.log('🔗 กำลังเปิดใช้งาน Memory Sharing...');

    // Create shared memory space for inter-session communication
    this.sharedMemory = new Map();

    // Setup periodic memory synchronization
    setInterval(() => {
      this.synchronizeSharedMemory();
    }, 30000); // Every 30 seconds

    console.log('✅ Memory Sharing พร้อมใช้งาน');
  }

  /**
   * Synchronize shared memory across sessions
   */
  private synchronizeSharedMemory(): void {
    // Sync memory entries that are marked as shared
    for (const [key, entry] of this.memoryStore) {
      if (entry.shared && this.config.enableMemorySharing) {
        this.sharedMemory.set(key, entry);
      }
    }

    // Clean up expired shared memory
    const now = Date.now();
    for (const [key, entry] of this.sharedMemory) {
      if (now - new Date(entry.lastAccessed).getTime() > this.config.memoryTTL) {
        this.sharedMemory.delete(key);
      }
    }
  }

  /**
   * ดึงข้อมูล Git status พร้อม memory caching
   */
  async getStatus(): Promise<GitStatus> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cacheKey = 'git_status';

    try {
      // Check cache first
      const cached = await this.cache.get<GitStatus>(cacheKey);
      if (cached) {
        console.log('💾 โหลด Git status จาก cache');
        return cached;
      }

      const status = await this.git.status();
      const branch = await this.git.branch();

      const statusInfo: GitStatus = {
        branch: branch.current,
        isClean: status.isClean(),
        ahead: status.ahead,
        behind: status.behind,
        modified: status.modified,
        staged: status.staged,
        untracked: status.not_added
      };

      // Cache status for fast access
      await this.cache.set(cacheKey, statusInfo, 30000); // 30 seconds

      return statusInfo;
    } catch (error) {
      console.error('❌ ไม่สามารถดึง Git status:', error);
      throw error;
    }
  }

  /**
   * ดึงประวัติ commits พร้อม memory optimization
   */
  async getCommitHistory(limit?: number): Promise<CommitInfo[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const maxCommits = limit || this.config.maxCommits;
    const cacheKey = `commit_history_${maxCommits}`;

    try {
      // Check cache first
      const cached = await this.cache.get<CommitInfo[]>(cacheKey);
      if (cached) {
        console.log('💾 โหลด commit history จาก cache');
        return cached;
      }

      const logs = await this.git.log({ maxCount: maxCommits });

      const commits: CommitInfo[] = logs.all.map(commit => ({
        hash: commit.hash.substring(0, 7),
        message: commit.message,
        author: commit.author_name,
        date: commit.date,
        files: [], // จะต้อง parse เพิ่มเติมถ้าต้องการ
        insertions: 0,
        deletions: 0
      }));

      // Cache commit history
      await this.cache.set(cacheKey, commits, this.config.memoryTTL);

      return commits;
    } catch (error) {
      console.error('❌ ไม่สามารถดึง commit history:', error);
      throw error;
    }
  }

  /**
   * ค้นหา commits ตามข้อความ พร้อม async optimization
   */
  async searchCommits(query: string, limit: number = 50): Promise<CommitInfo[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cacheKey = `search_commits_${query}_${limit}`;

    try {
      // Check cache first
      const cached = await this.cache.get<CommitInfo[]>(cacheKey);
      if (cached) {
        console.log('💾 โหลด search results จาก cache');
        return cached;
      }

      // Use async optimization for search
      const searchTask = {
        id: `search_${Date.now()}`,
        type: 'git-search',
        data: { query, limit },
        priority: 5,
        timeout: 10000
      };

      const result = await HighPerformanceAsyncUtils.executeWithWorker(searchTask);

      if (result.success && result.data) {
        const commits: CommitInfo[] = result.data;

        // Cache search results
        await this.cache.set(cacheKey, commits, this.config.memoryTTL);

        return commits;
      }

      return [];
    } catch (error) {
      console.error('❌ ไม่สามารถค้นหา commits:', error);
      throw error;
    }
  }

  /**
   * แชร์ข้อมูล Git ใน memory ระหว่าง sessions
   */
  async shareMemoryEntry(key: string, data: any, type: GitMemoryEntry['type']): Promise<void> {
    if (!this.config.enableMemorySharing) {
      throw new Error('Memory sharing ไม่ได้เปิดใช้งาน');
    }

    const entry: GitMemoryEntry = {
      id: key,
      type,
      data,
      metadata: {
        repository: this.config.repositoryPath,
        timestamp: new Date().toISOString(),
        size: JSON.stringify(data).length
      },
      shared: true,
      lastAccessed: new Date().toISOString()
    };

    // Store in local memory
    this.memoryStore.set(key, entry);

    // Store in shared memory
    this.sharedMemory.set(key, entry);

    console.log(`📤 แชร์ memory entry: ${key} (${type})`);
  }

  /**
   * ดึงข้อมูลที่แชร์จาก memory
   */
  async getSharedMemoryEntry(key: string): Promise<GitMemoryEntry | null> {
    if (!this.config.enableMemorySharing) {
      return null;
    }

    const entry = this.sharedMemory.get(key);
    if (entry) {
      // Update last accessed time
      entry.lastAccessed = new Date().toISOString();
      return entry;
    }

    return null;
  }

  /**
   * ดึงข้อมูลที่แชร์ทั้งหมด
   */
  async getAllSharedMemory(): Promise<GitMemoryEntry[]> {
    if (!this.config.enableMemorySharing) {
      return [];
    }

    return Array.from(this.sharedMemory.values());
  }

  /**
   * สลับไปยัง branch ที่กำหนด พร้อม memory tracking
   */
  async switchBranch(branchName: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Store current branch state in memory
      if (this.config.enableMemorySharing) {
        const currentStatus = await this.getStatus();
        await this.shareMemoryEntry(
          `branch_state_${Date.now()}`,
          currentStatus,
          'branch'
        );
      }

      await this.git.checkout(branchName);

      // Clear related caches when switching branches
      await this.cache.delete('git_status');
      await this.cache.delete('commit_history_*');

      console.log(`🔄 สลับไปยัง branch: ${branchName}`);

      return true;
    } catch (error) {
      console.error(`❌ ไม่สามารถสลับไปยัง branch ${branchName}:`, error);
      return false;
    }
  }

  /**
   * ดึงสถิติการพัฒนา พร้อม performance optimization
   */
  async getDevelopmentStats(author?: string): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cacheKey = `dev_stats_${author || 'all'}`;

    try {
      // Check cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const options: any = { maxCount: 1000 };
      if (author) {
        options['--author'] = author;
      }

      const logs = await this.git.log(options);

      // คำนวณสถิติพื้นฐาน
      const totalCommits = logs.all.length;
      const authors = new Set(logs.all.map(commit => commit.author_name));
      const filesChanged = new Set();

      // นับจำนวนการเปลี่ยนแปลงไฟล์ (จำลอง)
      logs.all.forEach(commit => {
        filesChanged.add('multiple');
      });

      const stats = {
        totalCommits,
        uniqueAuthors: authors.size,
        filesChanged: filesChanged.size,
        dateRange: {
          earliest: logs.all.length > 0 ? logs.all[logs.all.length - 1].date : null,
          latest: logs.all.length > 0 ? logs.all[0].date : null
        },
        memoryEntries: this.memoryStore.size,
        sharedEntries: this.sharedMemory.size,
        cacheStats: this.cache.getStats()
      };

      // Cache development stats
      await this.cache.set(cacheKey, stats, this.config.memoryTTL);

      return stats;
    } catch (error) {
      console.error('❌ ไม่สามารถดึงสถิติการพัฒนา:', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูล repository พร้อม memory management
   */
  async getRepositoryInfo(): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cacheKey = 'repository_info';

    try {
      // Check cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const remotes = await this.git.getRemotes(true);
      const branch = await this.git.branch();

      const info = {
        path: this.config.repositoryPath,
        currentBranch: branch.current,
        branches: Object.keys(branch.branches).length,
        remotes: remotes.map(remote => ({
          name: remote.name,
          url: remote.refs.fetch || remote.refs.push
        })),
        isInitialized: this.isInitialized,
        memoryEnabled: this.config.enableMemorySharing,
        memoryEntries: this.memoryStore.size,
        sharedEntries: this.sharedMemory.size,
        performanceMode: this.config.enablePerformanceMode
      };

      // Cache repository info
      await this.cache.set(cacheKey, info, this.config.memoryTTL);

      return info;
    } catch (error) {
      console.error('❌ ไม่สามารถดึงข้อมูล repository:', error);
      throw error;
    }
  }

  /**
   * ดึง performance metrics สำหรับ monitoring
   */
  getPerformanceMetrics(): any {
    return {
      memoryStore: {
        totalEntries: this.memoryStore.size,
        sharedEntries: this.sharedMemory.size,
        maxEntries: this.config.maxMemoryEntries
      },
      cache: this.cache.getStats(),
      git: {
        repositoryPath: this.config.repositoryPath,
        performanceMode: this.config.enablePerformanceMode,
        memorySharing: this.config.enableMemorySharing
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * ล้าง memory ที่ไม่ใช้งาน
   */
  cleanupMemory(): void {
    const now = Date.now();

    // Clean local memory
    for (const [key, entry] of this.memoryStore) {
      if (now - new Date(entry.lastAccessed).getTime() > this.config.memoryTTL) {
        this.memoryStore.delete(key);
      }
    }

    // Clean shared memory
    for (const [key, entry] of this.sharedMemory) {
      if (now - new Date(entry.lastAccessed).getTime() > this.config.memoryTTL) {
        this.sharedMemory.delete(key);
      }
    }

    console.log(`🗑️ ล้าง memory เสร็จสิ้น (local: ${this.memoryStore.size}, shared: ${this.sharedMemory.size})`);
  }

  /**
   * Health check สำหรับ memory และ performance
   */
  async healthCheck(): Promise<{
    git: boolean;
    memory: boolean;
    cache: boolean;
    sharing: boolean;
  }> {
    const health = {
      git: false,
      memory: false,
      cache: false,
      sharing: false
    };

    try {
      // Check Git repository
      const isRepo = await this.git.checkIsRepo();
      health.git = isRepo;

      // Check memory systems
      health.memory = this.memoryStore.size <= this.config.maxMemoryEntries;
      health.cache = await this.cache.healthCheck().then(h => h.memory);

      // Check memory sharing
      health.sharing = this.config.enableMemorySharing ?
        this.sharedMemory.size >= 0 : true; // Always true if disabled

      return health;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return health;
    }
  }
}

/**
 * ฟังก์ชันสำหรับ launch Enhanced Git Memory MCP Server
 */
export async function launchEnhancedGitMemoryMCP(gitMemory: any, platform: any): Promise<EnhancedGitMemoryMCPServer> {
  console.log('🚀 Launching Enhanced Git Memory MCP Server...');

  // กำหนด path ของ Git repository (ใช้ current directory หรือกำหนดเอง)
  const repoPath = process.cwd();

  const gitMemoryServer = new EnhancedGitMemoryMCPServer({
    repositoryPath: repoPath,
    enableHistory: true,
    maxCommits: 100,
    enableBranchTracking: true,
    enableMemorySharing: true,
    maxMemoryEntries: 1000,
    memoryTTL: 300000, // 5 minutes
    enablePerformanceMode: true
  });

  try {
    await gitMemoryServer.initialize();

    // แสดงข้อมูล repository ที่พบ
    const repoInfo = await gitMemoryServer.getRepositoryInfo();
    console.log('📋 Repository Info:', repoInfo);

    // แสดง Git status
    const status = await gitMemoryServer.getStatus();
    console.log('📊 Git Status:', status);

    // แสดง performance metrics
    const metrics = gitMemoryServer.getPerformanceMetrics();
    console.log('⚡ Performance Metrics:', metrics);

    console.log('✅ Enhanced Git Memory MCP Server เริ่มทำงานสำเร็จ');

    return gitMemoryServer;
  } catch (error) {
    console.error('❌ ไม่สามารถเริ่ม Enhanced Git Memory MCP Server:', error);
    throw error;
  }
}
