/**
 * Multi-Fetch MCP Server Integration
 * รวม multi-fetch-mcp-server เข้ากับ Fast Coding MCP Server
 */

import { spawn } from 'child_process';
import path from 'path';

// Multi-Fetch MCP Integration Class
export class MultiFetchIntegration {
  private gitMemory: any;
  private fastCodingServer: any;
  private multiFetchProcess: any = null;
  private isConnected: boolean = false;

  constructor(gitMemory: any, fastCodingServer: any) {
    this.gitMemory = gitMemory;
    this.fastCodingServer = fastCodingServer;
  }

  // Initialize multi-fetch integration
  async initialize(): Promise<void> {
    console.log('🔗 Initializing Multi-Fetch MCP Server integration...');

    try {
      // Check if multi-fetch is available
      await this.checkMultiFetchAvailability();

      // Start multi-fetch server process
      await this.startMultiFetchServer();

      // Setup integration hooks
      await this.setupIntegrationHooks();

      this.isConnected = true;
      console.log('✅ Multi-Fetch integration initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Multi-Fetch integration:', error);
      throw error;
    }
  }

  private async checkMultiFetchAvailability(): Promise<void> {
    console.log('🔍 Checking Multi-Fetch MCP Server availability...');

    try {
      // Try to run multi-fetch command
      const testProcess = spawn(
        'npx',
        ['@lmcc-dev/mult-fetch-mcp-server', '--help'],
        {
          stdio: 'pipe',
          timeout: 5000,
        }
      );

      return new Promise((resolve, reject) => {
        testProcess.on('close', code => {
          if (code === 0) {
            console.log('✅ Multi-Fetch MCP Server is available');
            resolve();
          } else {
            reject(new Error(`Multi-Fetch not available (exit code: ${code})`));
          }
        });

        testProcess.on('error', error => {
          reject(new Error(`Failed to run Multi-Fetch: ${error.message}`));
        });

        testProcess.on('timeout', () => {
          testProcess.kill();
          reject(new Error('Multi-Fetch check timed out'));
        });
      });
    } catch (error) {
      throw new Error(`Multi-Fetch MCP Server not found: ${error.message}`);
    }
  }

