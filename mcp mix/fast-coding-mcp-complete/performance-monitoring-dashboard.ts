/**
 * MCP Platform Performance Monitoring Dashboard
 * ระบบตรวจสอบประสิทธิภาพแบบ real-time สำหรับ MCP Platform
 */

import { HighPerformanceCache } from './high-performance-cache.js';
import { HighPerformanceAsyncUtils } from './high-performance-async.js';

export interface PerformanceMetrics {
  timestamp: string;
  system: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: number;
    loadAverage: number[];
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    keys: number;
    memoryUsage: number;
  };
  database: {
    connections: number;
    activeConnections: number;
    queryCount: number;
    averageQueryTime: number;
    slowQueries: number;
  };
  workers: {
    activeWorkers: number;
    queuedTasks: number;
    completedTasks: number;
    failedTasks: number;
    throughput: number;
  };
  mcpServers: {
    total: number;
    active: number;
    errors: number;
    responseTimes: Record<string, number>;
  };
  network: {
    requests: number;
    errors: number;
    averageResponseTime: number;
    bandwidth: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  metric: keyof PerformanceMetrics;
  condition: 'gt' | 'lt' | 'eq' | 'ne';
  threshold: number;
  duration: number; // seconds
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  message: string;
  severity: AlertRule['severity'];
  timestamp: string;
  resolved: boolean;
  metadata?: any;
}

export class PerformanceMonitoringDashboard {
  private metrics: PerformanceMetrics[] = [];
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private cache: HighPerformanceCache;
  private subscribers: Set<(metrics: PerformanceMetrics) => void> = new Set();

  constructor() {
    this.cache = new HighPerformanceCache({
      memory: {
        enabled: true,
        maxKeys: 1000,
        stdTTL: 3600, // 1 hour
        checkperiod: 300,
        useClones: false,
        deleteOnExpire: true
      },
      strategy: {
        defaultTTL: 3600000, // 1 hour
        maxSize: 1000,
        enableMetrics: true,
        enableCompression: false
      }
    });

    this.initializeDefaultAlertRules();
  }

