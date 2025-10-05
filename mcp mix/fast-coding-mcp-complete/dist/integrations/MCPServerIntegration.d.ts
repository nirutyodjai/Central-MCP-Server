export declare class MCPServerIntegration {
  private cache;
  private registeredServers;
  private requestLimit;
  private performanceMetrics;
  constructor();
  registerServer(serverInfo: MCPServerInfo): void;
  getServerTools(serverId: string): Promise<any[] | null>;
  getServerResources(serverId: string): Promise<any[] | null>;
  executeTool(toolName: string, args: any): Promise<any>;
  batchExecuteTools(
    toolExecutions: Array<{
      toolName: string;
      args: any;
    }>
  ): Promise<any[]>;
  getRegisteredServers(): MCPServerInfo[];
  getPerformanceStats(): any;
  cleanup(): Promise<void>;
  private fetchServerCapabilities;
  private fetchToolsFromServer;
  private fetchResourcesFromServer;
  private findBestServerForTool;
  private calculateServerScore;
  private executeToolOnServer;
  private recordPerformanceMetric;
}
export interface MCPServerInfo {
  id: string;
  name: string;
  url: string;
  description: string;
  capabilities?: {
    tools?: string[];
    resources?: string[];
  };
  metadata?: any;
}
//# sourceMappingURL=MCPServerIntegration.d.ts.map
