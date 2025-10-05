import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { FastCache } from '../cache/FastCache.js';
import { MCPServerIntegration } from '../integrations/MCPServerIntegration.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
// Fast MCP Server inspired by Kilo Code techniques
export class FastMCPServer {
  constructor() {
    this.serverCapabilities = new Map();
    this.cache = FastCache.getInstance();
    this.performanceMonitor = new PerformanceMonitor();
    this.mcpIntegration = new MCPServerIntegration();
    this.server = new Server(
      {
        name: 'fast-coding-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );
    this.setupHandlers();
  }
  setupHandlers() {
    // List available tools with caching
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const cacheKey = 'tools_list';
      // Check cache first
      const cachedTools = this.cache.get(cacheKey);
      if (cachedTools) {
        this.performanceMonitor.recordCacheHit('tools');
        return cachedTools;
      }
      this.performanceMonitor.recordCacheMiss('tools');
      // Get tools from all integrated MCP servers
      const tools = await this.getAllTools();
      // Cache the result
      this.cache.set(cacheKey, { tools }, 300); // Cache for 5 minutes
      return { tools };
    });
    // Handle tool execution with performance monitoring
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const startTime = Date.now();
      const { name, arguments: args } = request.params;
      try {
        // Check if tool exists in our capabilities
        const toolCapabilities = this.serverCapabilities.get(name);
        if (!toolCapabilities) {
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
        // Execute tool with performance monitoring
        const result = await this.executeTool(name, args || {});
        // Record performance metrics
        this.performanceMonitor.recordToolExecution(
          name,
          Date.now() - startTime
        );
        return result;
      } catch (error) {
        this.performanceMonitor.recordToolError(name, Date.now() - startTime);
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
    // List resources with caching
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const cacheKey = 'resources_list';
      const cachedResources = this.cache.get(cacheKey);
      if (cachedResources) {
        this.performanceMonitor.recordCacheHit('resources');
        return cachedResources;
      }
      this.performanceMonitor.recordCacheMiss('resources');
      const resources = await this.getAllResources();
      this.cache.set(cacheKey, { resources }, 300);
      return { resources };
    });
  }
  // Get all tools from integrated MCP servers
  async getAllTools() {
    const allTools = [];
    // Add tools from integrated servers
    for (const [serverId, serverInfo] of this.serverCapabilities) {
      try {
        const serverTools = await this.mcpIntegration.getServerTools(serverId);
        if (serverTools) {
          allTools.push(...serverTools);
        }
      } catch (error) {
        console.warn(`Failed to get tools from server ${serverId}:`, error);
      }
    }
    // Add fast coding specific tools
    allTools.push(
      {
        name: 'fast_code_search',
        description: 'Fast code search with caching and indexing',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            fileType: { type: 'string' },
            maxResults: { type: 'number' },
          },
        },
      },
      {
        name: 'performance_analysis',
        description: 'Analyze code performance using advanced techniques',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            language: { type: 'string' },
          },
        },
      },
      {
        name: 'cache_stats',
        description: 'Get cache performance statistics',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      }
    );
    return allTools;
  }
  // Get all resources from integrated servers
  async getAllResources() {
    const allResources = [];
    // Add resources from integrated servers
    for (const [serverId, serverInfo] of this.serverCapabilities) {
      try {
        const serverResources =
          await this.mcpIntegration.getServerResources(serverId);
        if (serverResources) {
          allResources.push(...serverResources);
        }
      } catch (error) {
        console.warn(`Failed to get resources from server ${serverId}:`, error);
      }
    }
    // Add fast coding specific resources
    allResources.push(
      {
        uri: 'fast-coding://cache-stats',
        name: 'Cache Statistics',
        description: 'Current cache performance statistics',
        mimeType: 'application/json',
      },
      {
        uri: 'fast-coding://performance-metrics',
        name: 'Performance Metrics',
        description: 'Server performance metrics and analytics',
        mimeType: 'application/json',
      }
    );
    return allResources;
  }
  // Execute tool with fast processing
  async executeTool(toolName, args) {
    switch (toolName) {
      case 'fast_code_search':
        return await this.executeFastCodeSearch(args);
      case 'performance_analysis':
        return await this.executePerformanceAnalysis(args);
      case 'cache_stats':
        return this.getCacheStats();
      default:
        // Route to integrated MCP servers
        return await this.mcpIntegration.executeTool(toolName, args);
    }
  }
  async executeFastCodeSearch(args) {
    const { query, fileType, maxResults = 50 } = args;
    // Use debounced search for better performance
    const searchKey = `search:${query}:${fileType || 'all'}`;
    return (
      (await this.cache.get(searchKey)) ||
      (await this.performCodeSearch(query, fileType, maxResults))
    );
  }
  async performCodeSearch(query, fileType, maxResults) {
    // Implementation would use fast indexing techniques
    // For now, return mock result
    return {
      content: [
        {
          type: 'text',
          text: `Fast code search results for "${query}"`,
        },
      ],
    };
  }
  async executePerformanceAnalysis(args) {
    const { code, language } = args;
    // Use worker pool for heavy computations
    return await this.performPerformanceAnalysis(code, language);
  }
  async performPerformanceAnalysis(code, language) {
    // Implementation would analyze code performance
    return {
      content: [
        {
          type: 'text',
          text: `Performance analysis for ${language} code`,
        },
      ],
    };
  }
  getCacheStats() {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(this.cache.getStats(), null, 2),
        },
      ],
    };
  }
  // Register a new MCP server capability
  registerCapability(serverId, capabilities) {
    this.serverCapabilities.set(serverId, capabilities);
    // Clear tools cache when new server is added
    this.cache.delete('tools_list');
  }
  // Start the MCP server
  async start() {
    console.log('🚀 Starting Fast Coding MCP Server...');
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('✅ Fast Coding MCP Server started successfully');
    console.log('📊 Performance monitoring enabled');
    console.log('💾 High-performance caching enabled');
  }
  // Get performance statistics
  getPerformanceStats() {
    return this.performanceMonitor.getStats();
  }
  // Cleanup resources
  async cleanup() {
    this.cache.clear();
    await this.mcpIntegration.cleanup();
    console.log('🧹 Fast Coding MCP Server cleaned up');
  }
}
//# sourceMappingURL=FastMCPServer.js.map
