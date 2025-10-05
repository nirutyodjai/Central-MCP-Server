export declare class FastMCPServer {
  private server;
  private cache;
  private mcpIntegration;
  private performanceMonitor;
  private serverCapabilities;
  constructor();
  private setupHandlers;
  private getAllTools;
  private getAllResources;
  private executeTool;
  private executeFastCodeSearch;
  private performCodeSearch;
  private executePerformanceAnalysis;
  private performPerformanceAnalysis;
  private getCacheStats;
  registerCapability(serverId: string, capabilities: any): void;
  start(): Promise<void>;
  getPerformanceStats(): import('../utils/PerformanceMonitor.js').PerformanceStats;
  cleanup(): Promise<void>;
}
//# sourceMappingURL=FastMCPServer.d.ts.map
