/**
 * Automated Performance Regression Testing Suite
 * ระบบทดสอบ regression อัตโนมัติสำหรับตรวจสอบประสิทธิภาพ
 */

import { ComprehensivePerformanceTestingSuite, PerformanceTestConfig, PerformanceTestResult } from './comprehensive-performance-testing.js';
import { MCPIntegrationTestingSuite, IntegrationTestConfig, IntegrationTestResult } from './mcp-integration-testing.js';
import * as fs from 'fs';
import * as path from 'path';

export interface RegressionTestConfig {
  // Baseline Configuration
  baselinePath: string;
  enableBaselineComparison: boolean;
  baselineTolerance: number; // percentage

  // Regression Detection
  regressionThresholds: {
    responseTimeIncrease: number; // percentage
    throughputDecrease: number; // percentage
    errorRateIncrease: number; // percentage
    memoryUsageIncrease: number; // percentage
  };

  // Test Automation
  autoRunOnChanges: boolean;
  scheduleInterval: number; // milliseconds
  enableNotifications: boolean;
  notificationChannels: string[];

  // Reporting
  reportPath: string;
  enableHistoricalTracking: boolean;
  retentionDays: number;
}

export interface RegressionTestResult {
  timestamp: string;
  baselineMetrics: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    memoryUsage: number;
  };
  currentMetrics: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    memoryUsage: number;
  };
  regressions: {
    responseTime: boolean;
    throughput: boolean;
    errorRate: boolean;
    memoryUsage: boolean;
  };
  improvements: {
    responseTime: boolean;
    throughput: boolean;
    errorRate: boolean;
    memoryUsage: boolean;
  };
  overallStatus: 'improved' | 'regressed' | 'stable';
  details: string[];
}

export class AutomatedPerformanceRegressionTestingSuite {
  private config: RegressionTestConfig;
  private performanceTester: ComprehensivePerformanceTestingSuite;
  private integrationTester: MCPIntegrationTestingSuite;
  private baselineData: any = null;
  private historicalResults: RegressionTestResult[] = [];
  private isRunning: boolean = false;

