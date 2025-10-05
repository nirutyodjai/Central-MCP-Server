/**
 * Web Data Integration with Git Memory MCP
 * รวมการดึงข้อมูลจากเว็บเข้ากับระบบ Git Memory
 */
export declare class WebDataGitMemoryIntegration {
  private gitMemory;
  private webScrapers;
  constructor(gitMemoryInstance: any);
  private initializeWebScrapers;
  integrateWebDataWithGitMemory(): Promise<void>;
  private testAllConnections;
  private collectAllWebData;
  private setupScheduledTasks;
  private scrapeEGPData;
  private fetchProcurementData;
  private monitorMaterialPrices;
  private monitorWebsiteStatus;
  getIntegrationStats(): Promise<any>;
  cleanupOldData(daysToKeep?: number): Promise<void>;
}
export declare function launchWebDataIntegration(
  gitMemoryInstance: any
): Promise<void>;
//# sourceMappingURL=web-git-memory-integration.d.ts.map
