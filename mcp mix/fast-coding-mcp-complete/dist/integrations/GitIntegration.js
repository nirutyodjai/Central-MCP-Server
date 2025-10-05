// Minimal GitIntegration stub to satisfy build imports.
export class GitManager {
  constructor(repoPath = '.') {
    this.repoPath = repoPath;
  }
  async init() {
    // Initialize git repo or verify existence
    return true;
  }
  async getCommitHistory(filePath) {
    return [];
  }
  async cleanup() {
    return;
  }
}
//# sourceMappingURL=GitIntegration.js.map
