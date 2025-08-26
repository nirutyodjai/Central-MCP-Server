const EventEmitter = require('events');
const logger = require('./logger');

/**
 * Monitoring and Metrics Collection System
 * Tracks performance, usage, and health metrics for the Central MCP Server
 */
class MonitoringSystem extends EventEmitter {
  constructor() {
    super();
    
    // Metrics storage
    this.metrics = {
      requests: {
        total: 0,
        byEndpoint: new Map(),
        byMethod: new Map(),
        byStatus: new Map(),
        errors: 0,
        avgResponseTime: 0
      },
      servers: {
        registrations: 0,
        unregistrations: 0,
        healthChecks: 0,
        failedHealthChecks: 0
      },
      loadBalancer: {
        requests: 0,
        byStrategy: new Map(),
        connectionReleases: 0
      },
      serviceDiscovery: {
        queries: 0,
        subscriptions: 0,
        unsubscriptions: 0
      },
      system: {
        startTime: Date.now(),
        uptime: 0,
        memoryUsage: {},
        cpuUsage: {}
      }
    };
    
    // Performance tracking
    this.responseTimeHistory = [];
    this.maxHistorySize = 1000;
    
    // Alert thresholds
    this.alertThresholds = {
      responseTime: 5000, // 5 seconds
      errorRate: 0.1, // 10%
      memoryUsage: 0.9, // 90%
      unhealthyServers: 0.5 // 50%
    };
    
    // Alert state tracking
    this.activeAlerts = new Map();
  }

  /**
   * Track HTTP request metrics
   */
  trackRequest(req, res, responseTime) {
    const endpoint = req.route ? req.route.path : req.path;
    const method = req.method;
    const status = res.statusCode;
    
    // Update request metrics
    this.metrics.requests.total++;
    
    // Track by endpoint
    const endpointCount = this.metrics.requests.byEndpoint.get(endpoint) || 0;
    this.metrics.requests.byEndpoint.set(endpoint, endpointCount + 1);
    
    // Track by method
    const methodCount = this.metrics.requests.byMethod.get(method) || 0;
    this.metrics.requests.byMethod.set(method, methodCount + 1);
    
    // Track by status code
    const statusCount = this.metrics.requests.byStatus.get(status) || 0;
    this.metrics.requests.byStatus.set(status, statusCount + 1);
    
    // Track errors
    if (status >= 400) {
      this.metrics.requests.errors++;
    }
    
    // Update response time metrics
    this.updateResponseTimeMetrics(responseTime);
    
    // Check for alerts
    this.checkResponseTimeAlert(responseTime);
    this.checkErrorRateAlert();
    
    // Emit event
    this.emit('requestTracked', {
      endpoint,
      method,
      status,
      responseTime,
      timestamp: Date.now()
    });
  }

  /**
   * Update response time metrics
   */
  updateResponseTimeMetrics(responseTime) {
    // Add to history
    this.responseTimeHistory.push({
      time: responseTime,
      timestamp: Date.now()
    });
    
    // Maintain history size
    if (this.responseTimeHistory.length > this.maxHistorySize) {
      this.responseTimeHistory.shift();
    }
    
    // Calculate average response time
    const totalTime = this.responseTimeHistory.reduce((sum, entry) => sum + entry.time, 0);
    this.metrics.requests.avgResponseTime = totalTime / this.responseTimeHistory.length;
  }

  /**
   * Track server registration
   */
  trackServerRegistration(serverId, serverInfo) {
    this.metrics.servers.registrations++;
    
    logger.info('Server registration tracked', { serverId, serverInfo });
    this.emit('serverRegistered', { serverId, serverInfo, timestamp: Date.now() });
  }

  /**
   * Track server unregistration
   */
  trackServerUnregistration(serverId) {
    this.metrics.servers.unregistrations++;
    
    logger.info('Server unregistration tracked', { serverId });
    this.emit('serverUnregistered', { serverId, timestamp: Date.now() });
  }

  /**
   * Track health check
   */
  trackHealthCheck(serverId, success, responseTime) {
    this.metrics.servers.healthChecks++;
    
    if (!success) {
      this.metrics.servers.failedHealthChecks++;
    }
    
    this.emit('healthCheckTracked', {
      serverId,
      success,
      responseTime,
      timestamp: Date.now()
    });
  }

  /**
   * Track load balancer request
   */
  trackLoadBalancerRequest(capability, strategy, serverId) {
    this.metrics.loadBalancer.requests++;
    
    // Track by strategy
    const strategyCount = this.metrics.loadBalancer.byStrategy.get(strategy) || 0;
    this.metrics.loadBalancer.byStrategy.set(strategy, strategyCount + 1);
    
    this.emit('loadBalancerRequest', {
      capability,
      strategy,
      serverId,
      timestamp: Date.now()
    });
  }

