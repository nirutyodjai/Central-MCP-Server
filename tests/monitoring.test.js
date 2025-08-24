const MonitoringSystem = require('../monitoring');
const fs = require('fs');
const path = require('path');

// Mock fs for testing
jest.mock('fs');

describe('MonitoringSystem', () => {
  let monitoring;
  let mockWriteFileSync;
  let mockExistsSync;
  let mockMkdirSync;

  beforeEach(() => {
    monitoring = new MonitoringSystem();
    
    // Setup fs mocks
    mockWriteFileSync = jest.fn();
    mockExistsSync = jest.fn().mockReturnValue(true);
    mockMkdirSync = jest.fn();
    
    fs.writeFileSync = mockWriteFileSync;
    fs.existsSync = mockExistsSync;
    fs.mkdirSync = mockMkdirSync;
    
    // Mock console methods to avoid test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default metrics', () => {
      const metrics = monitoring.getMetrics();
      
      expect(metrics.requests).toBeDefined();
      expect(metrics.servers).toBeDefined();
      expect(metrics.loadBalancer).toBeDefined();
      expect(metrics.serviceDiscovery).toBeDefined();
      expect(metrics.system).toBeDefined();
      
      expect(metrics.requests.total).toBe(0);
      expect(metrics.servers.registered).toBe(0);
      expect(metrics.system.uptime).toBeGreaterThan(0);
    });

    test('should initialize with default alert thresholds', () => {
      const thresholds = monitoring.getAlertThresholds();
      
      expect(thresholds.errorRate).toBe(0.05);
      expect(thresholds.responseTime).toBe(5000);
      expect(thresholds.memoryUsage).toBe(0.9);
      expect(thresholds.cpuUsage).toBe(0.8);
    });
  });

  describe('Request Tracking', () => {
    test('should record request metrics', () => {
      monitoring.recordRequest('GET', '/api/test', 200, 150);
      
      const metrics = monitoring.getMetrics();
      
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.successful).toBe(1);
      expect(metrics.requests.failed).toBe(0);
      expect(metrics.requests.averageResponseTime).toBe(150);
      expect(metrics.requests.byMethod.GET).toBe(1);
      expect(metrics.requests.byStatus[200]).toBe(1);
    });

    test('should track failed requests', () => {
      monitoring.recordRequest('POST', '/api/test', 500, 200);
      
      const metrics = monitoring.getMetrics();
      
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.successful).toBe(0);
      expect(metrics.requests.failed).toBe(1);
      expect(metrics.requests.byStatus[500]).toBe(1);
    });

    test('should calculate average response time correctly', () => {
      monitoring.recordRequest('GET', '/api/test1', 200, 100);
      monitoring.recordRequest('GET', '/api/test2', 200, 200);
      monitoring.recordRequest('GET', '/api/test3', 200, 300);
      
      const metrics = monitoring.getMetrics();
      
      expect(metrics.requests.averageResponseTime).toBe(200);
    });

    test('should track requests by endpoint', () => {
      monitoring.recordRequest('GET', '/api/servers', 200, 100);
      monitoring.recordRequest('POST', '/api/servers', 201, 150);
      monitoring.recordRequest('GET', '/api/servers', 200, 120);
      
      const metrics = monitoring.getMetrics();
      
      expect(metrics.requests.byEndpoint['/api/servers']).toBe(3);
    });

    test('should handle concurrent request recording', async () => {
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            monitoring.recordRequest('GET', `/api/test${i}`, 200, 100 + i);
          })
        );
      }
      
      await Promise.all(promises);
      
      const metrics = monitoring.getMetrics();
      expect(metrics.requests.total).toBe(100);
    });
  });

  describe('Server Metrics', () => {
    test('should record server registration', () => {
      monitoring.recordServerRegistration('server-1');
      
      const metrics = monitoring.getMetrics();
      
      expect(metrics.servers.registered).toBe(1);
      expect(metrics.servers.registrations).toBe(1);
    });

    test('should record server unregistration', () => {
      monitoring.recordServerRegistration('server-1');
      monitoring.recordServerUnregistration('server-1');
      
      const metrics = monitoring.getMetrics();
      
      expect(metrics.servers.registered).toBe(0);
      expect(metrics.servers.unregistrations).toBe(1);
    });

    test('should track server health changes', () => {
      monitoring.recordServerHealthChange('server-1', 'healthy', 'unhealthy');
      
      const metrics = monitoring.getMetrics();
      
      expect(metrics.servers.healthChanges).toBe(1);
    });

    test('should track multiple servers', () => {
      monitoring.recordServerRegistration('server-1');
      monitoring.recordServerRegistration('server-2');
      monitoring.recordServerRegistration('server-3');
      monitoring.recordServerUnregistration('server-1');
      
      const metrics = monitoring.getMetrics();
      
      expect(metrics.servers.registered).toBe(2);
      expect(metrics.servers.registrations).toBe(3);
      expect(metrics.servers.unregistrations).toBe(1);
    });
  });

  describe('Load Balancer Metrics', () => {
    test('should record load balancer requests', () => {
      monitoring.recordLoadBalancerRequest('server-1', 'round-robin');
      
      const metrics = monitoring.getMetrics();
      
      expect(metrics.loadBalancer.totalRequests).toBe(1);
      expect(metrics.loadBalancer.byStrategy['round-robin']).toBe(1);
      expect(metrics.loadBalancer.byServer['server-1']).toBe(1);
    });

    test('should track different strategies', () => {
      monitoring.recordLoadBalancerRequest('server-1', 'round-robin');
      monitoring.recordLoadBalancerRequest('server-2', 'least-connections');
      monitoring.recordLoadBalancerRequest('server-3', 'weighted');
      
      const metrics = monitoring.getMetrics();
      
      expect(metrics.loadBalancer.totalRequests).toBe(3);
      expect(metrics.loadBalancer.byStrategy['round-robin']).toBe(1);
      expect(metrics.loadBalancer.byStrategy['least-connections']).toBe(1);
      expect(metrics.loadBalancer.byStrategy['weighted']).toBe(1);
    });

    test('should record connection metrics', () => {
      monitoring.recordConnectionAcquired('server-1');
      monitoring.recordConnectionReleased('server-1');
      
      const metrics = monitoring.getMetrics();
      
      expect(metrics.loadBalancer.connectionsAcquired).toBe(1);
      expect(metrics.loadBalancer.connectionsReleased).toBe(1);
    });
  });

  describe('Service Discovery Metrics', () => {
    test('should record service discovery queries', () => {
      monitoring.recordServiceDiscoveryQuery('chat', 2);
      
      const metrics = monitoring.getMetrics();
      
      expect(metrics.serviceDiscovery.totalQueries).toBe(1);
      expect(metrics.serviceDiscovery.byCapability['chat']).toBe(1);
      expect(metrics.serviceDiscovery.averageResultsPerQuery).toBe(2);
    });

    test('should calculate average results correctly', () => {
      monitoring.recordServiceDiscoveryQuery('chat', 2);
      monitoring.recordServiceDiscoveryQuery('search', 4);
      monitoring.recordServiceDiscoveryQuery('analysis', 0);
      
      const metrics = monitoring.getMetrics();
      
      expect(metrics.serviceDiscovery.totalQueries).toBe(3);
      expect(metrics.serviceDiscovery.averageResultsPerQuery).toBe(2);
    });
  });

  describe('Performance Tracking', () => {
    test('should start and end performance tracking', () => {
      const trackingId = monitoring.startPerformanceTracking('test-operation');
      
      expect(trackingId).toBeDefined();
      expect(typeof trackingId).toBe('string');
      
      // Simulate some work
      setTimeout(() => {
        const duration = monitoring.endPerformanceTracking(trackingId);
        expect(duration).toBeGreaterThan(0);
      }, 10);
    });

    test('should handle invalid tracking IDs', () => {
      const duration = monitoring.endPerformanceTracking('invalid-id');
      expect(duration).toBe(0);
    });

    test('should track multiple operations concurrently', () => {
      const id1 = monitoring.startPerformanceTracking('operation-1');
      const id2 = monitoring.startPerformanceTracking('operation-2');
      
      expect(id1).not.toBe(id2);
      
      const duration1 = monitoring.endPerformanceTracking(id1);
      const duration2 = monitoring.endPerformanceTracking(id2);
      
      expect(duration1).toBeGreaterThanOrEqual(0);
      expect(duration2).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Alert System', () => {
    test('should set and get alert thresholds', () => {
      monitoring.setAlertThreshold('errorRate', 0.1);
      monitoring.setAlertThreshold('responseTime', 3000);
      
      const thresholds = monitoring.getAlertThresholds();
      
      expect(thresholds.errorRate).toBe(0.1);
      expect(thresholds.responseTime).toBe(3000);
    });

    test('should check alerts for error rate', () => {
      monitoring.setAlertThreshold('errorRate', 0.1);
      
      // Generate requests with high error rate
      for (let i = 0; i < 10; i++) {
        monitoring.recordRequest('GET', '/api/test', i < 2 ? 500 : 200, 100);
      }
      
      const alerts = monitoring.checkAlerts();
      
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.type === 'errorRate')).toBe(true);
    });

    test('should check alerts for response time', () => {
      monitoring.setAlertThreshold('responseTime', 100);
      
      monitoring.recordRequest('GET', '/api/slow', 200, 200);
      
      const alerts = monitoring.checkAlerts();
      
      expect(alerts.some(alert => alert.type === 'responseTime')).toBe(true);
    });

    test('should not trigger alerts when thresholds are not exceeded', () => {
      monitoring.setAlertThreshold('errorRate', 0.5);
      monitoring.setAlertThreshold('responseTime', 1000);
      
      monitoring.recordRequest('GET', '/api/test', 200, 100);
      
      const alerts = monitoring.checkAlerts();
      
      expect(alerts.length).toBe(0);
    });
  });

  describe('System Metrics', () => {
    test('should update system metrics', () => {
      const initialMetrics = monitoring.getMetrics();
      const initialUptime = initialMetrics.system.uptime;
      
      // Wait a bit and update
      setTimeout(() => {
        monitoring.updateSystemMetrics();
        const updatedMetrics = monitoring.getMetrics();
        
        expect(updatedMetrics.system.uptime).toBeGreaterThan(initialUptime);
        expect(updatedMetrics.system.memoryUsage).toBeDefined();
        expect(updatedMetrics.system.cpuUsage).toBeDefined();
      }, 10);
    });

    test('should track memory and CPU usage', () => {
      monitoring.updateSystemMetrics();
      const metrics = monitoring.getMetrics();
      
      expect(typeof metrics.system.memoryUsage).toBe('number');
      expect(typeof metrics.system.cpuUsage).toBe('number');
      expect(metrics.system.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.system.memoryUsage).toBeLessThanOrEqual(1);
    });
  });

  describe('Summary and Statistics', () => {
    test('should generate summary statistics', () => {
      // Generate some test data
      monitoring.recordRequest('GET', '/api/test1', 200, 100);
      monitoring.recordRequest('POST', '/api/test2', 201, 150);
      monitoring.recordRequest('GET', '/api/test3', 500, 200);
      monitoring.recordServerRegistration('server-1');
      monitoring.recordLoadBalancerRequest('server-1', 'round-robin');
      
      const summary = monitoring.getSummary();
      
      expect(summary.totalRequests).toBe(3);
      expect(summary.successfulRequests).toBe(2);
      expect(summary.failedRequests).toBe(1);
      expect(summary.errorRate).toBeCloseTo(0.333, 2);
      expect(summary.averageResponseTime).toBe(150);
      expect(summary.registeredServers).toBe(1);
      expect(summary.loadBalancerRequests).toBe(1);
    });

    test('should handle empty metrics in summary', () => {
      const summary = monitoring.getSummary();
      
      expect(summary.totalRequests).toBe(0);
      expect(summary.errorRate).toBe(0);
      expect(summary.averageResponseTime).toBe(0);
    });
  });

  describe('Data Persistence', () => {
    test('should save metrics to file', () => {
      monitoring.recordRequest('GET', '/api/test', 200, 100);
      monitoring.saveMetrics();
      
      expect(mockWriteFileSync).toHaveBeenCalled();
      
      const [filePath, data] = mockWriteFileSync.mock.calls[0];
      expect(filePath).toContain('metrics');
      expect(typeof data).toBe('string');
      
      const savedData = JSON.parse(data);
      expect(savedData.requests.total).toBe(1);
    });

    test('should create logs directory if it does not exist', () => {
      mockExistsSync.mockReturnValue(false);
      
      monitoring.saveMetrics();
      
      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('logs'),
        { recursive: true }
      );
    });

    test('should handle file write errors gracefully', () => {
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });
      
      expect(() => monitoring.saveMetrics()).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Reset and Cleanup', () => {
    test('should reset all metrics', () => {
      // Generate some data
      monitoring.recordRequest('GET', '/api/test', 200, 100);
      monitoring.recordServerRegistration('server-1');
      monitoring.recordLoadBalancerRequest('server-1', 'round-robin');
      
      // Verify data exists
      let metrics = monitoring.getMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.servers.registered).toBe(1);
      
      // Reset
      monitoring.reset();
      
      // Verify data is cleared
      metrics = monitoring.getMetrics();
      expect(metrics.requests.total).toBe(0);
      expect(metrics.servers.registered).toBe(0);
      expect(metrics.loadBalancer.totalRequests).toBe(0);
    });

    test('should preserve alert thresholds after reset', () => {
      monitoring.setAlertThreshold('errorRate', 0.2);
      monitoring.setAlertThreshold('responseTime', 2000);
      
      monitoring.reset();
      
      const thresholds = monitoring.getAlertThresholds();
      expect(thresholds.errorRate).toBe(0.2);
      expect(thresholds.responseTime).toBe(2000);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle negative response times', () => {
      monitoring.recordRequest('GET', '/api/test', 200, -100);
      
      const metrics = monitoring.getMetrics();
      expect(metrics.requests.averageResponseTime).toBeGreaterThanOrEqual(0);
    });

    test('should handle very large response times', () => {
      monitoring.recordRequest('GET', '/api/test', 200, 999999);
      
      const metrics = monitoring.getMetrics();
      expect(metrics.requests.averageResponseTime).toBe(999999);
    });

    test('should handle invalid status codes', () => {
      monitoring.recordRequest('GET', '/api/test', 999, 100);
      
      const metrics = monitoring.getMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.byStatus[999]).toBe(1);
    });

    test('should handle empty or null parameters', () => {
      expect(() => {
        monitoring.recordRequest('', '', null, null);
      }).not.toThrow();
      
      expect(() => {
        monitoring.recordServerRegistration('');
      }).not.toThrow();
      
      expect(() => {
        monitoring.recordLoadBalancerRequest('', '');
      }).not.toThrow();
    });

    test('should handle concurrent operations safely', async () => {
      const promises = [];
      
      // Simulate concurrent operations
      for (let i = 0; i < 50; i++) {
        promises.push(
          Promise.resolve().then(() => {
            monitoring.recordRequest('GET', `/api/test${i}`, 200, 100);
            monitoring.recordServerRegistration(`server-${i}`);
            monitoring.recordLoadBalancerRequest(`server-${i}`, 'round-robin');
          })
        );
      }
      
      await Promise.all(promises);
      
      const metrics = monitoring.getMetrics();
      expect(metrics.requests.total).toBe(50);
      expect(metrics.servers.registered).toBe(50);
      expect(metrics.loadBalancer.totalRequests).toBe(50);
    });
  });
});