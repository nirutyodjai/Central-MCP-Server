export declare class CodeIndexManager {
  private cache;
  private index;
  private fileWatcher;
  private workspaceRoots;
  private indexingInProgress;
  private readonly supportedExtensions;
  constructor();
  initialize(workspaceFolders: string[]): Promise<void>;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  getFileInfo(filePath: string): Promise<CodeFileInfo | null>;
  getIndexStats(): IndexStats;
  cleanup(): Promise<void>;
  private startFileWatcher;
  private indexWorkspaceFolders;
  private indexDirectory;
  private shouldSkipDirectory;
  private shouldIndexFile;
  private addFileToIndex;
  private updateFileIndex;
  private removeFromIndex;
  private loadFileInfo;
  private performSearch;
  private fileMatchesCriteria;
  private searchInFile;
  private calculateRelevanceScore;
  private debounce;
}
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
  matches: Array<{
    line: number;
    content: string;
  }>;
  score: number;
}
export interface IndexStats {
  totalFiles: number;
  totalLines: number;
  fileTypes: Map<string, number>;
  lastUpdated: Date;
}
//# sourceMappingURL=CodeIndexManager.d.ts.map
