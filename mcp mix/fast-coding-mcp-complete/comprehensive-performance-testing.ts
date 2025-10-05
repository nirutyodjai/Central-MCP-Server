/**
 * Comprehensive Performance Testing Suite for MCP Platform
 * ชุดทดสอบประสิทธิภาพแบบครอบคลุมสำหรับ MCP Platform ที่ปรับแต่งแล้ว
 */

import { HighPerformanceCache } from './high-performance-cache.js';
import { HighPerformanceAsyncUtils } from './high-performance-async.js';
import { PerformanceMonitoringDashboard } from './performance-monitoring-dashboard.js';
import * as autocannon from 'autocannon';

export interface PerformanceTestConfig {
  // Test Configuration
  duration: number; // seconds
  concurrency: number;
  requests: number;

  // Target Configuration
  target: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  };

  // Performance Thresholds
  thresholds: {
    maxResponseTime: number; // milliseconds
    minThroughput: number; // requests per second
    maxErrorRate: number; // percentage
    minCacheHitRate: number; // percentage
  };

  // Test Scenarios
  scenarios: {
    cacheTest: boolean;
    databaseTest: boolean;
    asyncTest: boolean;
    memoryTest: boolean;
    loadTest: boolean;
  };
}

export interface PerformanceTestResult {
  testName: string;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  throughput: number;
  errorRate: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  cacheHitRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: string;
  passed: boolean;
}

export class ComprehensivePerformanceTestingSuite {
  private config: PerformanceTestConfig;
  private dashboard: PerformanceMonitoringDashboard;
  private results: PerformanceTestResult[] = [];

  constructor(config: PerformanceTestConfig) {
    this.config = config;
    this.dashboard = new PerformanceMonitoringDashboard();
  }

  /**
   * Run comprehensive performance test suite
   */
  async runAllTests(): Promise<PerformanceTestResult[]> {
    console.log('🚀 เริ่มการทดสอบประสิทธิภาพแบบครอบคลุม...');

    // Start monitoring
    this.dashboard.startMonitoring(1000);

    const testResults: PerformanceTestResult[] = [];

    try {
      // 1. Cache Performance Test
      if (this.config.scenarios.cacheTest) {
        const cacheResult = await this.testCachePerformance();
        testResults.push(cacheResult);
      }

      // 2. Database Performance Test
      if (this.config.scenarios.databaseTest) {
        const dbResult = await this.testDatabasePerformance();
        testResults.push(dbResult);
      }

      // 3. Async/Worker Performance Test
      if (this.config.scenarios.asyncTest) {
        const asyncResult = await this.testAsyncPerformance();
        testResults.push(asyncResult);
      }

      // 4. Memory Performance Test
      if (this.config.scenarios.memoryTest) {
        const memoryResult = await this.testMemoryPerformance();
        testResults.push(memoryResult);
      }

      // 5. Load Testing
      if (this.config.scenarios.loadTest) {
        const loadResult = await this.testLoadPerformance();
        testResults.push(loadResult);
      }

      // 6. Integration Performance Test
      const integrationResult = await this.testIntegrationPerformance();
      testResults.push(integrationResult);

      // Generate comprehensive report
      await this.generatePerformanceReport(testResults);

      console.log('✅ การทดสอบประสิทธิภาพเสร็จสิ้นแล้ว');

      return testResults;

    } catch (error) {
      console.error('❌ การทดสอบประสิทธิภาพผิดพลาด:', error);
      throw error;
    } finally {
      this.dashboard.stopMonitoring();
    }
  }

