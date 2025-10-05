import axios from 'axios';
import pLimit from 'p-limit';
import { FastCache } from '../cache/FastCache.js';

// Integration with existing MCP servers using high-performance techniques
export class MCPServerIntegration {
  private cache: FastCache;
  private registeredServers: Map<string, MCPServerInfo> = new Map();
  private requestLimit = pLimit(10); // Limit concurrent requests
  private performanceMetrics: Map<string, PerformanceData> = new Map();

  constructor() {
    this.cache = FastCache.getInstance();
  }

  // Register an existing MCP server
  registerServer(serverInfo: MCPServerInfo): void {
    this.registeredServers.set(serverInfo.id, serverInfo);

    // Pre-fetch server capabilities for better performance
    this.requestLimit(() => this.fetchServerCapabilities(serverInfo));
  }

  // Get tools from a specific server with caching
  async getServerTools(serverId: string): Promise<any[] | null> {
    const cacheKey = `server_tools:${serverId}`;

    // Check cache first
    const cached = this.cache.get<any[]>(cacheKey) as any[] | undefined;
    if (cached) {
      return cached;
    }

    const serverInfo = this.registeredServers.get(serverId);
    if (!serverInfo) {
      return null;
    }

    try {
      const tools = await this.fetchToolsFromServer(serverInfo);
      this.cache.set(cacheKey, tools, 600); // Cache for 10 minutes
      return tools;
    } catch (error) {
      console.warn(`Failed to fetch tools from server ${serverId}:`, error);
      return null;
    }
  }

  // Get resources from a specific server with caching
  async getServerResources(serverId: string): Promise<any[] | null> {
    const cacheKey = `server_resources:${serverId}`;

    const cached = this.cache.get<any[]>(cacheKey) as any[] | undefined;
    if (cached) {
      return cached;
    }

    const serverInfo = this.registeredServers.get(serverId);
    if (!serverInfo) {
      return null;
    }

    try {
      const resources = await this.fetchResourcesFromServer(serverInfo);
      this.cache.set(cacheKey, resources, 600);
      return resources;
    } catch (error) {
      console.warn(`Failed to fetch resources from server ${serverId}:`, error);
      return null;
    }
  }

  // Execute tool on appropriate server with load balancing
  async executeTool(toolName: string, args: any): Promise<any> {
    const startTime = Date.now();

    try {
      // Find the best server for this tool
      const targetServer = await this.findBestServerForTool(toolName);

      if (!targetServer) {
        throw new Error(`No server found for tool: ${toolName}`);
      }

      // Execute with concurrency limiting
      const result = await this.requestLimit(() =>
        this.executeToolOnServer(targetServer, toolName, args)
      );

      // Record performance metrics
      this.recordPerformanceMetric(
        targetServer.id,
        toolName,
        Date.now() - startTime,
        true
      );

      return result;
    } catch (error) {
      this.recordPerformanceMetric(
        'unknown',
        toolName,
        Date.now() - startTime,
        false
      );

      throw new Error(
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Batch execute multiple tools for better performance
  async batchExecuteTools(
    toolExecutions: Array<{ toolName: string; args: any }>
  ): Promise<any[]> {
    const promises = toolExecutions.map(({ toolName, args }) =>
      this.executeTool(toolName, args)
    );

    // Use Promise.allSettled for partial failures
    const results = await Promise.allSettled(promises);

    return results.map((result, index) => ({
      index,
      success: result.status === 'fulfilled',
      result: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null,
    }));
  }

  // Get all registered servers
  getRegisteredServers(): MCPServerInfo[] {
    return Array.from(this.registeredServers.values());
  }

  // Get performance statistics
  getPerformanceStats(): any {
    const stats: any = {};

    for (const [serverId, metrics] of this.performanceMetrics) {
      stats[serverId] = {
        totalExecutions: metrics.totalExecutions,
        averageResponseTime:
          metrics.totalResponseTime / metrics.totalExecutions,
        successRate: metrics.successCount / metrics.totalExecutions,
        errorCount: metrics.errorCount,
      };
    }

    return stats;
  }

  // Cleanup resources
  async cleanup(): Promise<void> {
    this.registeredServers.clear();
    this.performanceMetrics.clear();
    console.log('🧹 MCP Server Integration cleaned up');
  }

  // Private methods

  private async fetchServerCapabilities(
    serverInfo: MCPServerInfo
  ): Promise<void> {
    try {
      const response = await axios.get(`${serverInfo.url}/capabilities`, {
        timeout: 5000,
        validateStatus: status => status < 500,
      });

      if (response.data && response.data.capabilities) {
        serverInfo.capabilities = response.data.capabilities;
      }
    } catch (error) {
      console.warn(
        `Failed to fetch capabilities for server ${serverInfo.id}:`,
        error
      );
    }
  }

  private async fetchToolsFromServer(
    serverInfo: MCPServerInfo
  ): Promise<any[]> {
    const response = await axios.post(
      `${serverInfo.url}/tools`,
      {},
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data?.tools || [];
  }

  private async fetchResourcesFromServer(
    serverInfo: MCPServerInfo
  ): Promise<any[]> {
    const response = await axios.post(
      `${serverInfo.url}/resources`,
      {},
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data?.resources || [];
  }

  private async findBestServerForTool(
    toolName: string
  ): Promise<MCPServerInfo | null> {
    let bestServer: MCPServerInfo | null = null;
    let bestScore = -1;

    for (const serverInfo of this.registeredServers.values()) {
      const score = this.calculateServerScore(serverInfo, toolName);

      if (score > bestScore) {
        bestScore = score;
        bestServer = serverInfo;
      }
    }

    return bestServer;
  }

  private calculateServerScore(
    serverInfo: MCPServerInfo,
    toolName: string
  ): number {
    let score = 0;

    // Check if server has the tool in its capabilities
    if (serverInfo.capabilities && serverInfo.capabilities.tools) {
      if (serverInfo.capabilities.tools.includes(toolName)) {
        score += 10;
      }
    }

    // Check performance metrics
    const metrics = this.performanceMetrics.get(serverInfo.id);
    if (metrics) {
      const avgResponseTime =
        metrics.totalResponseTime / metrics.totalExecutions;
      const successRate = metrics.successCount / metrics.totalExecutions;

      // Prefer servers with better performance
      score += (1 - avgResponseTime / 10000) * 5; // Normalize response time
      score += successRate * 5;
    }

    // Prefer servers with fewer errors
    if (metrics && metrics.errorCount < metrics.successCount) {
      score += 2;
    }

    return score;
  }

  private async executeToolOnServer(
    serverInfo: MCPServerInfo,
    toolName: string,
    args: any
  ): Promise<any> {
    const response = await axios.post(
      `${serverInfo.url}/execute`,
      {
        tool: toolName,
        arguments: args,
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  private recordPerformanceMetric(
    serverId: string,
    toolName: string,
    responseTime: number,
    success: boolean
  ): void {
    if (!this.performanceMetrics.has(serverId)) {
      this.performanceMetrics.set(serverId, {
        totalExecutions: 0,
        totalResponseTime: 0,
        successCount: 0,
        errorCount: 0,
      });
    }

    const metrics = this.performanceMetrics.get(serverId)!;
    metrics.totalExecutions++;
    metrics.totalResponseTime += responseTime;

    if (success) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
    }
  }
}

// Types
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

interface PerformanceData {
  totalExecutions: number;
  totalResponseTime: number;
  successCount: number;
  errorCount: number;
}