  constructor(config: RegressionTestConfig) {
    this.config = config;

    // Initialize testing suites
    const perfConfig: PerformanceTestConfig = {
      duration: 30,
      concurrency: 10,
      requests: 1000,
      target: { url: 'http://localhost:4523/api/health' },
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

    const integrationConfig: IntegrationTestConfig = {
      enableGitMemory: true,
      enableDatabase: true,
      enableCache: true,
      enableWebScraper: false,
      testDuration: 30000,
      concurrency: 5
    };

    this.performanceTester = new ComprehensivePerformanceTestingSuite(perfConfig);
    this.integrationTester = new MCPIntegrationTestingSuite(integrationConfig);

    // Load baseline data
    this.loadBaseline();
  }

  /**
   * Load baseline performance data
   */
  private loadBaseline(): void {
    try {
      if (fs.existsSync(this.config.baselinePath)) {
        const baselineData = fs.readFileSync(this.config.baselinePath, 'utf-8');
        this.baselineData = JSON.parse(baselineData);
        console.log('📊 โหลด baseline data สำเร็จ');
      } else {
        console.log('⚠️ ไม่พบ baseline data - จะสร้าง baseline ใหม่จากการทดสอบแรก');
      }
    } catch (error) {
      console.error('❌ ไม่สามารถโหลด baseline data:', error);
    }
  }

  /**
   * Save current results as baseline
   */
  async saveAsBaseline(): Promise<void> {
    try {
      // Run comprehensive tests to get current baseline
      const perfResults = await this.performanceTester.runAllTests();
      const integrationResults = await this.integrationTester.runAllIntegrationTests();

      const baseline = {
        performance: perfResults,
        integration: integrationResults,
        createdAt: new Date().toISOString(),
        version: '1.0.0'
      };

      // Create baseline directory if not exists
      const baselineDir = path.dirname(this.config.baselinePath);
      if (!fs.existsSync(baselineDir)) {
        fs.mkdirSync(baselineDir, { recursive: true });
      }

      fs.writeFileSync(this.config.baselinePath, JSON.stringify(baseline, null, 2));
      this.baselineData = baseline;

      console.log('💾 บันทึก baseline data สำเร็จ');

    } catch (error) {
      console.error('❌ ไม่สามารถบันทึก baseline:', error);
      throw error;
    }
  }

  /**
   * Run regression analysis
   */
  async runRegressionAnalysis(): Promise<RegressionTestResult> {
    console.log('🔍 กำลังวิเคราะห์ performance regression...');

    if (!this.baselineData) {
      console.log('📊 ไม่มี baseline data - รันการทดสอบเพื่อสร้าง baseline ก่อน');
      await this.saveAsBaseline();
      return this.createNoBaselineResult();
    }

    // Run current performance tests
    const currentPerfResults = await this.performanceTester.runAllTests();
    const currentIntegrationResults = await this.integrationTester.runAllIntegrationTests();

    // Extract metrics for comparison
    const baselineMetrics = this.extractBaselineMetrics();
    const currentMetrics = this.extractCurrentMetrics(currentPerfResults, currentIntegrationResults);

    // Analyze for regressions and improvements
    const analysis = this.analyzePerformanceChanges(baselineMetrics, currentMetrics);

    // Store historical result
    this.historicalResults.push(analysis);

    // Keep only recent results
    if (this.historicalResults.length > 100) {
      this.historicalResults = this.historicalResults.slice(-50);
    }

    // Save historical data
    if (this.config.enableHistoricalTracking) {
      this.saveHistoricalResults();
    }

    return analysis;
  }

  /**
   * Extract baseline metrics for comparison
   */
  private extractBaselineMetrics(): any {
    if (!this.baselineData) return {};

    // Extract key metrics from baseline performance tests
    const perfTests = this.baselineData.performance || [];
    const integrationTests = this.baselineData.integration || [];

    return {
      responseTime: this.calculateAverageMetric(perfTests, 'averageResponseTime'),
      throughput: this.calculateAverageMetric(perfTests, 'throughput'),
      errorRate: this.calculateAverageMetric(perfTests, 'errorRate'),
      memoryUsage: this.calculateAverageMetric(perfTests, 'memoryUsage.heapUsed')
    };
  }

  /**
   * Extract current metrics for comparison
   */
  private extractCurrentMetrics(perfResults: PerformanceTestResult[], integrationResults: IntegrationTestResult[]): any {
    return {
      responseTime: this.calculateAverageMetric(perfResults, 'averageResponseTime'),
      throughput: this.calculateAverageMetric(perfResults, 'throughput'),
      errorRate: this.calculateAverageMetric(perfResults, 'errorRate'),
      memoryUsage: this.calculateAverageMetric(perfResults, 'memoryUsage.heapUsed')
    };
  }

  /**
   * Calculate average metric from test results
   */
  private calculateAverageMetric(results: any[], metric: string): number {
    if (results.length === 0) return 0;

    const values = results
      .map(result => this.getNestedValue(result, metric))
      .filter(value => typeof value === 'number');

    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Analyze performance changes for regression detection
   */
  private analyzePerformanceChanges(baseline: any, current: any): RegressionTestResult {
    const regressions = {
      responseTime: false,
      throughput: false,
      errorRate: false,
      memoryUsage: false
    };

    const improvements = {
      responseTime: false,
      throughput: false,
      errorRate: false,
      memoryUsage: false
    };

    const details: string[] = [];

    // Analyze response time
    if (baseline.responseTime > 0) {
      const responseTimeChange = ((current.responseTime - baseline.responseTime) / baseline.responseTime) * 100;
      regressions.responseTime = responseTimeChange > this.config.regressionThresholds.responseTimeIncrease;
      improvements.responseTime = responseTimeChange < -this.config.regressionThresholds.responseTimeIncrease;

      if (regressions.responseTime) {
        details.push(`Response time เพิ่มขึ้น ${responseTimeChange.toFixed(1)}% (จาก ${baseline.responseTime.toFixed(2)}ms เป็น ${current.responseTime.toFixed(2)}ms)`);
      } else if (improvements.responseTime) {
        details.push(`Response time ลดลง ${Math.abs(responseTimeChange).toFixed(1)}% (ปรับปรุงแล้ว!)`);
      }
    }

    // Analyze throughput
    if (baseline.throughput > 0) {
      const throughputChange = ((current.throughput - baseline.throughput) / baseline.throughput) * 100;
      regressions.throughput = throughputChange < -this.config.regressionThresholds.throughputDecrease;
      improvements.throughput = throughputChange > this.config.regressionThresholds.throughputDecrease;

      if (regressions.throughput) {
        details.push(`Throughput ลดลง ${Math.abs(throughputChange).toFixed(1)}% (จาก ${baseline.throughput.toFixed(2)} req/s เป็น ${current.throughput.toFixed(2)} req/s)`);
      } else if (improvements.throughput) {
        details.push(`Throughput เพิ่มขึ้น ${throughputChange.toFixed(1)}% (ปรับปรุงแล้ว!)`);
      }
    }

    // Analyze error rate
    if (baseline.errorRate >= 0) {
      const errorRateChange = current.errorRate - baseline.errorRate;
      regressions.errorRate = errorRateChange > this.config.regressionThresholds.errorRateIncrease;
      improvements.errorRate = errorRateChange < -this.config.regressionThresholds.errorRateIncrease;

      if (regressions.errorRate) {
        details.push(`Error rate เพิ่มขึ้น ${errorRateChange.toFixed(1)}% (จาก ${baseline.errorRate.toFixed(2)}% เป็น ${current.errorRate.toFixed(2)}%)`);
      } else if (improvements.errorRate) {
        details.push(`Error rate ลดลง ${Math.abs(errorRateChange).toFixed(1)}% (ปรับปรุงแล้ว!)`);
      }
    }

    // Analyze memory usage
    if (baseline.memoryUsage > 0) {
      const memoryChange = ((current.memoryUsage - baseline.memoryUsage) / baseline.memoryUsage) * 100;
      regressions.memoryUsage = memoryChange > this.config.regressionThresholds.memoryUsageIncrease;
      improvements.memoryUsage = memoryChange < -this.config.regressionThresholds.memoryUsageIncrease;

      if (regressions.memoryUsage) {
        details.push(`Memory usage เพิ่มขึ้น ${memoryChange.toFixed(1)}% (จาก ${(baseline.memoryUsage / 1024 / 1024).toFixed(2)}MB เป็น ${(current.memoryUsage / 1024 / 1024).toFixed(2)}MB)`);
      } else if (improvements.memoryUsage) {
        details.push(`Memory usage ลดลง ${Math.abs(memoryChange).toFixed(1)}% (ปรับปรุงแล้ว!)`);
      }
    }

    // Determine overall status
    const regressionCount = Object.values(regressions).filter(Boolean).length;
    const improvementCount = Object.values(improvements).filter(Boolean).length;

    let overallStatus: 'improved' | 'regressed' | 'stable';
    if (regressionCount > improvementCount) {
      overallStatus = 'regressed';
    } else if (improvementCount > regressionCount) {
      overallStatus = 'improved';
    } else {
      overallStatus = 'stable';
    }

    return {
      timestamp: new Date().toISOString(),
      baselineMetrics: baseline,
      currentMetrics: current,
      regressions,
      improvements,
      overallStatus,
      details
    };
  }

  /**
   * Create result when no baseline exists
   */
  private createNoBaselineResult(): RegressionTestResult {
    return {
      timestamp: new Date().toISOString(),
      baselineMetrics: { responseTime: 0, throughput: 0, errorRate: 0, memoryUsage: 0 },
      currentMetrics: { responseTime: 0, throughput: 0, errorRate: 0, memoryUsage: 0 },
      regressions: { responseTime: false, throughput: false, errorRate: false, memoryUsage: false },
      improvements: { responseTime: false, throughput: false, errorRate: false, memoryUsage: false },
      overallStatus: 'stable',
      details: ['ไม่มี baseline data สำหรับการเปรียบเทียบ - สร้าง baseline ใหม่แล้ว']
    };
  }

  /**
   * Start automated regression monitoring
   */
  startAutomatedMonitoring(): void {
    if (this.isRunning) {
      console.warn('⚠️ Automated regression monitoring กำลังทำงานอยู่แล้ว');
      return;
    }

    console.log(`⏰ เริ่ม automated regression monitoring (ทุก ${this.config.scheduleInterval / 1000} วินาที)...`);

    this.isRunning = true;

    const interval = setInterval(async () => {
      try {
        const analysis = await this.runRegressionAnalysis();

        if (analysis.overallStatus === 'regressed') {
          console.warn('🚨 DETECTED PERFORMANCE REGRESSION!');
          console.warn('Details:', analysis.details);

          if (this.config.enableNotifications) {
            await this.sendRegressionAlert(analysis);
          }
        } else if (analysis.overallStatus === 'improved') {
          console.log('✅ DETECTED PERFORMANCE IMPROVEMENT!');
          console.log('Details:', analysis.details);
        }

      } catch (error) {
        console.error('❌ Regression analysis failed:', error);
      }
    }, this.config.scheduleInterval);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('🔄 หยุด automated regression monitoring...');
      clearInterval(interval);
      this.isRunning = false;
    });
  }