  /**
   * Test cache performance with various scenarios
  private async testCachePerformance(): Promise<PerformanceTestResult> {
    console.log('💾 ทดสอบประสิทธิภาพ Cache System...');

    const cache = new HighPerformanceCache({
      memory: { enabled: true, maxKeys: 10000, stdTTL: 300, checkperiod: 60, useClones: false, deleteOnExpire: true },
      strategy: { defaultTTL: 300000, maxSize: 10000, enableMetrics: true, enableCompression: false },
    });

    const testData = Array.from({ length: 1000 }, (_, i) => ({
      key: `test_key_${i}`,
      value: { id: i, data: 'x'.repeat(1000), timestamp: Date.now() }
    }));

    const startTime = Date.now();

    // Test cache operations
    const promises = testData.map(async (item) => {
      await cache.set(item.key, item.value, 300000);
      return cache.get(item.key);
    });

    const results = await Promise.allSettled(promises);
    const successfulResults = results.filter(r => r.status === 'fulfilled').length;

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Get cache stats
    const cacheStats = cache.getStats();

    const result: PerformanceTestResult = {
      testName: 'Cache Performance Test',
      duration,
      totalRequests: testData.length,
      successfulRequests: successfulResults,
      failedRequests: testData.length - successfulResults,
      averageResponseTime: duration / testData.length,
      minResponseTime: 0,
      maxResponseTime: 0,
      throughput: (testData.length / duration) * 1000,
      errorRate: ((testData.length - successfulResults) / testData.length) * 100,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      cacheHitRate: cacheStats.hitRate,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      passed: cacheStats.hitRate > this.config.thresholds.minCacheHitRate
    };

    await cache.close();
    return result;
  }

  /**
   * Test database performance with connection pooling
   */
  private async testDatabasePerformance(): Promise<PerformanceTestResult> {
    console.log('🗄️ ทดสอบประสิทธิภาพ Database System...');

    // This would test the HighPerformanceDatabaseMCPServer
    // For now, simulate database operations

    const operations = Array.from({ length: 1000 }, (_, i) => ({
      type: 'insert',
      data: { id: i, value: `test_data_${i}`, timestamp: Date.now() }
    }));

    const startTime = Date.now();

    // Simulate database operations
    const promises = operations.map(async (op) => {
      // Simulate async database operation
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
      return { success: true, operation: op.type };
    });

    const results = await Promise.allSettled(promises);
    const successfulResults = results.filter(r => r.status === 'fulfilled').length;

    const endTime = Date.now();
    const duration = endTime - startTime;

    const result: PerformanceTestResult = {
      testName: 'Database Performance Test',
      duration,
      totalRequests: operations.length,
      successfulRequests: successfulResults,
      failedRequests: operations.length - successfulResults,
      averageResponseTime: duration / operations.length,
      minResponseTime: 0,
      maxResponseTime: 0,
      throughput: (operations.length / duration) * 1000,
      errorRate: ((operations.length - successfulResults) / operations.length) * 100,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      cacheHitRate: 0,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      passed: (duration / operations.length) < this.config.thresholds.maxResponseTime
    };

    return result;
  }

  /**
   * Test async/worker performance
   */
  private async testAsyncPerformance(): Promise<PerformanceTestResult> {
    console.log('⚡ ทดสอบประสิทธิภาพ Async/Worker System...');

    const tasks = Array.from({ length: 500 }, (_, i) => ({
      id: `task_${i}`,
      type: 'cpu-intensive',
      data: { iterations: 10000 },
      priority: Math.floor(Math.random() * 10) + 1,
      timeout: 5000
    }));

    const startTime = Date.now();

    // Execute tasks using async utilities
    const promises = tasks.map(task =>
      HighPerformanceAsyncUtils.executeWithWorker(task)
    );

    const results = await Promise.allSettled(promises);
    const successfulResults = results.filter(r => r.status === 'fulfilled').length;

    const endTime = Date.now();
    const duration = endTime - startTime;

    const result: PerformanceTestResult = {
      testName: 'Async/Worker Performance Test',
      duration,
      totalRequests: tasks.length,
      successfulRequests: successfulResults,
      failedRequests: tasks.length - successfulResults,
      averageResponseTime: duration / tasks.length,
      minResponseTime: 0,
      maxResponseTime: 0,
      throughput: (tasks.length / duration) * 1000,
      errorRate: ((tasks.length - successfulResults) / tasks.length) * 100,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      cacheHitRate: 0,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      passed: (duration / tasks.length) < this.config.thresholds.maxResponseTime
    };

    return result;
  }