  /**
   * Track connection release
   */
  trackConnectionRelease(serverId) {
    this.metrics.loadBalancer.connectionReleases++;
    
    this.emit('connectionReleased', {
      serverId,
      timestamp: Date.now()
    });
  }

  /**
   * Track service discovery query
   */
  trackServiceDiscoveryQuery(capability, resultCount) {
    this.metrics.serviceDiscovery.queries++;
    
    this.emit('serviceDiscoveryQuery', {
      capability,
      resultCount,
      timestamp: Date.now()
    });
  }

  /**
   * Track service discovery subscription
   */
  trackServiceDiscoverySubscription(clientId, capabilities) {
    this.metrics.serviceDiscovery.subscriptions++;
    
    this.emit('serviceDiscoverySubscription', {
      clientId,
      capabilities,
      timestamp: Date.now()
    });
  }

  /**
   * Track service discovery unsubscription
   */
  trackServiceDiscoveryUnsubscription(clientId) {
    this.metrics.serviceDiscovery.unsubscriptions++;
    
    this.emit('serviceDiscoveryUnsubscription', {
      clientId,
      timestamp: Date.now()
    });
  }

  /**
   * Start system monitoring
   */
  startSystemMonitoring() {
    // Update system metrics every 30 seconds
    this.systemMonitoringInterval = setInterval(() => {
      this.updateSystemMetrics();
    }, 30000);
    
    logger.info('System monitoring started');
  }