  /**
   * Stop automated monitoring
   */
  stopAutomatedMonitoring(): void {
    this.isRunning = false;
    console.log('🛑 หยุด automated regression monitoring แล้ว');
  }

  /**
   * Send regression alert to configured channels
   */
  private async sendRegressionAlert(analysis: RegressionTestResult): Promise<void> {
    const alertMessage = `
🚨 PERFORMANCE REGRESSION DETECTED

Status: ${analysis.overallStatus.toUpperCase()}
Timestamp: ${analysis.timestamp}

Regressions Found:
${analysis.regressions.responseTime ? '• Response Time เพิ่มขึ้น\n' : ''}
${analysis.regressions.throughput ? '• Throughput ลดลง\n' : ''}
${analysis.regressions.errorRate ? '• Error Rate เพิ่มขึ้น\n' : ''}
${analysis.regressions.memoryUsage ? '• Memory Usage เพิ่มขึ้น\n' : ''}

Details:
${analysis.details.join('\n')}

Baseline vs Current:
• Response Time: ${analysis.baselineMetrics.responseTime.toFixed(2)}ms → ${analysis.currentMetrics.responseTime.toFixed(2)}ms
• Throughput: ${analysis.baselineMetrics.throughput.toFixed(2)} req/s → ${analysis.currentMetrics.throughput.toFixed(2)} req/s
• Error Rate: ${analysis.baselineMetrics.errorRate.toFixed(2)}% → ${analysis.currentMetrics.errorRate.toFixed(2)}%
• Memory Usage: ${(analysis.baselineMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB → ${(analysis.currentMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB

กรุณาตรวจสอบและแก้ไขปัญหาโดยด่วน!
    `.trim();

    console.warn('🚨 REGRESSION ALERT:', alertMessage);

    // TODO: Send to configured notification channels (email, Slack, etc.)
  }