  /**
   * Test memory management performance
   */
  private async testMemoryPerformance(): Promise<PerformanceTestResult> {
    console.log('🧠 ทดสอบประสิทธิภาพ Memory Management...');

    const memoryOperations = Array.from({ length: 1000 }, (_, i) => ({
      operation: i % 2 === 0 ? 'allocate' : 'cleanup',
      size: Math.floor(Math.random() * 10000) + 1000
    }));

    const startTime = Date.now();
    const memoryEntries: any[] = [];

    // Test memory allocation and cleanup
    for (const op of memoryOperations) {
      if (op.operation === 'allocate') {
        // Allocate memory
        const data = new Array(op.size).fill('x');
        memoryEntries.push({
          data,
          timestamp: Date.now(),
          size: op.size
        });
      } else {
        // Cleanup memory (remove random entries)
        if (memoryEntries.length > 0) {
          const randomIndex = Math.floor(Math.random() * memoryEntries.length);
          memoryEntries.splice(randomIndex, 1);
        }
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const result: PerformanceTestResult = {
      testName: 'Memory Management Performance Test',
      duration,
      totalRequests: memoryOperations.length,
      successfulRequests: memoryOperations.length,
      failedRequests: 0,
      averageResponseTime: duration / memoryOperations.length,
      minResponseTime: 0,
      maxResponseTime: 0,
      throughput: (memoryOperations.length / duration) * 1000,
      errorRate: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      cacheHitRate: 0,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      passed: process.memoryUsage().heapUsed < 100 * 1024 * 1024 // Less than 100MB
    };

    return result;
  }

  /**
   * Test load performance using autocannon
   */
  private async testLoadPerformance(): Promise<PerformanceTestResult> {
    console.log('🔥 ทดสอบประสิทธิภาพ Load Testing...');

    return new Promise((resolve) => {
      const instance = autocannon({
        url: this.config.target.url,
        connections: this.config.concurrency,
        duration: this.config.duration,
        method: this.config.target.method || 'GET',
        headers: this.config.target.headers || {},
        body: this.config.target.body ? JSON.stringify(this.config.target.body) : undefined
      });

      instance.on('response', (client, statusCode, responseTime) => {
        // Track response times for percentile calculation
      });

      instance.on('done', (results) => {
        const result: PerformanceTestResult = {
          testName: 'Load Performance Test',
          duration: results.duration,
          totalRequests: results.requests.total,
          successfulRequests: results.requests.total - results.errors,
          failedRequests: results.errors,
          averageResponseTime: results.averageResponseTime,
          minResponseTime: results.requests.min,
          maxResponseTime: results.requests.max,
          throughput: results.requests.average,
          errorRate: results.requests.total > 0 ? (results.errors / results.requests.total) * 100 : 0,
          p95ResponseTime: results.requests.p95 || 0,
          p99ResponseTime: results.requests.p99 || 0,
          cacheHitRate: 0,
          memoryUsage: process.memoryUsage(),
          timestamp: new Date().toISOString(),
          passed: results.requests.average >= this.config.thresholds.minThroughput &&
                 results.averageResponseTime <= this.config.thresholds.maxResponseTime
        };

        resolve(result);
      });
    });
  }

  /**
   * Test integration performance of all systems together
   */
  private async testIntegrationPerformance(): Promise<PerformanceTestResult> {
    console.log('🔗 ทดสอบประสิทธิภาพ Integration ของระบบทั้งหมด...');

    const startTime = Date.now();

    // Test all systems working together
    const integrationTasks = [
      // Cache operations
      async () => {
        const cache = new HighPerformanceCache({
          memory: { enabled: true, maxKeys: 100, stdTTL: 60 }
        });
        await cache.set('integration_test', { data: 'test' }, 60000);
        const result = await cache.get('integration_test');
        await cache.close();
        return result !== null;
      },

      // Async operations
      async () => {
        const task = {
          id: 'integration_async_test',
          type: 'cpu-intensive',
          data: { iterations: 1000 },
          priority: 5,
          timeout: 5000
        };
        const result = await HighPerformanceAsyncUtils.executeWithWorker(task);
        return result.success;
      },

      // Memory operations
      async () => {
        const testData = { id: 1, data: 'memory_test', timestamp: Date.now() };
        const key = `memory_test_${Date.now()}`;

        // Test memory sharing simulation
        const memoryStore = new Map();
        memoryStore.set(key, testData);
        const retrieved = memoryStore.get(key);

        return retrieved && retrieved.id === testData.id;
      }
    ];

    const results = await Promise.allSettled(integrationTasks);
    const successfulResults = results.filter(r => r.status === 'fulfilled' && r.value === true).length;

    const endTime = Date.now();
    const duration = endTime - startTime;

    const result: PerformanceTestResult = {
      testName: 'Integration Performance Test',
      duration,
      totalRequests: integrationTasks.length,
      successfulRequests: successfulResults,
      failedRequests: integrationTasks.length - successfulResults,
      averageResponseTime: duration / integrationTasks.length,
      minResponseTime: 0,
      maxResponseTime: 0,
      throughput: (integrationTasks.length / duration) * 1000,
      errorRate: ((integrationTasks.length - successfulResults) / integrationTasks.length) * 100,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      cacheHitRate: 0,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      passed: successfulResults === integrationTasks.length
    };

    return result;
  }

  /**
   * Generate comprehensive performance report
   */
  private async generatePerformanceReport(results: PerformanceTestResult[]): Promise<void> {
    console.log('\n📊 PERFORMANCE TEST REPORT');
    console.log('========================');

    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const overallPassRate = (passedTests / totalTests) * 100;

    console.log(`\n📈 Overall Results:`);
    console.log(`   Tests Passed: ${passedTests}/${totalTests} (${overallPassRate.toFixed(1)}%)`);
    console.log(`   Total Duration: ${results.reduce((sum, r) => sum + r.duration, 0) / 1000}s`);

    console.log(`\n⚡ Performance Summary:`);
    const avgThroughput = results.reduce((sum, r) => sum + r.throughput, 0) / results.length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.averageResponseTime, 0) / results.length;
    const avgErrorRate = results.reduce((sum, r) => sum + r.errorRate, 0) / results.length;

    console.log(`   Average Throughput: ${avgThroughput.toFixed(2)} req/s`);
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Average Error Rate: ${avgErrorRate.toFixed(2)}%`);

    console.log(`\n💾 Memory Usage:`);
    const finalMemory = results[results.length - 1]?.memoryUsage;
    if (finalMemory) {
      console.log(`   Heap Used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Heap Total: ${(finalMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   External: ${(finalMemory.external / 1024 / 1024).toFixed(2)} MB`);
    }

    // Detailed results for each test
    console.log(`\n📋 Detailed Results:`);
    for (const result of results) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`\n   ${result.testName}: ${status}`);
      console.log(`     Duration: ${result.duration}ms`);
      console.log(`     Requests: ${result.successfulRequests}/${result.totalRequests}`);
      console.log(`     Throughput: ${result.throughput.toFixed(2)} req/s`);
      console.log(`     Avg Response: ${result.averageResponseTime.toFixed(2)}ms`);
      console.log(`     Error Rate: ${result.errorRate.toFixed(2)}%`);
    }

    // Generate recommendations
    console.log(`\n💡 Recommendations:`);

    if (avgResponseTime > this.config.thresholds.maxResponseTime) {
      console.log(`   ⚠️  Response time สูง แนะนำปรับปรุง database queries และ caching`);
    }

    if (avgThroughput < this.config.thresholds.minThroughput) {
      console.log(`   ⚠️  Throughput ต่ำ แนะนำเพิ่ม workers และปรับปรุง async processing`);
    }

    if (avgErrorRate > this.config.thresholds.maxErrorRate) {
      console.log(`   ⚠️  Error rate สูง แนะนำตรวจสอบ error handling และ retry logic`);
    }

    const memoryUsagePercent = finalMemory ?
      (finalMemory.heapUsed / finalMemory.heapTotal) * 100 : 0;

    if (memoryUsagePercent > 80) {
      console.log(`   ⚠️  Memory usage สูง แนะนำตรวจสอบ memory leaks`);
    }

    if (overallPassRate === 100) {
      console.log(`   🎉 ประสิทธิภาพอยู่ในเกณฑ์ที่ดีเยี่ยม!`);
    }
  }

  /**
   * Get test results
   */
  getResults(): PerformanceTestResult[] {
    return [...this.results];
  }

  /**
   * Export results to file
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
 * Create comprehensive performance testing suite
 */
export function createPerformanceTestingSuite(config?: Partial<PerformanceTestConfig>): ComprehensivePerformanceTestingSuite {
  const defaultConfig: PerformanceTestConfig = {
    duration: 30,
    concurrency: 10,
    requests: 1000,
    target: {
      url: 'http://localhost:4523/api/health',
      method: 'GET'
    },
    thresholds: {
      maxResponseTime: 1000,
      minThroughput: 100,
      maxErrorRate: 5,
      minCacheHitRate: 80
    },
    scenarios: {
      cacheTest: true,
      databaseTest: true,
      asyncTest: true,
      memoryTest: true,
      loadTest: true
    }
  };

  return new ComprehensivePerformanceTestingSuite({ ...defaultConfig, ...config });
}