  /**
   * Stop system monitoring
   */
  stopSystemMonitoring() {
    if (this.systemMonitoringInterval) {
      clearInterval(this.systemMonitoringInterval);
      this.systemMonitoringInterval = null;
    }
    
    logger.info('System monitoring stopped');
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics() {
    // Update uptime
    this.metrics.system.uptime = Date.now() - this.metrics.system.startTime;
    
    // Update memory usage
    const memUsage = process.memoryUsage();
    this.metrics.system.memoryUsage = {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      heapUsedPercentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
    };
    
    // Update CPU usage
    const cpuUsage = process.cpuUsage();
    this.metrics.system.cpuUsage = {
      user: cpuUsage.user,
      system: cpuUsage.system
    };
    
    // Check memory alert
    this.checkMemoryAlert();
    
    // Emit system metrics update
    this.emit('systemMetricsUpdated', {
      uptime: this.metrics.system.uptime,
      memory: this.metrics.system.memoryUsage,
      cpu: this.metrics.system.cpuUsage,
      timestamp: Date.now()
    });
  }

  /**
   * Check response time alert
   */
  checkResponseTimeAlert(responseTime) {
    const alertKey = 'high_response_time';
    
    if (responseTime > this.alertThresholds.responseTime) {
      if (!this.activeAlerts.has(alertKey)) {
        this.triggerAlert(alertKey, {
          type: 'high_response_time',
          message: `High response time detected: ${responseTime}ms`,
          threshold: this.alertThresholds.responseTime,
          value: responseTime
        });
      }
    } else {
      if (this.activeAlerts.has(alertKey)) {
        this.resolveAlert(alertKey);
      }
    }
  }

  /**
   * Check error rate alert
   */
  checkErrorRateAlert() {
    const alertKey = 'high_error_rate';
    const errorRate = this.metrics.requests.total > 0 ? 
      this.metrics.requests.errors / this.metrics.requests.total : 0;
    
    if (errorRate > this.alertThresholds.errorRate) {
      if (!this.activeAlerts.has(alertKey)) {
        this.triggerAlert(alertKey, {
          type: 'high_error_rate',
          message: `High error rate detected: ${(errorRate * 100).toFixed(2)}%`,
          threshold: this.alertThresholds.errorRate,
          value: errorRate
        });
      }
    } else {
      if (this.activeAlerts.has(alertKey)) {
        this.resolveAlert(alertKey);
      }
    }
  }

  /**
   * Check memory usage alert
   */
  checkMemoryAlert() {
    const alertKey = 'high_memory_usage';
    const memoryUsagePercentage = this.metrics.system.memoryUsage.heapUsedPercentage / 100;
    
    if (memoryUsagePercentage > this.alertThresholds.memoryUsage) {
      if (!this.activeAlerts.has(alertKey)) {
        this.triggerAlert(alertKey, {
          type: 'high_memory_usage',
          message: `High memory usage detected: ${(memoryUsagePercentage * 100).toFixed(2)}%`,
          threshold: this.alertThresholds.memoryUsage,
          value: memoryUsagePercentage
        });
      }
    } else {
      if (this.activeAlerts.has(alertKey)) {
        this.resolveAlert(alertKey);
      }
    }
  }

  /**
   * Check unhealthy servers alert
   */
  checkUnhealthyServersAlert(totalServers, unhealthyServers) {
    const alertKey = 'high_unhealthy_servers';
    const unhealthyRate = totalServers > 0 ? unhealthyServers / totalServers : 0;
    
    if (unhealthyRate > this.alertThresholds.unhealthyServers) {
      if (!this.activeAlerts.has(alertKey)) {
        this.triggerAlert(alertKey, {
          type: 'high_unhealthy_servers',
          message: `High number of unhealthy servers: ${unhealthyServers}/${totalServers} (${(unhealthyRate * 100).toFixed(2)}%)`,
          threshold: this.alertThresholds.unhealthyServers,
          value: unhealthyRate
        });
      }
    } else {
      if (this.activeAlerts.has(alertKey)) {
        this.resolveAlert(alertKey);
      }
    }
  }

  /**
   * Trigger an alert
   */
  triggerAlert(alertKey, alertData) {
    const alert = {
      ...alertData,
      key: alertKey,
      triggeredAt: Date.now(),
      status: 'active'
    };
    
    this.activeAlerts.set(alertKey, alert);
    
    logger.warn('Alert triggered', alert);
    this.emit('alertTriggered', alert);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertKey) {
    const alert = this.activeAlerts.get(alertKey);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = Date.now();
      
      this.activeAlerts.delete(alertKey);
      
      logger.info('Alert resolved', alert);
      this.emit('alertResolved', alert);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      alerts: {
        active: Array.from(this.activeAlerts.values()),
        thresholds: this.alertThresholds
      },
      responseTimeHistory: this.responseTimeHistory.slice(-100) // Last 100 entries
    };
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    const errorRate = this.metrics.requests.total > 0 ? 
      (this.metrics.requests.errors / this.metrics.requests.total) * 100 : 0;
    
    return {
      requests: {
        total: this.metrics.requests.total,
        errors: this.metrics.requests.errors,
        errorRate: `${errorRate.toFixed(2)}%`,
        avgResponseTime: `${this.metrics.requests.avgResponseTime.toFixed(2)}ms`
      },
      servers: {
        registrations: this.metrics.servers.registrations,
        unregistrations: this.metrics.servers.unregistrations,
        healthChecks: this.metrics.servers.healthChecks,
        failedHealthChecks: this.metrics.servers.failedHealthChecks
      },
      loadBalancer: {
        requests: this.metrics.loadBalancer.requests,
        connectionReleases: this.metrics.loadBalancer.connectionReleases
      },
      serviceDiscovery: {
        queries: this.metrics.serviceDiscovery.queries,
        subscriptions: this.metrics.serviceDiscovery.subscriptions
      },
      system: {
        uptime: `${Math.floor(this.metrics.system.uptime / 1000 / 60)}m`,
        memoryUsage: `${this.metrics.system.memoryUsage.heapUsedPercentage?.toFixed(2) || 0}%`
      },
      activeAlerts: this.activeAlerts.size
    };
  }

  /**
   * Update alert thresholds
   */
  updateAlertThresholds(newThresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
    logger.info('Alert thresholds updated', this.alertThresholds);
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    // Reset counters but keep configuration
    this.metrics.requests.total = 0;
    this.metrics.requests.errors = 0;
    this.metrics.requests.byEndpoint.clear();
    this.metrics.requests.byMethod.clear();
    this.metrics.requests.byStatus.clear();
    
    this.metrics.servers.registrations = 0;
    this.metrics.servers.unregistrations = 0;
    this.metrics.servers.healthChecks = 0;
    this.metrics.servers.failedHealthChecks = 0;
    
    this.metrics.loadBalancer.requests = 0;
    this.metrics.loadBalancer.connectionReleases = 0;
    this.metrics.loadBalancer.byStrategy.clear();
    
    this.metrics.serviceDiscovery.queries = 0;
    this.metrics.serviceDiscovery.subscriptions = 0;
    this.metrics.serviceDiscovery.unsubscriptions = 0;
    
    this.responseTimeHistory = [];
    this.activeAlerts.clear();
    
    logger.info('Metrics reset');
    this.emit('metricsReset', { timestamp: Date.now() });
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopSystemMonitoring();
    this.removeAllListeners();
    this.activeAlerts.clear();
    this.responseTimeHistory = [];
  }
}

module.exports = MonitoringSystem;