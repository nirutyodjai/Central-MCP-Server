// Minimal GitIntegration stub to satisfy build imports.
export class GitManager {
  constructor(private repoPath: string = '.') {}

  async init() {
    // Initialize git repo or verify existence
    return true;
  }

  async getCommitHistory(filePath: string) {
    return [] as any[];
  }

  async cleanup() {
    return;
  }
}