  /**
   * Save historical results
   */
  private saveHistoricalResults(): void {
    try {
      const historyPath = path.join(path.dirname(this.config.reportPath), 'regression-history.json');
      fs.writeFileSync(historyPath, JSON.stringify(this.historicalResults, null, 2));
    } catch (error) {
      console.error('❌ ไม่สามารถบันทึก historical results:', error);
    }
  }

  /**
   * Generate regression report
   */
  async generateRegressionReport(): Promise<string> {
    const report = {
      config: this.config,
      currentBaseline: this.baselineData,
      latestAnalysis: this.historicalResults[this.historicalResults.length - 1],
      historicalTrend: this.analyzeHistoricalTrend(),
      recommendations: this.generateRegressionRecommendations(),
      generatedAt: new Date().toISOString()
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Analyze historical trend
   */
  private analyzeHistoricalTrend(): any {
    if (this.historicalResults.length < 2) {
      return { trend: 'insufficient_data', direction: 'stable' };
    }

    const recentResults = this.historicalResults.slice(-10); // Last 10 results
    const regressionCount = recentResults.filter(r => r.overallStatus === 'regressed').length;
    const improvementCount = recentResults.filter(r => r.overallStatus === 'improved').length;

    let trend: string;
    let direction: string;

    if (regressionCount > improvementCount + 2) {
      trend = 'degrading';
      direction = 'negative';
    } else if (improvementCount > regressionCount + 2) {
      trend = 'improving';
      direction = 'positive';
    } else {
      trend = 'stable';
      direction = 'neutral';
    }

    return {
      trend,
      direction,
      regressionCount,
      improvementCount,
      stableCount: recentResults.length - regressionCount - improvementCount,
      analysisPeriod: recentResults.length
    };
  }

  /**
   * Generate regression recommendations
   */
  private generateRegressionRecommendations(): string[] {
    const recommendations: string[] = [];
    const latestAnalysis = this.historicalResults[this.historicalResults.length - 1];

    if (!latestAnalysis) {
      recommendations.push('ไม่มีข้อมูลสำหรับการวิเคราะห์ - รันการทดสอบเพื่อสร้าง baseline');
      return recommendations;
    }

    if (latestAnalysis.regressions.responseTime) {
      recommendations.push('🔧 แนะนำตรวจสอบ database queries และ caching strategy สำหรับ response time ที่เพิ่มขึ้น');
    }

    if (latestAnalysis.regressions.throughput) {
      recommendations.push('⚡ แนะนำเพิ่ม workers หรือปรับปรุง async processing สำหรับ throughput ที่ลดลง');
    }

    if (latestAnalysis.regressions.errorRate) {
      recommendations.push('🐛 แนะนำตรวจสอบ error handling และเพิ่ม retry mechanisms สำหรับ error rate ที่เพิ่มขึ้น');
    }

    if (latestAnalysis.regressions.memoryUsage) {
      recommendations.push('💾 แนะนำตรวจสอบ memory leaks และปรับปรุง garbage collection สำหรับ memory usage ที่เพิ่มขึ้น');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ ประสิทธิภาพอยู่ในเกณฑ์ที่ดี - ไม่มี regression ที่ตรวจพบ');
    }

    return recommendations;
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    isRunning: boolean;
    baselineExists: boolean;
    historicalResults: number;
    latestAnalysis?: RegressionTestResult;
  } {
    return {
      isRunning: this.isRunning,
      baselineExists: this.baselineData !== null,
      historicalResults: this.historicalResults.length,
      latestAnalysis: this.historicalResults[this.historicalResults.length - 1]
    };
  }
}

/**
 * Create automated performance regression testing suite
 */
export function createAutomatedPerformanceRegressionTestingSuite(config?: Partial<RegressionTestConfig>): AutomatedPerformanceRegressionTestingSuite {
  const defaultConfig: RegressionTestConfig = {
    baselinePath: './data/performance-baseline.json',
    enableBaselineComparison: true,
    baselineTolerance: 5, // 5% tolerance
    regressionThresholds: {
      responseTimeIncrease: 10, // 10% increase
      throughputDecrease: 10, // 10% decrease
      errorRateIncrease: 5, // 5% increase
      memoryUsageIncrease: 15 // 15% increase
    },
    autoRunOnChanges: false,
    scheduleInterval: 300000, // 5 minutes
    enableNotifications: false,
    notificationChannels: [],
    reportPath: './data/regression-report.json',
    enableHistoricalTracking: true,
    retentionDays: 30
  };

  return new AutomatedPerformanceRegressionTestingSuite({ ...defaultConfig, ...config });
}
