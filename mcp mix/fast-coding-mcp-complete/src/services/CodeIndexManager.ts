import type { FSWatcher } from 'chokidar';
import fs from 'fs/promises';
import path from 'path';
import { FastCache } from '../cache/FastCache.js';

// High-performance code indexing system inspired by Kilo Code
export class CodeIndexManager {
  private cache: FastCache;
  private index: Map<string, CodeFileInfo> = new Map();
  private fileWatcher: any = null;
  private workspaceRoots: string[] = [];
  private indexingInProgress: Set<string> = new Set();

  // File extensions to index
  private readonly supportedExtensions = [
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
    '.py',
    '.java',
    '.cpp',
    '.c',
    '.h',
    '.css',
    '.scss',
    '.html',
    '.json',
    '.md',
    '.txt',
    '.rs',
    '.go',
    '.php',
  ];

  constructor() {
    this.cache = FastCache.getInstance();
  }

  // Initialize indexing for workspace folders
  async initialize(workspaceFolders: string[]): Promise<void> {
    this.workspaceRoots = workspaceFolders;

    console.log(
      `📁 Initializing code indexing for ${workspaceFolders.length} workspace(s)...`
    );

    // Start file watcher for real-time updates
    await this.startFileWatcher();

    // Index existing files
    await this.indexWorkspaceFolders();

    console.log(`✅ Code indexing initialized with ${this.index.size} files`);
  }

  // Fast code search with caching
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const cacheKey = `search:${query}:${JSON.stringify(options)}`;

    // Check cache first
    const cached = this.cache.get<SearchResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const results = await this.performSearch(query, options);

    // Cache results for 5 minutes
    this.cache.set(cacheKey, results, 300);

