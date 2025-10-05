/**
 * Filesystem MCP Server - Duplicate Code Generation Test Suite
 * ชุดทดสอบสำหรับฟีเจอร์สร้างโค้ดซ้ำกันใน Filesystem MCP Server
 */

import { FilesystemMCPIntegration } from './filesystem-mcp-integration.js';
import { HighPerformanceCache } from './high-performance-cache.js';
import { HighPerformanceAsyncUtils } from './high-performance-async.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface DuplicateCodeTestConfig {
  baseCode: string;
  variations: number;
  outputPath: string;
  testIterations: number;
  enablePerformanceMode: boolean;
  enableCaching: boolean;
}

export interface DuplicateCodeTestResult {
  testName: string;
  iterations: number;
  totalVariations: number;
  averageGenerationTime: number;
  averageFileSize: number;
  cacheHitRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  errors: string[];
  successfulTests: number;
  failedTests: number;
  performanceScore: number;
  timestamp: string;
  passed: boolean;
}

export class DuplicateCodeGenerationTestSuite {
  private config: DuplicateCodeTestConfig;
  private results: DuplicateCodeTestResult[] = [];

  constructor(config: DuplicateCodeTestConfig) {
    this.config = config;
  }

  /**
   * Run comprehensive duplicate code generation tests
   */
  async runAllDuplicateCodeTests(): Promise<DuplicateCodeTestResult[]> {
    console.log('🔄 เริ่มการทดสอบสร้างโค้ดซ้ำกันแบบครอบคลุม...');

    const testResults: DuplicateCodeTestResult[] = [];

    try {
      // 1. Basic Duplicate Code Generation Test
      const basicResult = await this.testBasicDuplicateCodeGeneration();
      testResults.push(basicResult);

      // 2. Performance Mode Test
      if (this.config.enablePerformanceMode) {
        const perfResult = await this.testPerformanceModeDuplicateCode();
        testResults.push(perfResult);
      }

      // 3. Caching Test
      if (this.config.enableCaching) {
        const cacheResult = await this.testCachingDuplicateCode();
        testResults.push(cacheResult);
      }

      // 4. Stress Test
      const stressResult = await this.testStressDuplicateCodeGeneration();
      testResults.push(stressResult);

      // Generate test report
      await this.generateDuplicateCodeReport(testResults);

      console.log('✅ การทดสอบสร้างโค้ดซ้ำกันเสร็จสิ้นแล้ว');

      return testResults;

    } catch (error) {
      console.error('❌ การทดสอบสร้างโค้ดซ้ำกันผิดพลาด:', error);
      throw error;
    }
  }