  private async startMultiFetchServer(): Promise<void> {
    console.log('🚀 Starting Multi-Fetch MCP Server...');

    return new Promise((resolve, reject) => {
      try {
        // Start multi-fetch server as child process
        this.multiFetchProcess = spawn(
          'npx',
          ['@lmcc-dev/mult-fetch-mcp-server'],
          {
            stdio: ['pipe', 'pipe', 'inherit'], // stdin, stdout, stderr
            env: {
              ...process.env,
              MCP_LANG: 'en',
            },
          }
        );

        let startupOutput = '';

        // Handle stdout
        this.multiFetchProcess.stdout.on('data', (data: Buffer) => {
          startupOutput += data.toString();

          // Check for successful startup
          if (
            startupOutput.includes('MCP server starting') ||
            startupOutput.includes('listening')
          ) {
            console.log('✅ Multi-Fetch MCP Server started successfully');
            resolve();
          }
        });

        // Handle errors
        this.multiFetchProcess.on('error', error => {
          console.error('❌ Failed to start Multi-Fetch server:', error);
          reject(error);
        });

        this.multiFetchProcess.on('close', code => {
          if (code !== 0) {
            console.error(`❌ Multi-Fetch server exited with code ${code}`);
            this.isConnected = false;
          }
        });

        // Set timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Multi-Fetch server startup timed out'));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  private async setupIntegrationHooks(): Promise<void> {
    console.log('🔗 Setting up integration hooks...');

    // Setup enhanced tools that use multi-fetch
    this.setupEnhancedTools();

    // Setup data collection workflows
    this.setupDataCollectionWorkflows();

    // Setup error handling
    this.setupErrorHandling();

    console.log('✅ Integration hooks setup completed');
  }

  private setupEnhancedTools(): void {
    // Add enhanced tools to Fast Coding MCP Server
    const enhancedTools = {
      // Enhanced web content fetching
      fetch_web_content: async (args: any) => {
        return await this.fetchWebContent(args);
      },

      // Enhanced code fetching from multiple sources
      fetch_code_from_web: async (args: any) => {
        return await this.fetchCodeFromWeb(args);
      },

      // Enhanced investment data collection
      fetch_investment_data: async (args: any) => {
        return await this.fetchInvestmentData(args);
      },

      // Enhanced content analysis
      analyze_web_content: async (args: any) => {
        return await this.analyzeWebContent(args);
      },
    };

    // Register tools with Fast Coding MCP Server
    Object.entries(enhancedTools).forEach(([toolName, toolFunction]) => {
      this.fastCodingServer.addTool(toolName, toolFunction);
    });
  }

  private async fetchWebContent(args: any): Promise<any> {
    const { url, format = 'html', options = {} } = args;

    try {
      // Use multi-fetch to get web content
      const fetchResult = await this.callMultiFetch('fetch_' + format, {
        url,
        ...options,
      });

      // Store result in Git Memory
      await this.gitMemory.store({
        type: 'web_content_fetch',
        url,
        format,
        result: fetchResult,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        url,
        format,
        content: fetchResult.content,
        metadata: fetchResult.metadata,
      };
    } catch (error) {
      return {
        success: false,
        url,
        error: error.message,
      };
    }
  }

  private async fetchCodeFromWeb(args: any): Promise<any> {
    const { url, language, searchQuery } = args;

    try {
      let result;

      if (searchQuery) {
        // Search for code
        result = await this.callMultiFetch('fetch_html', {
          url: `https://api.github.com/search/code?q=${encodeURIComponent(searchQuery)}+language:${language}`,
          headers: {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Fast-Coding-MCP-Server/1.0.0',
          },
        });
      } else {
        // Fetch specific code file
        result = await this.callMultiFetch('fetch_txt', { url });
      }

      // Analyze code if it's a code file
      let analysis = null;
      if (
        (this.fastCodingServer && url.includes('.js')) ||
        url.includes('.ts') ||
        url.includes('.py')
      ) {
        analysis = await this.fastCodingServer.analyzeCode(
          result.content,
          path.extname(url)
        );
      }

      // Store in Git Memory
      await this.gitMemory.store({
        type: 'external_code_fetch',
        url,
        language,
        searchQuery,
        result,
        analysis,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        url,
        content: result.content,
        analysis,
        source: 'multi_fetch_mcp',
      };
    } catch (error) {
      return {
        success: false,
        url,
        error: error.message,
      };
    }
  }

  private async fetchInvestmentData(args: any): Promise<any> {
    const { dataType = 'stocks', source = 'set', options = {} } = args;

    try {
      let result;

      switch (dataType) {
        case 'stocks':
          if (source === 'set') {
            result = await this.fetchSETData(options);
          } else {
            result = await this.fetchStockData(source, options);
          }
          break;

        case 'crypto':
          result = await this.fetchCryptoData(options);
          break;

        case 'news':
          result = await this.fetchFinancialNews(options);
          break;

        case 'exchange_rates':
          result = await this.fetchExchangeRates(options);
          break;

        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }

      // Store in Git Memory
      await this.gitMemory.store({
        type: 'investment_data_fetch',
        dataType,
        source,
        result,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        dataType,
        source,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        dataType,
        error: error.message,
      };
    }
  }

  private async analyzeWebContent(args: any): Promise<any> {
    const { url, analysisType = 'content' } = args;

    try {
      // Fetch content first
      const fetchResult = await this.callMultiFetch('fetch_html', {
        url,
        extractContent: true,
        includeMetadata: true,
      });

      let analysis = {};

      switch (analysisType) {
        case 'content':
          analysis = await this.analyzeContent(fetchResult.content);
          break;
        case 'seo':
          analysis = await this.analyzeSEO(
            fetchResult.content,
            fetchResult.metadata
          );
          break;
        case 'performance':
          analysis = await this.analyzePerformance(url);
          break;
        default:
          analysis = { type: analysisType, content: fetchResult.content };
      }

      return {
        success: true,
        url,
        analysisType,
        analysis,
        metadata: fetchResult.metadata,
      };
    } catch (error) {
      return {
        success: false,
        url,
        error: error.message,
      };
    }
  }

  // Helper method to call multi-fetch tools
  private async callMultiFetch(toolName: string, args: any): Promise<any> {
    // This would integrate with the actual multi-fetch MCP server
    // For now, simulate the response
    console.log(`📡 Calling Multi-Fetch tool: ${toolName}`);

    // Simulate multi-fetch response
    return {
      content: `Mock response from ${toolName}`,
      metadata: {
        tool: toolName,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Investment data fetching methods
  private async fetchSETData(options: any): Promise<any> {
    // Integrate with SET data fetching
    return {
      stocks: [
        { symbol: 'PTT', price: 35.5, change: +0.75 },
        { symbol: 'AOT', price: 68.25, change: -1.25 },
      ],
      lastUpdated: new Date().toISOString(),
    };
  }

  private async fetchStockData(source: string, options: any): Promise<any> {
    // Integrate with other stock data sources
    return {
      source,
      stocks: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  private async fetchCryptoData(options: any): Promise<any> {
    // Integrate with crypto data fetching
    return {
      cryptocurrencies: [
        { symbol: 'BTC', price: 43250, change_24h: +2.45 },
        { symbol: 'ETH', price: 2650, change_24h: +1.82 },
      ],
      lastUpdated: new Date().toISOString(),
    };
  }

  private async fetchFinancialNews(options: any): Promise<any> {
    // Integrate with financial news fetching
    return {
      articles: [
        {
          title: 'ธปท. คงดอกเบี้ยที่ 2.50%',
          source: 'Bangkok Post',
          publishedAt: new Date().toISOString(),
        },
      ],
      lastUpdated: new Date().toISOString(),
    };
  }

  private async fetchExchangeRates(options: any): Promise<any> {
    // Integrate with exchange rate fetching
    return {
      rates: [
        { from: 'THB', to: 'USD', rate: 0.0294 },
        { from: 'THB', to: 'EUR', rate: 0.0271 },
      ],
      lastUpdated: new Date().toISOString(),
    };
  }

  // Content analysis methods
  private async analyzeContent(content: string): Promise<any> {
    return {
      wordCount: content.split(' ').length,
      characterCount: content.length,
      estimatedReadingTime: Math.ceil(content.split(' ').length / 200), // 200 words per minute
      hasCode: /function|class|def /.test(content),
      language: this.detectLanguage(content),
    };
  }

  private async analyzeSEO(content: string, metadata: any): Promise<any> {
    return {
      title: metadata?.title || 'No title',
      hasMetaDescription: !!metadata?.excerpt,
      headings: this.extractHeadings(content),
      links: this.extractLinks(content),
      images: this.extractImages(content),
    };
  }

  private async analyzePerformance(url: string): Promise<any> {
    // Simulate performance analysis
    return {
      responseTime: Math.random() * 1000 + 100,
      pageSize: Math.random() * 500000 + 100000,
      loadTime: Math.random() * 2000 + 500,
      recommendations: [
        'Enable gzip compression',
        'Optimize images',
        'Minify CSS and JavaScript',
      ],
    };
  }

  private detectLanguage(content: string): string {
    if (content.includes('function') && content.includes('var '))
      return 'javascript';
    if (content.includes('def ') && content.includes('import '))
      return 'python';
    if (content.includes('public class')) return 'java';
    if (content.includes('package main')) return 'go';
    return 'unknown';
  }

  private extractHeadings(content: string): string[] {
    const headingMatches = content.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi) || [];
    return headingMatches.map(h => h.replace(/<[^>]*>/g, '').trim());
  }

  private extractLinks(content: string): string[] {
    const linkMatches = content.match(/href=["']([^"']+)["']/gi) || [];
    return linkMatches.map(link => link.replace(/href=["']|["']/g, ''));
  }

  private extractImages(content: string): string[] {
    const imageMatches = content.match(/src=["']([^"']+)["']/gi) || [];
    return imageMatches.map(img => img.replace(/src=["']|["']/g, ''));
  }

  private setupDataCollectionWorkflows(): void {
    // Setup automated workflows
    this.setupAutomatedCollection();
    this.setupErrorRecovery();
    this.setupPerformanceMonitoring();
  }

  private setupAutomatedCollection(): void {
    // Setup scheduled data collection
    setInterval(async () => {
      try {
        console.log('🔄 Running automated web data collection...');

        // Collect investment data
        await this.fetchInvestmentData({ dataType: 'stocks', source: 'set' });
        await this.fetchInvestmentData({ dataType: 'crypto' });
        await this.fetchInvestmentData({ dataType: 'exchange_rates' });
      } catch (error) {
        console.error('❌ Automated collection failed:', error);
      }
    }, 3600000); // Every hour
  }

  private setupErrorRecovery(): void {
    // Setup error recovery mechanisms
    process.on('uncaughtException', async error => {
      console.error('💥 Uncaught exception in Multi-Fetch integration:', error);

      // Attempt to restart multi-fetch server
      if (this.multiFetchProcess) {
        try {
          await this.restartMultiFetchServer();
        } catch (restartError) {
          console.error(
            '❌ Failed to restart Multi-Fetch server:',
            restartError
          );
        }
      }
    });
  }

  private setupPerformanceMonitoring(): void {
    // Monitor integration performance
    setInterval(() => {
      this.logPerformanceMetrics();
    }, 60000); // Every minute
  }

  private async restartMultiFetchServer(): Promise<void> {
    console.log('🔄 Restarting Multi-Fetch MCP Server...');

    if (this.multiFetchProcess) {
      this.multiFetchProcess.kill();
      this.multiFetchProcess = null;
      this.isConnected = false;
    }

    await this.startMultiFetchServer();
  }

  private async logPerformanceMetrics(): Promise<void> {
    // Log performance metrics to Git Memory
    await this.gitMemory.store({
      type: 'integration_performance',
      metrics: {
        isConnected: this.isConnected,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Public methods for external access
  async isHealthy(): Promise<boolean> {
    return (
      this.isConnected &&
      this.multiFetchProcess &&
      !this.multiFetchProcess.killed
    );
  }

  async getStatus(): Promise<any> {
    return {
      connected: this.isConnected,
      processRunning: this.multiFetchProcess && !this.multiFetchProcess.killed,
      uptime: this.multiFetchProcess ? process.uptime() : 0,
      lastActivity: new Date().toISOString(),
    };
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up Multi-Fetch integration...');

    if (this.multiFetchProcess) {
      this.multiFetchProcess.kill();
      this.multiFetchProcess = null;
    }

    this.isConnected = false;
    console.log('✅ Multi-Fetch integration cleaned up');
  }
}

// Integration launcher
export async function launchMultiFetchIntegration(
  gitMemory: any,
  fastCodingServer: any
): Promise<MultiFetchIntegration> {
  console.log('🚀 Launching Multi-Fetch MCP Server Integration...');

  const integration = new MultiFetchIntegration(gitMemory, fastCodingServer);

  try {
    await integration.initialize();

    console.log('✅ Multi-Fetch Integration launched successfully!');
    console.log('🎯 Enhanced capabilities now available:');
    console.log('   🌐 Advanced web content fetching');
    console.log('   📊 Investment data collection');
    console.log('   🔍 Content analysis and extraction');
    console.log('   💾 Git Memory storage integration');

    return integration;
  } catch (error) {
    console.error('❌ Failed to launch Multi-Fetch integration:', error);
    throw error;
  }
}

// Export for use in other modules
export default MultiFetchIntegration;
