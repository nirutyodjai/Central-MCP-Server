const EventEmitter = require('events');
const axios = require('axios');
const logger = require('./logger');

/**
 * Load Balancer for MCP Servers
 * Provides various load balancing strategies and health monitoring
 */
class LoadBalancer extends EventEmitter {
  constructor(mcpRegistry) {
    super();
    this.mcpRegistry = mcpRegistry;
    this.strategies = {
      'round-robin': this.roundRobinStrategy.bind(this),
      'least-connections': this.leastConnectionsStrategy.bind(this),
      'weighted-round-robin': this.weightedRoundRobinStrategy.bind(this),
      'random': this.randomStrategy.bind(this),
      'health-based': this.healthBasedStrategy.bind(this),
      'response-time': this.responseTimeStrategy.bind(this)
    };
    
    this.roundRobinCounters = new Map(); // capability -> counter
    this.connectionCounts = new Map(); // serverId -> count
    this.healthCheckInterval = 30000; // 30 seconds
    this.healthCheckTimeout = 5000; // 5 seconds
    this.healthCheckTimer = null;
  }

  /**
   * Get the next server using specified strategy
   */
  getNextServer(capability, strategy = 'round-robin', options = {}) {
    const servers = this.mcpRegistry.getServersByCapability(capability);
    const healthyServers = servers.filter(server => server.status === 'healthy');
    
    if (healthyServers.length === 0) {
      logger.warn('No healthy servers available', { capability });
      return null;
    }

    const strategyFn = this.strategies[strategy];
    if (!strategyFn) {
      logger.warn('Unknown load balancing strategy, using round-robin', { strategy });
      return this.roundRobinStrategy(healthyServers, capability, options);
    }

    return strategyFn(healthyServers, capability, options);
  }

  /**
   * Round Robin Strategy
   */
  roundRobinStrategy(servers, capability) {
    if (!this.roundRobinCounters.has(capability)) {
      this.roundRobinCounters.set(capability, 0);
    }
    
    const counter = this.roundRobinCounters.get(capability);
    const server = servers[counter % servers.length];
    this.roundRobinCounters.set(capability, counter + 1);
    
    return server;
  }

  /**
   * Least Connections Strategy
   */
  leastConnectionsStrategy(servers) {
    return servers.reduce((least, current) => {
      const leastConnections = this.connectionCounts.get(least.id) || 0;
      const currentConnections = this.connectionCounts.get(current.id) || 0;
      return currentConnections < leastConnections ? current : least;
    });
  }

  /**
   * Weighted Round Robin Strategy
   */
  weightedRoundRobinStrategy(servers, capability, options = {}) {
    const weights = options.weights || {};
    const weightedServers = [];
    
    servers.forEach(server => {
      const weight = weights[server.id] || server.metadata?.weight || 1;
      for (let i = 0; i < weight; i++) {
        weightedServers.push(server);
      }
    });
    
    return this.roundRobinStrategy(weightedServers, capability + '_weighted');
  }

  /**
   * Random Strategy
   */
  randomStrategy(servers) {
    return servers[Math.floor(Math.random() * servers.length)];
  }

  /**
   * Health-based Strategy (prioritizes healthiest servers)
   */
  healthBasedStrategy(servers) {
    // Sort by health score (higher is better)
    const sortedServers = servers.sort((a, b) => {
      const scoreA = this.calculateHealthScore(a);
      const scoreB = this.calculateHealthScore(b);
      return scoreB - scoreA;
    });
    
    return sortedServers[0];
  }

  /**
   * Response Time Strategy (prioritizes fastest servers)
   */
  responseTimeStrategy(servers) {
    // Sort by average response time (lower is better)
    const sortedServers = servers.sort((a, b) => {
      const timeA = a.metadata?.avgResponseTime || Infinity;
      const timeB = b.metadata?.avgResponseTime || Infinity;
      return timeA - timeB;
    });
    
    return sortedServers[0];
  }

  /**
   * Calculate health score for a server
   */
  calculateHealthScore(server) {
    let score = 100; // Base score
    
    // Deduct points based on response time
    const avgResponseTime = server.metadata?.avgResponseTime || 0;
    if (avgResponseTime > 1000) score -= 20;
    else if (avgResponseTime > 500) score -= 10;
    
    // Deduct points based on error rate
    const errorRate = server.metadata?.errorRate || 0;
    score -= errorRate * 50;
    
    // Deduct points based on connection count
    const connections = this.connectionCounts.get(server.id) || 0;
    score -= connections * 2;
    
    // Add points for recent successful health checks
    const timeSinceLastCheck = Date.now() - (server.lastHealthCheck || 0);
    if (timeSinceLastCheck < 60000) score += 10; // Within last minute
    
    return Math.max(0, score);
  }