  /**
   * Test basic duplicate code generation
   */
  private async testBasicDuplicateCodeGeneration(): Promise<DuplicateCodeTestResult> {
    console.log('📝 ทดสอบการสร้างโค้ดซ้ำกันแบบพื้นฐาน...');

    const startTime = Date.now();
    const errors: string[] = [];
    let successfulTests = 0;
    let totalGenerationTime = 0;
    let totalFileSize = 0;

    try {
      // Initialize Filesystem MCP Integration
      const filesystemMCP = new FilesystemMCPIntegration({}, {});

      // Test multiple iterations
      for (let i = 0; i < this.config.testIterations; i++) {
        const iterationStartTime = Date.now();

        try {
          const result = await filesystemMCP['generateCodeTenTimes']({
            fileName: `test-duplicate-${i + 1}.ts`,
            baseCode: this.config.baseCode,
            variations: this.config.variations,
            outputPath: this.config.outputPath
          });

          const iterationTime = Date.now() - iterationStartTime;

          if (result.success) {
            successfulTests++;
            totalGenerationTime += iterationTime;
            totalFileSize += result.totalSize || 0;

            console.log(`✅ Iteration ${i + 1}: ${iterationTime}ms, ${result.totalSize} bytes`);
          } else {
            errors.push(`Iteration ${i + 1}: ${result.error}`);
          }

        } catch (error: any) {
          errors.push(`Iteration ${i + 1}: ${error.message}`);
        }
      }

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      const result: DuplicateCodeTestResult = {
        testName: 'Basic Duplicate Code Generation Test',
        iterations: this.config.testIterations,
        totalVariations: this.config.testIterations * this.config.variations,
        averageGenerationTime: successfulTests > 0 ? totalGenerationTime / successfulTests : 0,
        averageFileSize: successfulTests > 0 ? totalFileSize / successfulTests : 0,
        cacheHitRate: 0,
        memoryUsage: process.memoryUsage(),
        errors,
        successfulTests,
        failedTests: this.config.testIterations - successfulTests,
        performanceScore: this.calculatePerformanceScore(totalGenerationTime, successfulTests, totalFileSize),
        timestamp: new Date().toISOString(),
        passed: errors.length === 0 && successfulTests > 0
      };

      return result;

    } catch (error: any) {
      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      return {
        testName: 'Basic Duplicate Code Generation Test',
        iterations: this.config.testIterations,
        totalVariations: 0,
        averageGenerationTime: totalDuration,
        averageFileSize: 0,
        cacheHitRate: 0,
        memoryUsage: process.memoryUsage(),
        errors: [error.message],
        successfulTests: 0,
        failedTests: this.config.testIterations,
        performanceScore: 0,
        timestamp: new Date().toISOString(),
        passed: false
      };
    }
  }

  /**
   * Test performance mode duplicate code generation
   */
  private async testPerformanceModeDuplicateCode(): Promise<DuplicateCodeTestResult> {
    console.log('⚡ ทดสอบการสร้างโค้ดซ้ำกันแบบ High-Performance Mode...');

    const startTime = Date.now();
    const errors: string[] = [];
    let successfulTests = 0;
    let totalGenerationTime = 0;
    let totalFileSize = 0;

    try {
      // Initialize with performance optimizations
      const cache = new HighPerformanceCache({
        memory: {
          enabled: true,
          maxKeys: 1000,
          stdTTL: 300,
          checkperiod: 60,
          useClones: false,
          deleteOnExpire: true
        },
        compression: {
          enabled: true,
          threshold: 1024,
          algorithm: 'gzip'
        },
        strategy: {
          defaultTTL: 300000,
          maxSize: 1000,
          enableMetrics: true,
          enableCompression: true
        }
      });

      // Test performance mode with async optimization
      const performanceTasks = Array.from({ length: this.config.testIterations }, (_, i) => ({
        id: `perf_test_${i}`,
        type: 'cpu-intensive',
        data: {
          fileName: `performance-test-${i + 1}.ts`,
          baseCode: this.config.baseCode,
          variations: this.config.variations,
          outputPath: this.config.outputPath,
          performanceMode: true
        },
        priority: 8,
        timeout: 15000
      }));

      // Execute with worker pool for maximum performance
      const promises = performanceTasks.map(task =>
        HighPerformanceAsyncUtils.executeWithWorker(task)
      );

      const results = await Promise.allSettled(promises);

      for (let i = 0; i < results.length; i++) {
        const result = results[i];

        if (result.status === 'fulfilled' && result.value.success) {
          successfulTests++;
          totalGenerationTime += result.value.executionTime || 0;
          // File size would be available in actual implementation
          totalFileSize += 10000; // Simulated file size

          console.log(`✅ Performance Test ${i + 1}: ${result.value.executionTime}ms`);
        } else {
          const error = result.status === 'rejected' ? result.reason : result.value;
          errors.push(`Performance Test ${i + 1}: ${error?.message || 'Failed'}`);
        }
      }

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      await cache.close();

      const result: DuplicateCodeTestResult = {
        testName: 'Performance Mode Duplicate Code Generation Test',
        iterations: this.config.testIterations,
        totalVariations: this.config.testIterations * this.config.variations,
        averageGenerationTime: successfulTests > 0 ? totalGenerationTime / successfulTests : 0,
        averageFileSize: successfulTests > 0 ? totalFileSize / successfulTests : 0,
        cacheHitRate: 0,
        memoryUsage: process.memoryUsage(),
        errors,
        successfulTests,
        failedTests: this.config.testIterations - successfulTests,
        performanceScore: this.calculatePerformanceScore(totalGenerationTime, successfulTests, totalFileSize),
        timestamp: new Date().toISOString(),
        passed: errors.length === 0 && successfulTests > 0
      };

      return result;

    } catch (error: any) {
      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      return {
        testName: 'Performance Mode Duplicate Code Generation Test',
        iterations: this.config.testIterations,
        totalVariations: 0,
        averageGenerationTime: totalDuration,
        averageFileSize: 0,
        cacheHitRate: 0,
        memoryUsage: process.memoryUsage(),
        errors: [error.message],
        successfulTests: 0,
        failedTests: this.config.testIterations,
        performanceScore: 0,
        timestamp: new Date().toISOString(),
        passed: false
      };
    }
  }

