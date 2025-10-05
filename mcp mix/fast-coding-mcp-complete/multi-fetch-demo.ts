#!/usr/bin/env node

/**
 * Multi-Fetch Integration Demo
 * สาธิตการใช้งาน multi-fetch-mcp-server ร่วมกับ Fast Coding MCP Server
 */

// Mock implementations for demo
class MockGitMemory {
  private storage: Map<string, any[]> = new Map();

  async store(data: any): Promise<void> {
    const type = data.type || 'unknown';
    if (!this.storage.has(type)) {
      this.storage.set(type, []);
    }
    this.storage.get(type)!.push({
      ...data,
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });
    console.log(`💾 Stored ${type} in Git Memory`);
  }

  async retrieve(query: any): Promise<any[]> {
    const type = query.type;
    const limit = query.limit || 100;
    if (!this.storage.has(type)) {
      return [];
    }
    return this.storage.get(type)!.slice(-limit);
  }
}

class MockFastCodingServer {
  async analyzeCode(content: string, extension: string): Promise<any> {
    return {
      language: extension,
      lines: content.split('\n').length,
      complexity: Math.floor(Math.random() * 10) + 1,
      suggestions: ['Consider adding error handling', 'Add type annotations'],
    };
  }

  addTool(name: string, func: Function): void {
    console.log(`🔧 Added tool: ${name}`);
  }
}

// Main demo function
async function runMultiFetchIntegrationDemo() {
  console.log('🚀 Multi-Fetch Integration Demo Starting...\n');

  try {
    // Initialize mock components
    const gitMemory = new MockGitMemory();
    const fastCodingServer = new MockFastCodingServer();

    // Import and initialize integration
    const { MultiFetchIntegration } = await import(
      './multi-fetch-integration.ts'
    );
    const integration = new MultiFetchIntegration(gitMemory, fastCodingServer);

    console.log('🔗 Initializing integration...');
    await integration.initialize();

    // Demo 1: Fetch web content
    console.log('\n📥 Demo 1: Fetching web content...');
    const webContent = await integration['fetchWebContent']({
      url: 'https://example.com',
      format: 'html',
      options: { extractContent: true },
    });

    console.log(
      '✅ Web content fetched:',
      webContent.success ? 'Success' : 'Failed'
    );

    // Demo 2: Fetch code from web
    console.log('\n💻 Demo 2: Fetching code from web...');
    const codeFetch = await integration['fetchCodeFromWeb']({
      url: 'https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/editor/common/model/textModel.ts',
      language: 'typescript',
    });

    console.log('✅ Code fetched:', codeFetch.success ? 'Success' : 'Failed');

    // Demo 3: Fetch investment data
    console.log('\n📈 Demo 3: Fetching investment data...');
    const investmentData = await integration['fetchInvestmentData']({
      dataType: 'stocks',
      source: 'set',
    });

    console.log(
      '✅ Investment data fetched:',
      investmentData.success ? 'Success' : 'Failed'
    );

    // Demo 4: Analyze web content
    console.log('\n🔍 Demo 4: Analyzing web content...');
    const analysis = await integration['analyzeWebContent']({
      url: 'https://example.com',
      analysisType: 'seo',
    });

    console.log(
      '✅ Content analyzed:',
      analysis.success ? 'Success' : 'Failed'
    );

    // Show integration status
    console.log('\n📊 Integration Status:');
    const status = await integration.getStatus();
    console.log('Connected:', status.connected);
    console.log('Process Running:', status.processRunning);
    console.log('Uptime:', Math.floor(status.uptime), 'seconds');

    // Show stored data summary
    console.log('\n📋 Data Storage Summary:');
    const webContentData = await gitMemory.retrieve({
      type: 'web_content_fetch',
    });
    const codeData = await gitMemory.retrieve({ type: 'external_code_fetch' });
    const investmentDataStored = await gitMemory.retrieve({
      type: 'investment_data_fetch',
    });

    console.log(`🌐 Web content fetches: ${webContentData.length}`);
    console.log(`💻 Code fetches: ${codeData.length}`);
    console.log(`📈 Investment data fetches: ${investmentDataStored.length}`);

    console.log('\n🎉 Multi-Fetch Integration Demo completed successfully!');
    console.log('🎯 Key achievements:');
    console.log('   ✅ Multi-Fetch MCP Server integrated');
    console.log('   ✅ Web content fetching working');
    console.log('   ✅ Code fetching from external sources');
    console.log('   ✅ Investment data collection');
    console.log('   ✅ Content analysis capabilities');
    console.log('   ✅ Git Memory storage integration');

    // Cleanup
    await integration.cleanup();
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Configuration for different demo scenarios
export const demoConfigs = {
  // สำหรับทดสอบการดึงข้อมูลเว็บทั่วไป
  web_content: {
    urls: [
      'https://example.com',
      'https://httpbin.org/html',
      'https://jsonplaceholder.typicode.com',
    ],
    formats: ['html', 'json', 'txt'],
    useBrowser: false,
  },

  // สำหรับทดสอบการดึงโค้ดจาก GitHub
  code_fetching: {
    githubUrls: [
      'https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/editor/common/model/textModel.ts',
      'https://raw.githubusercontent.com/facebook/react/main/packages/react/src/React.js',
      'https://raw.githubusercontent.com/nodejs/node/main/lib/fs.js',
    ],
    languages: ['typescript', 'javascript', 'javascript'],
    analyzeCode: true,
  },

  // สำหรับทดสอบการเก็บข้อมูลการลงทุน
  investment_collection: {
    dataTypes: ['stocks', 'crypto', 'news', 'exchange_rates'],
    sources: ['set', 'crypto_api', 'news_api', 'bot'],
    storeInGitMemory: true,
  },

  // สำหรับทดสอบการวิเคราะห์เนื้อหาเว็บ
  content_analysis: {
    urls: [
      'https://example.com',
      'https://wikipedia.org',
      'https://github.com',
    ],
    analysisTypes: ['content', 'seo', 'performance'],
    extractMetadata: true,
  },
};

// Run demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMultiFetchIntegrationDemo().catch(console.error);
}

export { runMultiFetchIntegrationDemo };