    return results;
  }

  // Get file information quickly
  async getFileInfo(filePath: string): Promise<CodeFileInfo | null> {
    const cacheKey = `file_info:${filePath}`;

    const cached = this.cache.get<CodeFileInfo>(cacheKey);
    if (cached) {
      return cached;
    }

    const fileInfo =
      this.index.get(filePath) || (await this.loadFileInfo(filePath));

    if (fileInfo) {
      this.cache.set(cacheKey, fileInfo, 600); // Cache for 10 minutes
    }

    return fileInfo;
  }

  // Get code statistics
  getIndexStats(): IndexStats {
    const stats: IndexStats = {
      totalFiles: this.index.size,
      totalLines: 0,
      fileTypes: new Map(),
      lastUpdated: new Date(),
    };

    for (const fileInfo of this.index.values()) {
      stats.totalLines += fileInfo.lineCount;

      const ext = path.extname(fileInfo.path);
      const current = stats.fileTypes.get(ext) || 0;
      stats.fileTypes.set(ext, current + 1);
    }

    return stats;
  }

  // Cleanup resources
  async cleanup(): Promise<void> {
    if (this.fileWatcher) {
      await this.fileWatcher.close();
      this.fileWatcher = null;
    }

    this.index.clear();
    this.indexingInProgress.clear();

    console.log('🧹 Code index cleaned up');
  }

  // Private methods

  private async startFileWatcher(): Promise<void> {
    const watchPaths = this.workspaceRoots.map(root => `${root}/**/*`);

    this.fileWatcher = chokidar.watch(watchPaths, {
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/.*',
        '**/*.log',
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100,
      },
    });

    // Handle file changes with debouncing for performance
    const handleFileChange = this.debounce((filePath: string) => {
      this.updateFileIndex(filePath);
    }, 100);

    this.fileWatcher
      .on('add', handleFileChange)
      .on('change', handleFileChange)
      .on('unlink', filePath => {
        this.removeFromIndex(filePath);
      });

    console.log('👀 File watcher started for real-time indexing');
  }

  private async indexWorkspaceFolders(): Promise<void> {
    const indexPromises = this.workspaceRoots.map(root =>
      this.indexDirectory(root)
    );
    await Promise.allSettled(indexPromises);
  }

  private async indexDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip common directories that shouldn't be indexed
          if (!this.shouldSkipDirectory(entry.name)) {
            await this.indexDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          if (this.shouldIndexFile(fullPath)) {
            await this.addFileToIndex(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to index directory ${dirPath}:`, error);
    }
  }

  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = [
      'node_modules',
      'dist',
      'build',
      '.git',
      '.vscode',
      '__pycache__',
    ];
    return skipDirs.includes(dirName);
  }

  private shouldIndexFile(filePath: string): boolean {
    const ext = path.extname(filePath);
    return (
      this.supportedExtensions.includes(ext) &&
      !filePath.includes('node_modules')
    );
  }

  private async addFileToIndex(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');

      const fileInfo: CodeFileInfo = {
        path: filePath,
        size: stats.size,
        lastModified: stats.mtime,
        lineCount: content.split('\n').length,
        extension: path.extname(filePath),
        content: content,
      };

      this.index.set(filePath, fileInfo);
    } catch (error) {
      console.warn(`Failed to add file to index ${filePath}:`, error);
    }
  }

  private async updateFileIndex(filePath: string): Promise<void> {
    if (this.indexingInProgress.has(filePath)) {
      return; // Already updating
    }

    this.indexingInProgress.add(filePath);

    try {
      if (this.shouldIndexFile(filePath)) {
        await this.addFileToIndex(filePath);
      } else {
        this.removeFromIndex(filePath);
      }
    } finally {
      this.indexingInProgress.delete(filePath);
    }
  }

  private removeFromIndex(filePath: string): void {
    this.index.delete(filePath);

    // Clear related caches
    const cacheKeysToDelete = [`file_info:${filePath}`, `search:${filePath}`];

    cacheKeysToDelete.forEach(key => {
      this.cache.delete(key);
    });
  }

  private async loadFileInfo(filePath: string): Promise<CodeFileInfo | null> {
    try {
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');

      return {
        path: filePath,
        size: stats.size,
        lastModified: stats.mtime,
        lineCount: content.split('\n').length,
        extension: path.extname(filePath),
        content: content,
      };
    } catch {
      return null;
    }
  }

  private async performSearch(
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchTerms = query
      .toLowerCase()
      .split(' ')
      .filter(term => term.length > 0);

    if (searchTerms.length === 0) {
      return results;
    }

    for (const [filePath, fileInfo] of this.index) {
      // Check if file matches criteria
      if (!this.fileMatchesCriteria(filePath, fileInfo, options)) {
        continue;
      }

      const matches = this.searchInFile(fileInfo, searchTerms);

      if (matches.length > 0) {
        results.push({
          file: filePath,
          matches: matches,
          score: this.calculateRelevanceScore(matches, searchTerms),
        });
      }

      // Limit results for performance
      if (results.length >= (options.maxResults || 50)) {
        break;
      }
    }

    // Sort by relevance score
    return results.sort((a, b) => b.score - a.score);
  }

  private fileMatchesCriteria(
    filePath: string,
    fileInfo: CodeFileInfo,
    options: SearchOptions
  ): boolean {
    if (options.fileType && fileInfo.extension !== options.fileType) {
      return false;
    }

    if (options.minSize && fileInfo.size < options.minSize) {
      return false;
    }

    if (options.maxSize && fileInfo.size > options.maxSize) {
      return false;
    }

    return true;
  }

  private searchInFile(
    fileInfo: CodeFileInfo,
    searchTerms: string[]
  ): Array<{ line: number; content: string }> {
    const matches: Array<{ line: number; content: string }> = [];
    const lines = fileInfo.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      const lineMatches = searchTerms.filter(term => line.includes(term));

      if (lineMatches.length > 0) {
        matches.push({
          line: i + 1,
          content: lines[i],
        });
      }
    }

    return matches;
  }

  private calculateRelevanceScore(
    matches: Array<{ line: number; content: string }>,
    searchTerms: string[]
  ): number {
    let score = matches.length;

    // Bonus for multiple term matches in same line
    const linesWithMultipleTerms = new Set(
      matches
        .filter(match => {
          const matchCount = searchTerms.filter(term =>
            match.content.toLowerCase().includes(term)
          ).length;
          return matchCount > 1;
        })
        .map(match => match.line)
    );

    score += linesWithMultipleTerms.size * 2;

    return score;
  }

  private debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): T {
    let timeout: NodeJS.Timeout | null = null;

    return ((...args: Parameters<T>) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => func(...args), wait);
    }) as T;
  }
}

// Types
export interface CodeFileInfo {
  path: string;
  size: number;
  lastModified: Date;
  lineCount: number;
  extension: string;
  content: string;
}

export interface SearchOptions {
  fileType?: string;
  maxResults?: number;
  minSize?: number;
  maxSize?: number;
}

export interface SearchResult {
  file: string;
  matches: Array<{ line: number; content: string }>;
  score: number;
}

export interface IndexStats {
  totalFiles: number;
  totalLines: number;
  fileTypes: Map<string, number>;
  lastUpdated: Date;
}