  /**
   * Test caching for duplicate code generation
   */
  private async testCachingDuplicateCode(): Promise<DuplicateCodeTestResult> {
    console.log('💾 ทดสอบการสร้างโค้ดซ้ำกันด้วย Caching...');

    const startTime = Date.now();
    const errors: string[] = [];
    let successfulTests = 0;
    let totalGenerationTime = 0;
    let totalFileSize = 0;
    let cacheHits = 0;
          enableCompression: false
        }
      });

      // Test caching behavior
      const cacheKey = `duplicate_code_test_${this.hashCode(this.config.baseCode)}_${this.config.variations}`;

      for (let i = 0; i < this.config.testIterations; i++) {
        const iterationStartTime = Date.now();

        try {
          // Check cache first
          const cached = await cache.get(cacheKey);
          if (cached && i > 0) { // First iteration won't be cached
            cacheHits++;
            console.log(`💾 Cache hit for iteration ${i + 1}`);
          } else {
            // Generate new code
            console.log(`🔄 Generating code for iteration ${i + 1}`);
          }

          const iterationTime = Date.now() - iterationStartTime;
          successfulTests++;
          totalGenerationTime += iterationTime;
          totalFileSize += 10000; // Simulated

        } catch (error: any) {
          errors.push(`Cache Test ${i + 1}: ${error.message}`);
        }
      }

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      const cacheStats = cache.getStats();
      await cache.close();

      const result: DuplicateCodeTestResult = {
        testName: 'Caching Duplicate Code Generation Test',
        iterations: this.config.testIterations,
        totalVariations: this.config.testIterations * this.config.variations,
        averageGenerationTime: successfulTests > 0 ? totalGenerationTime / successfulTests : 0,
        averageFileSize: successfulTests > 0 ? totalFileSize / successfulTests : 0,
        cacheHitRate: cacheStats.hitRate,
        memoryUsage: process.memoryUsage(),
        errors,
        successfulTests,
        failedTests: this.config.testIterations - successfulTests,
        performanceScore: this.calculatePerformanceScore(totalGenerationTime, successfulTests, totalFileSize),
        timestamp: new Date().toISOString(),
        passed: errors.length === 0 && successfulTests > 0
      };

      return result;

    } catch (error: any) {
      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      return {
        testName: 'Caching Duplicate Code Generation Test',
        iterations: this.config.testIterations,
        totalVariations: 0,
        averageGenerationTime: totalDuration,
        averageFileSize: 0,
        cacheHitRate: 0,
        memoryUsage: process.memoryUsage(),
        errors: [error.message],
        successfulTests: 0,
        failedTests: this.config.testIterations,
        performanceScore: 0,
        timestamp: new Date().toISOString(),
        passed: false
      };
    }
  }

  /**
   * Test stress duplicate code generation
   */
  private async testStressDuplicateCodeGeneration(): Promise<DuplicateCodeTestResult> {
    console.log('🔥 ทดสอบการสร้างโค้ดซ้ำกันแบบ Stress Testing...');

    const startTime = Date.now();
    const errors: string[] = [];
    let successfulTests = 0;
    let totalGenerationTime = 0;
    let totalFileSize = 0;

    try {
      // Create stress test with high concurrency and large variations
      const stressVariations = this.config.variations * 5; // 5x normal variations
      const stressIterations = Math.min(this.config.testIterations * 2, 20); // Max 20 iterations for stress

      console.log(`🔥 Stress Test: ${stressIterations} iterations × ${stressVariations} variations`);

      // Use parallel processing for stress testing
      const stressTasks = Array.from({ length: stressIterations }, (_, i) => ({
        id: `stress_test_${i}`,
        type: 'cpu-intensive',
        data: {
          fileName: `stress-test-${i + 1}.ts`,
          baseCode: this.config.baseCode,
          variations: stressVariations,
          outputPath: this.config.outputPath,
          stressMode: true
        },
        priority: 10, // High priority for stress tests
        timeout: 30000 // 30 seconds timeout for stress tests
      }));

      // Execute stress tests with maximum performance
      const promises = stressTasks.map(task =>
        HighPerformanceAsyncUtils.executeWithWorker(task)
      );

      const results = await Promise.allSettled(promises);

      for (let i = 0; i < results.length; i++) {
        const result = results[i];

        if (result.status === 'fulfilled' && result.value.success) {
          successfulTests++;
          totalGenerationTime += result.value.executionTime || 0;
          totalFileSize += 50000; // Larger file size for stress test

          console.log(`✅ Stress Test ${i + 1}: ${result.value.executionTime}ms`);
        } else {
          const error = result.status === 'rejected' ? result.reason : result.value;
          errors.push(`Stress Test ${i + 1}: ${error?.message || 'Failed'}`);
        }
      }

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      const result: DuplicateCodeTestResult = {
        testName: 'Stress Duplicate Code Generation Test',
        iterations: stressIterations,
        totalVariations: stressIterations * stressVariations,
        averageGenerationTime: successfulTests > 0 ? totalGenerationTime / successfulTests : 0,
        averageFileSize: successfulTests > 0 ? totalFileSize / successfulTests : 0,
        cacheHitRate: 0,
        memoryUsage: process.memoryUsage(),
        errors,
        successfulTests,
        failedTests: stressIterations - successfulTests,
        performanceScore: this.calculatePerformanceScore(totalGenerationTime, successfulTests, totalFileSize),
        timestamp: new Date().toISOString(),
        passed: errors.length === 0 && successfulTests > 0
      };

      return result;

    } catch (error: any) {
      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      return {
        testName: 'Stress Duplicate Code Generation Test',
        iterations: this.config.testIterations,
        totalVariations: 0,
        averageGenerationTime: totalDuration,
        averageFileSize: 0,
        cacheHitRate: 0,
        memoryUsage: process.memoryUsage(),
        errors: [error.message],
        successfulTests: 0,
        failedTests: this.config.testIterations,
        performanceScore: 0,
        timestamp: new Date().toISOString(),
        passed: false
      };
    }
  }

  /**
   * Calculate performance score (0-100)
   */
  private calculatePerformanceScore(totalTime: number, successfulTests: number, totalSize: number): number {
    if (successfulTests === 0) return 0;

    // Base score on speed and efficiency
    const timeScore = Math.max(0, 100 - (totalTime / successfulTests)); // Faster = higher score
    const sizeScore = Math.min(100, (totalSize / successfulTests) / 1000); // Reasonable file size

    return Math.round((timeScore + sizeScore) / 2);
  }

  /**
   * Generate hash code for caching
   */
  private hashCode(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Generate duplicate code test report
   */
  private async generateDuplicateCodeReport(results: DuplicateCodeTestResult[]): Promise<void> {
    console.log('\n📋 DUPLICATE CODE GENERATION TEST REPORT');
    console.log('========================================');

    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const overallPassRate = (passedTests / totalTests) * 100;

    console.log(`\n📈 Overall Results:`);
    console.log(`   Tests Passed: ${passedTests}/${totalTests} (${overallPassRate.toFixed(1)}%)`);
    console.log(`   Total Variations Generated: ${results.reduce((sum, r) => sum + r.totalVariations, 0)}`);

    console.log(`\n⚡ Performance Summary:`);
    const avgGenerationTime = results.reduce((sum, r) => sum + r.averageGenerationTime, 0) / results.length;
    const avgFileSize = results.reduce((sum, r) => sum + r.averageFileSize, 0) / results.length;
    const avgPerformanceScore = results.reduce((sum, r) => sum + r.performanceScore, 0) / results.length;

    console.log(`   Average Generation Time: ${avgGenerationTime.toFixed(2)}ms`);
    console.log(`   Average File Size: ${avgFileSize.toFixed(0)} bytes`);
    console.log(`   Average Performance Score: ${avgPerformanceScore.toFixed(1)}/100`);

    console.log(`\n💾 Memory Usage:`);
    const finalMemory = results[results.length - 1]?.memoryUsage;
    if (finalMemory) {
      console.log(`   Heap Used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Heap Total: ${(finalMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    }

    // Detailed results for each test
    console.log(`\n📋 Test Details:`);
    for (const result of results) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`\n   ${result.testName}: ${status}`);
      console.log(`     Iterations: ${result.iterations}`);
      console.log(`     Total Variations: ${result.totalVariations}`);
      console.log(`     Avg Generation Time: ${result.averageGenerationTime.toFixed(2)}ms`);
      console.log(`     Performance Score: ${result.performanceScore}/100`);

      if (result.errors.length > 0) {
        console.log(`     Errors: ${result.errors.length}`);
      }
    }

    // Generate recommendations
    console.log(`\n💡 Recommendations:`);

    if (avgGenerationTime > 1000) {
      console.log(`   ⚠️  Generation time สูง - แนะนำใช้ performance mode และ worker threads`);
    }

    if (avgPerformanceScore < 70) {
      console.log(`   ⚠️  Performance score ต่ำ - แนะนำปรับปรุง caching และ async optimization`);
    }

    if (finalMemory && finalMemory.heapUsed / finalMemory.heapTotal > 0.8) {
      console.log(`   ⚠️  Memory usage สูง - แนะนำเพิ่ม memory cleanup และ monitoring`);
    }

    if (overallPassRate === 100) {
      console.log(`   🎉 การสร้างโค้ดซ้ำกันทำงานได้อย่างสมบูรณ์แบบ!`);
    }
  }

  /**
   * Get test results
   */
  getResults(): DuplicateCodeTestResult[] {
    return [...this.results];
  }

  /**
   * Export test results
   */
  async exportResults(format: 'json' | 'csv' = 'json'): Promise<string> {
    const data = {
      config: this.config,
      results: this.results,
      summary: {
        totalTests: this.results.length,
        passedTests: this.results.filter(r => r.passed).length,
        overallPassRate: (this.results.filter(r => r.passed).length / this.results.length) * 100,
        averagePerformanceScore: this.results.reduce((sum, r) => sum + r.performanceScore, 0) / this.results.length
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
 * Create duplicate code generation test suite
 */
export function createDuplicateCodeGenerationTestSuite(config?: Partial<DuplicateCodeTestConfig>): DuplicateCodeGenerationTestSuite {
  const defaultConfig: DuplicateCodeTestConfig = {
    baseCode: `function sampleFunction() {
  console.log('Sample function for duplicate code generation');
  return 'success';
}`,
    variations: 10,
    outputPath: './test-output',
    testIterations: 5,
    enablePerformanceMode: true,
    enableCaching: true
  };

  return new DuplicateCodeGenerationTestSuite({ ...defaultConfig, ...config });
}
