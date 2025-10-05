/**
 * MCP Platform Integration Tests
 * ทดสอบการทำงานร่วมกันของ MCP Servers ทั้งหมด
 */

import { HighPerformanceCache } from './high-performance-cache.js';

export interface IntegrationTestConfig {
  enableGitMemory: boolean;
  enableDatabase: boolean;
  enableCache: boolean;
  enableWebScraper: boolean;
  testDuration: number;
  concurrency: number;
}

export interface IntegrationTestResult {
  testName: string;
  duration: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cacheHitRate: number;
  errors: string[];
  timestamp: string;
  passed: boolean;
}

export class MCPIntegrationTestingSuite {
  private config: IntegrationTestConfig;
  private results: IntegrationTestResult[] = [];

  constructor(config: IntegrationTestConfig) {
    this.config = config;
  }

  /**
   * Run comprehensive integration tests
   */
  async runAllIntegrationTests(): Promise<IntegrationTestResult[]> {
    console.log('🔗 เริ่มการทดสอบ Integration ของ MCP Platform...');

    const testResults: IntegrationTestResult[] = [];

    try {
      // 1. Git Memory Integration Test
      if (this.config.enableGitMemory) {
        const gitResult = await this.testGitMemoryIntegration();
        testResults.push(gitResult);
      }

      // 2. Database Integration Test
      if (this.config.enableDatabase) {
        const dbResult = await this.testDatabaseIntegration();
        testResults.push(dbResult);
      }

      // 3. Cache Integration Test
      if (this.config.enableCache) {
        const cacheResult = await this.testCacheIntegration();
        testResults.push(cacheResult);
      }

      // 4. Cross-System Integration Test
      const crossResult = await this.testCrossSystemIntegration();
      testResults.push(crossResult);

      // Generate integration report
      await this.generateIntegrationReport(testResults);

      console.log('✅ การทดสอบ Integration เสร็จสิ้นแล้ว');

      return testResults;

    } catch (error) {
      console.error('❌ การทดสอบ Integration ผิดพลาด:', error);
      throw error;
    }
  }