  /**
   * Initialize default alert rules for common issues
   */
  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        metric: 'system',
        condition: 'gt',
        threshold: 0.8, // 80% memory usage
        duration: 60,
        severity: 'high',
        enabled: true
      },
      {
        id: 'low_cache_hit_rate',
        name: 'Low Cache Hit Rate',
        metric: 'cache',
        condition: 'lt',
        threshold: 0.7, // 70% hit rate
        duration: 300,
        severity: 'medium',
        enabled: true
      },
      {
        id: 'slow_database_queries',
        name: 'Slow Database Queries',
        metric: 'database',
        condition: 'gt',
        threshold: 1000, // 1000ms average query time
        duration: 120,
        severity: 'medium',
        enabled: true
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        metric: 'mcpServers',
        condition: 'gt',
        threshold: 0.1, // 10% error rate
        duration: 180,
        severity: 'high',
        enabled: true
      },
      {
        id: 'worker_pool_exhausted',
        name: 'Worker Pool Exhausted',
        metric: 'workers',
        condition: 'gt',
        threshold: 100, // 100 queued tasks
        duration: 60,
        severity: 'critical',
        enabled: true
      }
    ];
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(interval: number = 5000): void {
    if (this.isMonitoring) {
      console.warn('⚠️ Performance monitoring กำลังทำงานอยู่แล้ว');
      return;
    }

    console.log(`📊 เริ่มการตรวจสอบประสิทธิภาพ (ทุก ${interval}ms)...`);

    this.isMonitoring = true;

    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        this.metrics.push(metrics);

        // Keep only recent metrics (last 24 hours)
        const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
        this.metrics = this.metrics.filter(m => new Date(m.timestamp).getTime() > cutoffTime);

        // Check for alerts
        await this.checkAlerts(metrics);

        // Notify subscribers
        this.notifySubscribers(metrics);

      } catch (error) {
        console.error('❌ ไม่สามารถเก็บ metrics:', error);
      }
    }, interval);

    console.log('✅ เริ่มการตรวจสอบประสิทธิภาพแล้ว');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    console.log('🛑 หยุดการตรวจสอบประสิทธิภาพแล้ว');
  }

  /**
   * Collect comprehensive performance metrics
   */
  private async collectMetrics(): Promise<PerformanceMetrics> {
    const timestamp = new Date().toISOString();

    // System metrics
    const system = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      loadAverage: os.loadavg()
    };

    // Cache metrics
    const cacheStats = this.cache.getStats();
    const cache = {
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hitRate: cacheStats.hitRate,
      keys: cacheStats.keys,
      memoryUsage: cacheStats.memoryUsage
    };

    // Database metrics (placeholder - would need actual database connection)
    const database = {
      connections: 0,
      activeConnections: 0,
      queryCount: 0,
      averageQueryTime: 0,
      slowQueries: 0
    };

    // Worker metrics
    const workerMetrics = HighPerformanceAsyncUtils.getMetrics();
    const workers = {
      activeWorkers: workerMetrics?.activeWorkers || 0,
      queuedTasks: workerMetrics?.queuedTasks || 0,
      completedTasks: workerMetrics?.completedTasks || 0,
      failedTasks: workerMetrics?.failedTasks || 0,
      throughput: workerMetrics?.throughput || 0
    };

    // MCP Servers metrics (placeholder)
    const mcpServers = {
      total: 0,
      active: 0,
      errors: 0,
      responseTimes: {}
    };

    // Network metrics (placeholder)
    const network = {
      requests: 0,
      errors: 0,
      averageResponseTime: 0,
      bandwidth: 0
    };

    return {
      timestamp,
      system,
      cache,
      database,
      workers,
      mcpServers,
      network
    };
  }

  /**
   * Check for alerts based on current metrics
   */
  private async checkAlerts(metrics: PerformanceMetrics): Promise<void> {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      try {
        const currentValue = this.getMetricValue(metrics, rule.metric);
        const alertTriggered = this.evaluateCondition(currentValue, rule.condition, rule.threshold);

        if (alertTriggered) {
          await this.triggerAlert(rule, metrics, currentValue);
        }
      } catch (error) {
        console.error(`❌ ไม่สามารถตรวจสอบ alert rule ${rule.id}:`, error);
      }
    }
  }

  /**
   * Get metric value from metrics object
   */
  private getMetricValue(metrics: PerformanceMetrics, metricPath: string): number {
    const parts = metricPath.split('.');
    let value: any = metrics;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return 0;
      }
    }

    // Handle different value types
    if (typeof value === 'number') {
      return value;
    } else if (typeof value === 'object' && value !== null) {
      // For objects, return a calculated value (e.g., memory usage percentage)
      if ('heapUsed' in value && 'heapTotal' in value) {
        return (value.heapUsed / value.heapTotal) * 100;
      }
      return 0;
    }

    return 0;
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'ne': return value !== threshold;
      default: return false;
    }
  }

  /**
   * Trigger alert for rule violation
   */
  private async triggerAlert(rule: AlertRule, metrics: PerformanceMetrics, currentValue: number): Promise<void> {
    const alertId = `${rule.id}_${Date.now()}`;
    const message = `${rule.name}: ${currentValue.toFixed(2)} (threshold: ${rule.threshold})`;

    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      message,
      severity: rule.severity,
      timestamp: new Date().toISOString(),
      resolved: false,
      metadata: {
        currentValue,
        threshold: rule.threshold,
        metric: rule.metric,
        metrics: metrics
      }
    };

    this.alerts.push(alert);

    // Keep only recent alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500);
    }

    console.warn(`🚨 ALERT [${rule.severity.toUpperCase()}]: ${message}`);

    // TODO: Send alert to external systems (email, Slack, etc.)
  }

  /**
   * Subscribe to real-time metrics updates
   */
  subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers of new metrics
   */
  private notifySubscribers(metrics: PerformanceMetrics): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(metrics);
      } catch (error) {
        console.error('❌ Subscriber callback error:', error);
        this.subscribers.delete(subscriber);
      }
    }
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(hours: number = 1): PerformanceMetrics[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics.filter(m => new Date(m.timestamp).getTime() > cutoffTime);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const ruleIndex = this.alertRules.findIndex(rule => rule.id === ruleId);

    if (ruleIndex === -1) {
      return false;
    }

    this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates };
    return true;
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(hours: number = 24): any {
    const history = this.getMetricsHistory(hours);

    if (history.length === 0) {
      return { error: 'ไม่มีข้อมูล metrics' };
    }

    // Calculate averages and trends
    const systemMetrics = history.map(m => m.system);
    const cacheMetrics = history.map(m => m.cache);
    const workerMetrics = history.map(m => m.workers);

    const report = {
      period: `${hours} hours`,
      generatedAt: new Date().toISOString(),
      summary: {
        totalMetrics: history.length,
        averageMemoryUsage: this.calculateAverage(systemMetrics.map(m => m.memoryUsage.heapUsed / m.memoryUsage.heapTotal)),
        averageCacheHitRate: this.calculateAverage(cacheMetrics.map(m => m.hitRate)),
        averageWorkerThroughput: this.calculateAverage(workerMetrics.map(m => m.throughput)),
        totalAlerts: this.alerts.filter(a => !a.resolved).length
      },
      trends: {
        memoryUsage: this.calculateTrend(systemMetrics.map(m => m.memoryUsage.heapUsed / m.memoryUsage.heapTotal)),
        cacheHitRate: this.calculateTrend(cacheMetrics.map(m => m.hitRate)),
        workerThroughput: this.calculateTrend(workerMetrics.map(m => m.throughput))
      },
      alerts: this.getActiveAlerts(),
      recommendations: this.generateRecommendations(history)
    };

    return report;
  }

  /**
   * Calculate average of array of numbers
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate trend (positive = improving, negative = degrading)
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = this.calculateAverage(firstHalf);
    const secondAvg = this.calculateAverage(secondHalf);

    return ((secondAvg - firstAvg) / firstAvg) * 100; // Percentage change
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(history: PerformanceMetrics[]): string[] {
    const recommendations: string[] = [];
    const latest = history[history.length - 1];

    if (latest.cache.hitRate < 0.7) {
      recommendations.push('🔧 พิจารณาเพิ่ม cache TTL หรือปรับ cache strategy');
    }

    if (latest.system.memoryUsage.heapUsed / latest.system.memoryUsage.heapTotal > 0.8) {
      recommendations.push('💾 Memory usage สูง แนะนำเพิ่ม memory หรือตรวจสอบ memory leaks');
    }

    if (latest.workers.queuedTasks > 50) {
      recommendations.push('⚡ Worker queue ยาว แนะนำเพิ่ม workers หรือปรับปรุง task distribution');
    }

    if (latest.database.averageQueryTime > 1000) {
      recommendations.push('🐌 Database queries ช้า แนะนำเพิ่ม indexes หรือปรับปรุง queries');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ ประสิทธิภาพอยู่ในเกณฑ์ที่ดี');
    }

    return recommendations;
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    isMonitoring: boolean;
    metricsCount: number;
    alertsCount: number;
    subscribersCount: number;
    uptime: number;
  } {
    return {
      isMonitoring: this.isMonitoring,
      metricsCount: this.metrics.length,
      alertsCount: this.alerts.length,
      subscribersCount: this.subscribers.size,
      uptime: process.uptime()
    };
  }

  /**
   * Export metrics for external analysis
   */
  async exportMetrics(format: 'json' | 'csv' = 'json'): Promise<string> {
    const data = {
      metrics: this.metrics,
      alerts: this.alerts,
      rules: this.alertRules,
      exportedAt: new Date().toISOString()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // CSV format implementation would go here
      return 'CSV export not implemented yet';
    }
  }

  /**
   * Clear old metrics and alerts
   */
  clearHistory(hoursToKeep: number = 24): void {
    const cutoffTime = Date.now() - (hoursToKeep * 60 * 60 * 1000);

    this.metrics = this.metrics.filter(m => new Date(m.timestamp).getTime() > cutoffTime);
    this.alerts = this.alerts.filter(a => new Date(a.timestamp).getTime() > cutoffTime);

    console.log(`🗑️ ล้างประวัติ metrics และ alerts เสร็จสิ้น (เก็บ ${hoursToKeep} ชั่วโมงล่าสุด)`);
  }
}

/**
 * Create performance monitoring dashboard instance
 */
export function createPerformanceMonitoringDashboard(): PerformanceMonitoringDashboard {
  return new PerformanceMonitoringDashboard();
}
