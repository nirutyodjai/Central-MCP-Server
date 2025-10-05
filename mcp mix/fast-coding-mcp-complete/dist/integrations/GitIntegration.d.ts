export declare class GitManager {
  private repoPath;
  constructor(repoPath?: string);
  init(): Promise<boolean>;
  getCommitHistory(filePath: string): Promise<any[]>;
  cleanup(): Promise<void>;
}
//# sourceMappingURL=GitIntegration.d.ts.map