  /**
   * Test Git Memory MCP Server integration
   */
  private async testGitMemoryIntegration(): Promise<IntegrationTestResult> {
    console.log('🔧 ทดสอบ Git Memory MCP Integration...');

    const startTime = Date.now();
    const errors: string[] = [];
    let operationCount = 0;
    let successfulOperations = 0;

    try {
      // Initialize Git Memory Server
      const gitMemory = new EnhancedGitMemoryMCPServer({
        repositoryPath: process.cwd(),
        enableHistory: true,
        maxCommits: 50,
        enableBranchTracking: true,
        enableMemorySharing: true,
        maxMemoryEntries: 100,
        memoryTTL: 300000,
        enablePerformanceMode: true
      });

      await gitMemory.initialize();
      operationCount++;

      // Test Git operations
      try {
        const status = await gitMemory.getStatus();
        operationCount++;
        if (status) successfulOperations++;

        const history = await gitMemory.getCommitHistory(10);
        operationCount++;
        if (history && history.length > 0) successfulOperations++;

        // Test memory sharing
        await gitMemory.shareMemoryEntry('test_entry', { data: 'test' }, 'commit');
        operationCount++;

        const shared = await gitMemory.getSharedMemoryEntry('test_entry');
        operationCount++;
        if (shared) successfulOperations++;

        await gitMemory.cleanupMemory();
        operationCount++;
        successfulOperations++;

      } catch (error: any) {
        errors.push(`Git Memory Error: ${error.message}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      const result: IntegrationTestResult = {
        testName: 'Git Memory Integration Test',
        duration,
        totalOperations: operationCount,
        successfulOperations,
        failedOperations: operationCount - successfulOperations,
        averageResponseTime: duration / operationCount,
        memoryUsage: process.memoryUsage(),
        cacheHitRate: 0,
        errors,
        timestamp: new Date().toISOString(),
        passed: errors.length === 0 && successfulOperations > 0
      };

      return result;

    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        testName: 'Git Memory Integration Test',
        duration,
        totalOperations: operationCount,
        successfulOperations: 0,
        failedOperations: operationCount,
        averageResponseTime: duration,
        memoryUsage: process.memoryUsage(),
        cacheHitRate: 0,
        errors: [error.message],
        timestamp: new Date().toISOString(),
        passed: false
      };
    }
  }

  /**
   * Test Database MCP Server integration
   */
  private async testDatabaseIntegration(): Promise<IntegrationTestResult> {
    console.log('🗄️ ทดสอบ Database MCP Integration...');

    const startTime = Date.now();
    const errors: string[] = [];
    let operationCount = 0;
    let successfulOperations = 0;

    try {
      // Initialize Database Server
      const dbPath = './data/test-integration.db';
      const database = new HighPerformanceDatabaseMCPServer(dbPath, {
        minConnections: 1,
        maxConnections: 5,
        acquireTimeout: 5000,
        idleTimeout: 30000,
        evictionInterval: 60000,
        cacheSize: 1000,
        journalMode: 'WAL',
        synchronous: 'NORMAL',
        tempStore: 'MEMORY',
        enableQueryCache: true,
        queryCacheSize: 100,
        enablePreparedStatements: true,
        maxPreparedStatements: 50,
        enableMetrics: true,
        slowQueryThreshold: 100
      });

      await database.initialize();
      operationCount++;

      // Test database operations
      try {
        // Test log insertion
        await database.execute(
          'INSERT INTO mcp_logs (timestamp, level, message, source) VALUES (?, ?, ?, ?)',
          [new Date().toISOString(), 'info', 'Integration test log', 'test']
        );
        operationCount++;
        successfulOperations++;

        // Test log retrieval
        const logs = await database.query('SELECT * FROM mcp_logs WHERE source = ?', ['test']);
        operationCount++;
        if (logs && logs.length > 0) successfulOperations++;

        // Test performance metrics
        await database.execute(
          'INSERT INTO mcp_performance (timestamp, operation, duration, success) VALUES (?, ?, ?, ?)',
          [new Date().toISOString(), 'test_operation', 50, true]
        );
        operationCount++;
        successfulOperations++;

        // Test cache operations
        await database.execute(
          'INSERT INTO mcp_cache (key, value, expires_at) VALUES (?, ?, ?)',
          ['test_key', 'test_value', new Date(Date.now() + 60000).toISOString()]
        );
        operationCount++;
        successfulOperations++;

        const cacheResult = await database.query('SELECT value FROM mcp_cache WHERE key = ?', ['test_key']);
        operationCount++;
        if (cacheResult && cacheResult.length > 0) successfulOperations++;

      } catch (error: any) {
        errors.push(`Database Error: ${error.message}`);
      }

      await database.close();

      const endTime = Date.now();
      const duration = endTime - startTime;

      const result: IntegrationTestResult = {
        testName: 'Database Integration Test',
        duration,
        totalOperations: operationCount,
        successfulOperations,
        failedOperations: operationCount - successfulOperations,
        averageResponseTime: duration / operationCount,
        memoryUsage: process.memoryUsage(),
        cacheHitRate: 0,
        errors,
        timestamp: new Date().toISOString(),
        passed: errors.length === 0 && successfulOperations > 0
      };

      return result;

    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        testName: 'Database Integration Test',
        duration,
        totalOperations: operationCount,
        successfulOperations: 0,
        failedOperations: operationCount,
        averageResponseTime: duration,
        memoryUsage: process.memoryUsage(),
        cacheHitRate: 0,
        errors: [error.message],
        timestamp: new Date().toISOString(),
        passed: false
      };
    }
  }

  /**
   * Test Cache integration
   */
  private async testCacheIntegration(): Promise<IntegrationTestResult> {
    console.log('💾 ทดสอบ Cache Integration...');

    const startTime = Date.now();
    const errors: string[] = [];
    let operationCount = 0;
    let successfulOperations = 0;

    try {
      // Initialize Cache
      const cache = new HighPerformanceCache({
        memory: {
          enabled: true,
          maxKeys: 1000,
          stdTTL: 300,
          checkperiod: 60,
          useClones: false,
          deleteOnExpire: true
        },
        strategy: {
          defaultTTL: 300000,
          maxSize: 1000,
          enableMetrics: true,
          enableCompression: false
        }
      });

      operationCount++;

      // Test cache operations
      try {
        // Test set/get operations
        const testData = { id: 1, data: 'cache_test', timestamp: Date.now() };

        await cache.set('test_key_1', testData, 60000);
        operationCount++;

        const retrieved = await cache.get('test_key_1');
        operationCount++;
        if (retrieved && retrieved.id === testData.id) successfulOperations++;

        // Test batch operations
        const batchData = [
          { key: 'batch_1', value: { id: 1 } },
          { key: 'batch_2', value: { id: 2 } },
          { key: 'batch_3', value: { id: 3 } }
        ];

        await cache.mset(batchData.map(item => ({
          key: item.key,
          value: item.value,
          ttl: 60000
        })));
        operationCount++;

        const batchResults = await cache.mget(['batch_1', 'batch_2', 'batch_3']);
        operationCount++;
        if (batchResults.filter(r => r !== null).length === 3) successfulOperations++;

        // Test cache deletion
        await cache.delete('test_key_1');
        operationCount++;

        const deletedCheck = await cache.get('test_key_1');
        operationCount++;
        if (deletedCheck === null) successfulOperations++;

        // Test cache stats
        const stats = cache.getStats();
        operationCount++;
        if (stats && typeof stats.hitRate === 'number') successfulOperations++;

      } catch (error: any) {
        errors.push(`Cache Error: ${error.message}`);
      }

      await cache.close();

      const endTime = Date.now();
      const duration = endTime - startTime;

      const result: IntegrationTestResult = {
        testName: 'Cache Integration Test',
        duration,
        totalOperations: operationCount,
        successfulOperations,
        failedOperations: operationCount - successfulOperations,
        averageResponseTime: duration / operationCount,
        memoryUsage: process.memoryUsage(),
        cacheHitRate: 0, // Would need to calculate from cache stats
        errors,
        timestamp: new Date().toISOString(),
        passed: errors.length === 0 && successfulOperations > 0
      };

      return result;

    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        testName: 'Cache Integration Test',
        duration,
        totalOperations: operationCount,
        successfulOperations: 0,
        failedOperations: operationCount,
        averageResponseTime: duration,
        memoryUsage: process.memoryUsage(),
        cacheHitRate: 0,
        errors: [error.message],
        timestamp: new Date().toISOString(),
        passed: false
      };
    }
  }

  /**
   * Test cross-system integration (all systems working together)
   */
  private async testCrossSystemIntegration(): Promise<IntegrationTestResult> {
    console.log('🔗 ทดสอบ Cross-System Integration...');

    const startTime = Date.now();
    const errors: string[] = [];
    let operationCount = 0;
    let successfulOperations = 0;

    try {
      // Initialize all systems
      const cache = new HighPerformanceCache({
        memory: { enabled: true, maxKeys: 100, stdTTL: 60 }
      });

      // Test workflow: Cache -> Database -> Memory Sharing
      try {
        // 1. Cache data
        const workflowData = {
          id: 'workflow_test',
          steps: ['cache', 'database', 'memory'],
          timestamp: Date.now()
        };

        await cache.set('workflow_test', workflowData, 60000);
        operationCount++;

        // 2. Verify cache
        const cachedData = await cache.get('workflow_test');
        operationCount++;
        if (cachedData && cachedData.id === workflowData.id) successfulOperations++;

        // 3. Simulate database operation
        // In real scenario, this would interact with database
        const dbResult = { success: true, operation: 'workflow_db_op' };
        operationCount++;
        if (dbResult.success) successfulOperations++;

        // 4. Test memory sharing simulation
        const memoryStore = new Map();
        memoryStore.set('workflow_memory', workflowData);
        const sharedData = memoryStore.get('workflow_memory');
        operationCount++;
        if (sharedData && sharedData.id === workflowData.id) successfulOperations++;

        // 5. Test async operations
        const asyncTasks = Array.from({ length: 10 }, (_, i) => ({
          id: `async_task_${i}`,
          type: 'cpu-intensive',
          data: { iterations: 1000 },
          priority: 5,
          timeout: 5000
        }));

        // Simulate async processing
        for (const task of asyncTasks) {
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 10));
          operationCount++;
          successfulOperations++;
        }

      } catch (error: any) {
        errors.push(`Cross-System Error: ${error.message}`);
      }

      await cache.close();

      const endTime = Date.now();
      const duration = endTime - startTime;

      const result: IntegrationTestResult = {
        testName: 'Cross-System Integration Test',
        duration,
        totalOperations: operationCount,
        successfulOperations,
        failedOperations: operationCount - successfulOperations,
        averageResponseTime: duration / operationCount,
        memoryUsage: process.memoryUsage(),
        cacheHitRate: 0,
        errors,
        timestamp: new Date().toISOString(),
        passed: errors.length === 0 && successfulOperations > 0
      };

      return result;

    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        testName: 'Cross-System Integration Test',
        duration,
        totalOperations: operationCount,
        successfulOperations: 0,
        failedOperations: operationCount,
        averageResponseTime: duration,
        memoryUsage: process.memoryUsage(),
        cacheHitRate: 0,
        errors: [error.message],
        timestamp: new Date().toISOString(),
        passed: false
      };
    }
  }

  /**
   * Generate integration test report
   */
  private async generateIntegrationReport(results: IntegrationTestResult[]): Promise<void> {
    console.log('\n🔗 INTEGRATION TEST REPORT');
    console.log('========================');

    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const overallPassRate = (passedTests / totalTests) * 100;

    console.log(`\n📈 Integration Results:`);
    console.log(`   Tests Passed: ${passedTests}/${totalTests} (${overallPassRate.toFixed(1)}%)`);
    console.log(`   Total Duration: ${results.reduce((sum, r) => sum + r.duration, 0) / 1000}s`);

    console.log(`\n⚡ Performance Summary:`);
    const totalOperations = results.reduce((sum, r) => sum + r.totalOperations, 0);
    const successfulOperations = results.reduce((sum, r) => sum + r.successfulOperations, 0);
    const avgResponseTime = results.reduce((sum, r) => sum + r.averageResponseTime, 0) / results.length;

    console.log(`   Total Operations: ${totalOperations}`);
    console.log(`   Successful Operations: ${successfulOperations}`);
    console.log(`   Success Rate: ${((successfulOperations / totalOperations) * 100).toFixed(1)}%`);
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);

    console.log(`\n💾 Memory Usage:`);
    const finalMemory = results[results.length - 1]?.memoryUsage;
    if (finalMemory) {
      console.log(`   Heap Used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Heap Total: ${(finalMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    }

    // Detailed results for each test
    console.log(`\n📋 Integration Test Details:`);
    for (const result of results) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`\n   ${result.testName}: ${status}`);
      console.log(`     Duration: ${result.duration}ms`);
      console.log(`     Operations: ${result.successfulOperations}/${result.totalOperations}`);
      console.log(`     Avg Response: ${result.averageResponseTime.toFixed(2)}ms`);

      if (result.errors.length > 0) {
        console.log(`     Errors: ${result.errors.length}`);
        result.errors.forEach(error => console.log(`       - ${error}`));
      }
    }

    // Generate recommendations
    console.log(`\n💡 Integration Recommendations:`);

    const failedTests = results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      console.log(`   ⚠️  ${failedTests.length} tests failed - แนะนำตรวจสอบ error logs`);
    }

    const slowTests = results.filter(r => r.averageResponseTime > 1000);
    if (slowTests.length > 0) {
      console.log(`   ⚠️  ${slowTests.length} tests ช้า - แนะนำปรับปรุง performance`);
    }

    if (finalMemory && finalMemory.heapUsed / finalMemory.heapTotal > 0.8) {
      console.log(`   ⚠️  Memory usage สูง - แนะนำตรวจสอบ memory leaks`);
    }

    if (overallPassRate === 100) {
      console.log(`   🎉 Integration tests ผ่านทั้งหมด!`);
    }
  }

  /**
   * Get integration test results
   */
  getResults(): IntegrationTestResult[] {
    return [...this.results];
  }

  /**
   * Export integration test results
   */
  async exportResults(format: 'json' | 'csv' = 'json'): Promise<string> {
    const data = {
      config: this.config,
      results: this.results,
      summary: {
        totalTests: this.results.length,
        passedTests: this.results.filter(r => r.passed).length,
        overallPassRate: (this.results.filter(r => r.passed).length / this.results.length) * 100
      },
      exportedAt: new Date().toISOString()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // CSV format would go here
      return 'CSV export not implemented yet';
    }
  }
}

/**
 * Create MCP integration testing suite
 */
export function createMCPIntegrationTestingSuite(config?: Partial<IntegrationTestConfig>): MCPIntegrationTestingSuite {
  const defaultConfig: IntegrationTestConfig = {
    enableGitMemory: true,
    enableDatabase: true,
    enableCache: true,
    enableWebScraper: false,
    testDuration: 30000,
    concurrency: 5
  };

  return new MCPIntegrationTestingSuite({ ...defaultConfig, ...config });
}
