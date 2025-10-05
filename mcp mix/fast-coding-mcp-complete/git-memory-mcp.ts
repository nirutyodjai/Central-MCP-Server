/**
 * Git Memory MCP Server
 * จัดการ Git repositories และ code history สำหรับ MCP Platform
 */

import { HighPerformanceCache } from './high-performance-cache.js';
import { HighPerformanceAsyncUtils } from './high-performance-async.js';

import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

export interface GitMemoryConfig {
  repositoryPath: string;
  enableHistory: boolean;
  maxCommits: number;
  enableBranchTracking: boolean;
  enableMemorySharing: boolean;
  maxMemoryEntries: number;
  memoryTTL: number;
}
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

export class GitMemoryMCPServer {
  private git: SimpleGit;
  private config: GitMemoryConfig;
  private isInitialized: boolean = false;

  constructor(config: GitMemoryConfig) {
    this.config = config;
    this.git = simpleGit(config.repositoryPath);
  }

  /**
   * เริ่มต้น Git Memory MCP Server
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 กำลังเริ่มต้น Git Memory MCP Server...');

      // ตรวจสอบว่าเป็น Git repository หรือไม่
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        throw new Error('ไม่พบ Git repository ใน path ที่กำหนด');
      }

      // ดึงข้อมูล repository
      const remote = await this.git.getRemotes(true);
      console.log(`📦 Git repository: ${this.config.repositoryPath}`);
      console.log(`🔗 Remote: ${remote.length > 0 ? remote[0].name : 'ไม่มี remote'}`);

      this.isInitialized = true;
      console.log('✅ Git Memory MCP Server พร้อมใช้งาน');

    } catch (error) {
      console.error('❌ ไม่สามารถเริ่มต้น Git Memory MCP Server:', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูล Git status
   */
  async getStatus(): Promise<GitStatus> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const status = await this.git.status();
      const branch = await this.git.branch();

      return {
        branch: branch.current,
        isClean: status.isClean(),
        ahead: status.ahead,
        behind: status.behind,
        modified: status.modified,
        staged: status.staged,
        untracked: status.not_added
      };
    } catch (error) {
      console.error('❌ ไม่สามารถดึง Git status:', error);
      throw error;
    }
  }

  /**
   * ดึงประวัติ commits
   */
  async getCommitHistory(limit?: number): Promise<CommitInfo[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const maxCommits = limit || this.config.maxCommits;
      const logs = await this.git.log({ maxCount: maxCommits });

      return logs.all.map(commit => ({
        hash: commit.hash.substring(0, 7),
        message: commit.message,
        author: commit.author_name,
        date: commit.date,
        files: [], // จะต้อง parse เพิ่มเติมถ้าต้องการ
        insertions: 0,
        deletions: 0
      }));
    } catch (error) {
      console.error('❌ ไม่สามารถดึง commit history:', error);
      throw error;
    }
  }

  /**
   * ค้นหา commits ตามข้อความ
   */
  async searchCommits(query: string, limit: number = 50): Promise<CommitInfo[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const logs = await this.git.log({
        maxCount: limit,
        '--grep': query
      });

      return logs.all.map(commit => ({
        hash: commit.hash.substring(0, 7),
        message: commit.message,
        author: commit.author_name,
        date: commit.date,
        files: [],
        insertions: 0,
        deletions: 0
      }));
    } catch (error) {
      console.error('❌ ไม่สามารถค้นหา commits:', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูล branch ทั้งหมด
   */
  async getBranches(): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const branches = await this.git.branch();
      return Object.keys(branches.branches);
    } catch (error) {
      console.error('❌ ไม่สามารถดึงข้อมูล branches:', error);
      throw error;
    }
  }

  /**
   * สลับไปยัง branch ที่กำหนด
   */
  async switchBranch(branchName: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await this.git.checkout(branchName);
      console.log(`🔄 สลับไปยัง branch: ${branchName}`);
      return true;
    } catch (error) {
      console.error(`❌ ไม่สามารถสลับไปยัง branch ${branchName}:`, error);
      return false;
    }
  }

  /**
   * ดึงสถิติการพัฒนา
   */
  async getDevelopmentStats(author?: string): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
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
        // ในสถานการณ์จริงควร parse files ที่เปลี่ยนแปลง
        filesChanged.add('multiple');
      });

      return {
        totalCommits,
        uniqueAuthors: authors.size,
        filesChanged: filesChanged.size,
        dateRange: {
          earliest: logs.all.length > 0 ? logs.all[logs.all.length - 1].date : null,
          latest: logs.all.length > 0 ? logs.all[0].date : null
        }
      };
    } catch (error) {
      console.error('❌ ไม่สามารถดึงสถิติการพัฒนา:', error);
      throw error;
    }
  }

  /**
   * แสดงข้อมูล repository
   */
  async getRepositoryInfo(): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const remotes = await this.git.getRemotes(true);
      const branch = await this.git.branch();

      return {
        path: this.config.repositoryPath,
        currentBranch: branch.current,
        branches: Object.keys(branch.branches).length,
        remotes: remotes.map(remote => ({
          name: remote.name,
          url: remote.refs.fetch || remote.refs.push
        })),
        isInitialized: this.isInitialized
      };
    } catch (error) {
      console.error('❌ ไม่สามารถดึงข้อมูล repository:', error);
      throw error;
    }
  }
}

/**
 * ฟังก์ชันสำหรับ launch Git Memory MCP Server
 */
export async function launchGitMemoryMCP(gitMemory: any, platform: any): Promise<GitMemoryMCPServer> {
  console.log('🚀 Launching Git Memory MCP Server...');

  // กำหนด path ของ Git repository (ใช้ current directory หรือกำหนดเอง)
  const repoPath = process.cwd();

  const gitMemoryServer = new GitMemoryMCPServer({
    repositoryPath: repoPath,
    enableHistory: true,
    maxCommits: 100,
    enableBranchTracking: true
  });

  try {
    await gitMemoryServer.initialize();

    // แสดงข้อมูล repository ที่พบ
    const repoInfo = await gitMemoryServer.getRepositoryInfo();
    console.log('📋 Repository Info:', repoInfo);

    // แสดง Git status
    const status = await gitMemoryServer.getStatus();
    console.log('📊 Git Status:', status);

    console.log('✅ Git Memory MCP Server เริ่มทำงานสำเร็จ');

    return gitMemoryServer;
  } catch (error) {
    console.error('❌ ไม่สามารถเริ่ม Git Memory MCP Server:', error);
    throw error;
  }
}