  /**
   * Track connection to a server
   */
  trackConnection(serverId, increment = true) {
    const current = this.connectionCounts.get(serverId) || 0;
    const newCount = increment ? current + 1 : Math.max(0, current - 1);
    this.connectionCounts.set(serverId, newCount);
    
    logger.debug('Connection count updated', { serverId, count: newCount });
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.healthCheckInterval);
    
    logger.info('Health check monitoring started', { interval: this.healthCheckInterval });
  }

  /**
   * Stop health checks
   */
  stopHealthChecks() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      logger.info('Health check monitoring stopped');
    }
  }

  /**
   * Perform health checks on all registered servers
   */
  async performHealthChecks() {
    const servers = this.mcpRegistry.getAllServers();
    const healthCheckPromises = servers.map(server => this.checkServerHealth(server));
    
    try {
      await Promise.allSettled(healthCheckPromises);
      logger.debug('Health checks completed', { serverCount: servers.length });
    } catch (error) {
      logger.error('Error during health checks', { error: error.message });
    }
  }

  /**
   * Check health of a specific server
   */
  async checkServerHealth(server) {
    const startTime = Date.now();
    
    try {
      const healthUrl = server.healthEndpoint || `${server.url}/health`;
      const response = await axios.get(healthUrl, {
        timeout: this.healthCheckTimeout,
        headers: {
          'User-Agent': 'Central-MCP-Server/1.0'
        }
      });
      
      const responseTime = Date.now() - startTime;
      const isHealthy = response.status === 200;
      
      // Update server health status
      const healthData = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        lastHealthCheck: Date.now(),
        responseTime,
        healthCheckCount: (server.healthCheckCount || 0) + 1
      };
      
      // Update average response time
      const currentAvg = server.metadata?.avgResponseTime || responseTime;
      const newAvg = (currentAvg + responseTime) / 2;
      
      this.mcpRegistry.updateServerMetadata(server.id, {
        ...healthData,
        avgResponseTime: newAvg,
        errorRate: Math.max(0, (server.metadata?.errorRate || 0) - 0.01) // Decrease error rate on success
      });
      
      if (server.status !== 'healthy' && isHealthy) {
        logger.info('Server recovered', { serverId: server.id, responseTime });
        this.emit('serverRecovered', server);
      }
      
      return { server, healthy: isHealthy, responseTime };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Update server as unhealthy
      const errorRate = Math.min(1, (server.metadata?.errorRate || 0) + 0.1);
      
      this.mcpRegistry.updateServerMetadata(server.id, {
        status: 'unhealthy',
        lastHealthCheck: Date.now(),
        lastError: error.message,
        errorRate,
        healthCheckCount: (server.healthCheckCount || 0) + 1
      });
      
      if (server.status === 'healthy') {
        logger.warn('Server became unhealthy', { 
          serverId: server.id, 
          error: error.message,
          responseTime 
        });
        this.emit('serverUnhealthy', server, error);
      }
      
      return { server, healthy: false, error: error.message, responseTime };
    }
  }

  /**
   * Get load balancing statistics
   */
  getStats() {
    const servers = this.mcpRegistry.getAllServers();
    const healthyCount = servers.filter(s => s.status === 'healthy').length;
    const unhealthyCount = servers.length - healthyCount;
    
    return {
      totalServers: servers.length,
      healthyServers: healthyCount,
      unhealthyServers: unhealthyCount,
      strategies: Object.keys(this.strategies),
      connectionCounts: Object.fromEntries(this.connectionCounts),
      roundRobinCounters: Object.fromEntries(this.roundRobinCounters),
      healthCheckInterval: this.healthCheckInterval,
      healthCheckTimeout: this.healthCheckTimeout
    };
  }

  /**
   * Update health check configuration
   */
  updateHealthCheckConfig(config) {
    if (config.interval) {
      this.healthCheckInterval = config.interval;
    }
    if (config.timeout) {
      this.healthCheckTimeout = config.timeout;
    }
    
    // Restart health checks with new configuration
    this.startHealthChecks();
    
    logger.info('Health check configuration updated', config);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopHealthChecks();
    this.removeAllListeners();
    this.connectionCounts.clear();
    this.roundRobinCounters.clear();
  }
}

module.exports = LoadBalancer;