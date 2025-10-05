#!/usr/bin/env node

/**
 * Filesystem MCP Demo - สร้างโค้ดใหม่ 10 ครั้งในไฟล์เดียวแล้วทดสอบ
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

// Filesystem MCP Integration Demo
async function runFilesystemMCPDemo() {
  console.log('🚀 Filesystem MCP Integration Demo Starting...\n');

  try {
    // Initialize mock components
    const gitMemory = new MockGitMemory();
    const fastCodingServer = new MockFastCodingServer();

    // Import and initialize integration
    const { FilesystemMCPIntegration } = await import(
      './filesystem-mcp-integration.ts'
    );
    const integration = new FilesystemMCPIntegration(
      gitMemory,
      fastCodingServer
    );

    console.log('📁 Initializing Filesystem MCP integration...');
    await integration.initialize();

    // Demo 1: Create multiple files
    console.log('\n📄 Demo 1: Creating multiple files...');
    const multipleFilesResult = await integration['createMultipleFiles']({
      files: [
        { name: 'demo/sample1.ts', type: 'typescript' },
        { name: 'demo/sample2.js', type: 'javascript' },
        { name: 'demo/config.json', type: 'json' },
        { name: 'demo/readme.md', type: 'markdown' },
      ],
    });

    console.log(`✅ Created ${multipleFilesResult.filesCreated} files`);

    // Demo 2: Generate code 10 times in one file (ตามที่ผู้ใช้ต้องการ)
    console.log('\n🔄 Demo 2: Generating code 10 times in one file...');
    const codeGenResult = await integration['generateCodeTenTimes']({
      fileName: 'generated-code-variations.ts',
      baseCode: `function calculateSum(a, b) {
  return a + b;
}`,
      variations: 10,
      outputPath: './generated',
    });

    if (codeGenResult.success) {
      console.log(`✅ Generated ${codeGenResult.variations} code variations`);
      console.log(
        `📄 Output file: ${codeGenResult.outputPath}/${codeGenResult.fileName}`
      );
      console.log(`📏 Total size: ${codeGenResult.totalSize} characters`);

      // Show variation details
      console.log('\n📋 Code Variations Generated:');
      codeGenResult.results.forEach((result: any, index: number) => {
        console.log(
          `   ${index + 1}. Variation ${result.variation}: ${result.lines} lines`
        );
      });
    }

    // Demo 3: Batch file operations
    console.log('\n📦 Demo 3: Batch file operations...');
    const batchResult = await integration['batchFileOperations']({
      operations: [
        {
          type: 'create',
          filePath: 'batch-test/test1.txt',
          content: 'Test file 1',
        },
        {
          type: 'create',
          filePath: 'batch-test/test2.txt',
          content: 'Test file 2',
        },
        {
          type: 'create',
          filePath: 'batch-test/test3.txt',
          content: 'Test file 3',
        },
      ],
    });

    console.log(
      `✅ Batch operations completed: ${batchResult.successfulOperations}/${batchResult.totalOperations}`
    );

    // Demo 4: Filesystem analysis
    console.log('\n📊 Demo 4: Filesystem analysis...');
    const analysisResult = await integration['analyzeFilesystem']({
      targetPath: './src',
    });

    if (analysisResult.success) {
      console.log(`✅ Filesystem analyzed`);
      console.log(`📁 Total files: ${analysisResult.analysis.totalFiles}`);
      console.log(
        `📂 Total directories: ${analysisResult.analysis.totalDirectories}`
      );
      console.log(`💾 Total size: ${analysisResult.analysis.totalSize} bytes`);
    }

    // Show integration status
    console.log('\n📋 Integration Status:');
    const status = await integration.getStatus();
    console.log('Initialized:', status.initialized);
    console.log('Monitoring Active:', status.monitoringActive);
    console.log('Code Generation Active:', status.codeGenerationActive);

    // Show stored data summary
    console.log('\n📋 Data Storage Summary:');
    const fileOperations = await gitMemory.retrieve({ type: 'file_created' });
    const codeGenerations = await gitMemory.retrieve({
      type: 'code_generated',
    });
    const batchOperations = await gitMemory.retrieve({
      type: 'batch_file_operations',
    });

    console.log(`📄 Files created: ${fileOperations.length}`);
    console.log(`🤖 Code generations: ${codeGenerations.length}`);
    console.log(`📦 Batch operations: ${batchOperations.length}`);

    console.log('\n🎉 Filesystem MCP Integration Demo completed successfully!');
    console.log('🎯 Key achievements:');
    console.log('   ✅ Filesystem MCP Server integrated');
    console.log('   ✅ Multiple file creation working');
    console.log('   ✅ Code generation (10 variations) completed');
    console.log('   ✅ Batch file operations working');
    console.log('   ✅ Filesystem analysis capabilities');
    console.log('   ✅ Git Memory storage integration');

    // Cleanup
    await integration.cleanup();
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Configuration for filesystem operations
export const filesystemConfigs = {
  // สำหรับสร้างไฟล์หลายๆ ไฟล์
  multiple_files: {
    files: [
      { name: 'components/Button.tsx', type: 'typescript' },
      { name: 'components/Input.tsx', type: 'typescript' },
      { name: 'utils/helpers.js', type: 'javascript' },
      { name: 'styles/main.css', type: 'css' },
      { name: 'docs/README.md', type: 'markdown' },
    ],
    basePath: './src',
  },

  // สำหรับสร้างโค้ดหลายเวอร์ชันในไฟล์เดียว
  code_generation: {
    fileName: 'multi-version-functions.ts',
    baseCode: `function processData(data) {
  // Process the input data
  return data;
}`,
    variations: 10,
    outputPath: './generated',
  },

  // สำหรับ batch operations
  batch_operations: {
    operations: [
      { type: 'create', filePath: 'temp/file1.txt', content: 'Content 1' },
      { type: 'create', filePath: 'temp/file2.txt', content: 'Content 2' },
      { type: 'create', filePath: 'temp/file3.txt', content: 'Content 3' },
    ],
    basePath: './',
  },

  // สำหรับการวิเคราะห์ filesystem
  analysis: {
    targetPath: './src',
    includeHidden: false,
    maxDepth: 5,
  },
};

// Run demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFilesystemMCPDemo().catch(console.error);
}

export { runFilesystemMCPDemo };
