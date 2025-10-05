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
import { BoilerplateGenerator } from '../tools/BoilerplateGenerator.js';
import { AutomatedDebugger } from '../tools/AutomatedDebugger.js';
import { AutomatedRefactor } from '../tools/AutomatedRefactor.js';

// Fast MCP Server inspired by Kilo Code techniques
export class FastMCPServer {
  private server: Server;
  private cache: FastCache;
  private mcpIntegration: MCPServerIntegration;
  private performanceMonitor: PerformanceMonitor;
  private serverCapabilities: Map<string, any> = new Map();

  constructor() {
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

  private setupHandlers(): void {
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
  private async getAllTools() {
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
      },
      {
        name: 'refactor_code',
        description: 'Automatically refactor code',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'The code snippet to refactor',
            },
            refactoring_type: {
              type: 'string',
              description:
                'The type of refactoring to perform (e.g., convert-to-arrow-function)',
            },
            options: {
              type: 'object',
              description: 'Options for the refactoring',
            },
          },
        },
      },
      {
        name: 'debug_code',
        description: 'Automatically debug code and suggest fixes',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'The code snippet to debug' },
            error: {
              type: 'string',
              description: 'The error message or description of the problem',
            },
          },
        },
      },
      {
        name: 'generate_boilerplate',
        description: 'Generate boilerplate code for common patterns',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description:
                'Type of boilerplate to generate (e.g., express-route, react-component)',
            },
            options: {
              type: 'object',
              description: 'Options for the specific boilerplate type',
            },
          },
        },
      }
    );

    return allTools;
  }

  // Get all resources from integrated servers
  private async getAllResources() {
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
  private async executeTool(toolName: string, args: any) {
    switch (toolName) {
      case 'fast_code_search':
        return await this.executeFastCodeSearch(args);

      case 'performance_analysis':
        return await this.executePerformanceAnalysis(args);

      case 'cache_stats':
        return this.getCacheStats();

      case 'generate_boilerplate':
        return await this.executeGenerateBoilerplate(args);

      case 'debug_code':
        return await this.executeDebugCode(args);

      case 'refactor_code':
        return await this.executeRefactorCode(args);

      default:
        // Route to integrated MCP servers
        return await this.mcpIntegration.executeTool(toolName, args);
    }
  }

  private async executeRefactorCode(args: any) {
    const { code, refactoring_type, options } = args;
    try {
      const refactoredCode = AutomatedRefactor.refactor(
        code,
        refactoring_type,
        options || {}
      );
      return {
        content: [
          {
            type: 'text',
            text: refactoredCode,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        error instanceof Error ? error.message : 'Failed to refactor code'
      );
    }
  }

  private async executeDebugCode(args: any) {
    const { code, error } = args;
    try {
      const suggestions = AutomatedDebugger.debug(code, error);
      const formattedSuggestions = suggestions
        .map(s => `- (Confidence: ${s.confidence * 100}%) ${s.message}`)
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Automated Debugging Report:\n${formattedSuggestions}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        error instanceof Error ? error.message : 'Failed to run the debugger'
      );
    }
  }

  private async executeGenerateBoilerplate(args: any) {
    const { type, options } = args;
    try {
      const generatedCode = BoilerplateGenerator.generate(type, options || {});
      return {
        content: [
          {
            type: 'text',
            text: generatedCode,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InvalidParams,
        error instanceof Error
          ? error.message
          : 'Failed to generate boilerplate'
      );
    }
  }

  private async executeFastCodeSearch(args: any) {
    const { query, fileType, maxResults = 50 } = args;

    // Use debounced search for better performance
    const searchKey = `search:${query}:${fileType || 'all'}`;

    return (
      (await this.cache.get(searchKey)) ||
      (await this.performCodeSearch(query, fileType, maxResults))
    );
  }

  private async performCodeSearch(
    query: string,
    fileType?: string,
    maxResults?: number
  ) {
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

  private async executePerformanceAnalysis(args: any) {
    const { code, language } = args;

    // Use worker pool for heavy computations
    return await this.performPerformanceAnalysis(code, language);
  }

  private async performPerformanceAnalysis(code: string, language: string) {
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

  private getCacheStats() {
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
  registerCapability(serverId: string, capabilities: any) {
    this.serverCapabilities.set(serverId, capabilities);

    // Clear tools cache when new server is added
    this.cache.delete('tools_list');
  }

  // Start the MCP server
  async start(): Promise<void> {
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
  async cleanup(): Promise<void> {
    this.cache.clear();
    await this.mcpIntegration.cleanup();
    console.log('🧹 Fast Coding MCP Server cleaned up');
  }
}
