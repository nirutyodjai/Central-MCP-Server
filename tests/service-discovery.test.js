const ServiceDiscovery = require('../service-discovery');
const MCPRegistry = require('../mcp-registry');

// Mock axios for HTTP requests
jest.mock('axios');
const axios = require('axios');

describe('ServiceDiscovery', () => {
  let serviceDiscovery;
  let mockRegistry;

  beforeEach(() => {
    // Create mock registry
    mockRegistry = {
      getAllServers: jest.fn(),
      getHealthyServers: jest.fn(),
      getServersByCapability: jest.fn(),
      getServer: jest.fn(),
      registerServer: jest.fn(),
      unregisterServer: jest.fn(),
      updateServerStatus: jest.fn()
    };

    serviceDiscovery = new ServiceDiscovery(mockRegistry);

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with registry', () => {
      expect(serviceDiscovery.registry).toBe(mockRegistry);
    });

    test('should initialize with empty subscriptions', () => {
      const subscriptions = serviceDiscovery.getSubscriptions();
      expect(subscriptions).toEqual({});
    });
  });

  describe('Service Discovery', () => {
    const mockServers = [
      {
        id: 'server-1',
        name: 'Chat Server',
        url: 'http://localhost:3001',
        capabilities: ['chat', 'conversation'],
        status: 'healthy',
        metadata: { version: '1.0.0', region: 'us-east' }
      },
      {
        id: 'server-2',
        name: 'Search Server',
        url: 'http://localhost:3002',
        capabilities: ['search', 'indexing'],
        status: 'healthy',
        metadata: { version: '2.1.0', region: 'us-west' }
      },
      {
        id: 'server-3',
        name: 'Analysis Server',
        url: 'http://localhost:3003',
        capabilities: ['analysis', 'reporting'],
        status: 'unhealthy',
        metadata: { version: '1.5.0', region: 'eu-central' }
      }
    ];

    beforeEach(() => {
      mockRegistry.getAllServers.mockReturnValue(mockServers);
      mockRegistry.getHealthyServers.mockReturnValue(
        mockServers.filter(s => s.status === 'healthy')
      );
      mockRegistry.getServersByCapability.mockImplementation(capability => 
        mockServers.filter(s => s.capabilities.includes(capability))
      );
    });

    test('should find services by capability', () => {
      const chatServices = serviceDiscovery.findServices('chat');
      
      expect(chatServices).toHaveLength(1);
      expect(chatServices[0].id).toBe('server-1');
      expect(chatServices[0].capabilities).toContain('chat');
    });

    test('should find multiple services with same capability', () => {
      // Add another chat server
      const chatServer2 = {
        id: 'server-4',
        name: 'Chat Server 2',
        capabilities: ['chat'],
        status: 'healthy'
      };
      
      mockRegistry.getServersByCapability.mockImplementation(capability => {
        if (capability === 'chat') {
          return [mockServers[0], chatServer2];
        }
        return mockServers.filter(s => s.capabilities.includes(capability));
      });
      
      const chatServices = serviceDiscovery.findServices('chat');
      
      expect(chatServices).toHaveLength(2);
      expect(chatServices.map(s => s.id)).toContain('server-1');
      expect(chatServices.map(s => s.id)).toContain('server-4');
    });

    test('should return empty array for non-existent capability', () => {
      mockRegistry.getServersByCapability.mockReturnValue([]);
      
      const services = serviceDiscovery.findServices('non-existent');
      
      expect(services).toHaveLength(0);
    });

    test('should filter by health status', () => {
      const options = { healthyOnly: true };
      const services = serviceDiscovery.findServices('analysis', options);
      
      expect(services).toHaveLength(0); // analysis server is unhealthy
    });

    test('should filter by metadata', () => {
      const options = {
        metadata: { region: 'us-east' }
      };
      
      const services = serviceDiscovery.findServices('chat', options);
      
      expect(services).toHaveLength(1);
      expect(services[0].metadata.region).toBe('us-east');
    });

    test('should filter by multiple metadata criteria', () => {
      const options = {
        metadata: { 
          region: 'us-west',
          version: '2.1.0'
        }
      };
      
      const services = serviceDiscovery.findServices('search', options);
      
      expect(services).toHaveLength(1);
      expect(services[0].id).toBe('server-2');
    });

    test('should limit results', () => {
      // Mock multiple servers with same capability
      const multipleServers = Array.from({ length: 10 }, (_, i) => ({
        id: `server-${i}`,
        name: `Server ${i}`,
        capabilities: ['test'],
        status: 'healthy'
      }));
      
      mockRegistry.getServersByCapability.mockReturnValue(multipleServers);
      
      const options = { limit: 3 };
      const services = serviceDiscovery.findServices('test', options);
      
      expect(services).toHaveLength(3);
    });

    test('should sort results by preference', () => {
      const options = {
        sortBy: 'name',
        sortOrder: 'asc'
      };
      
      const services = serviceDiscovery.findServices('search', options);
      
      expect(services).toHaveLength(1);
      // With multiple servers, would test sorting
    });
  });

  describe('Available Capabilities', () => {
    test('should return all unique capabilities', () => {
      const mockServers = [
        { capabilities: ['chat', 'conversation'] },
        { capabilities: ['search', 'indexing'] },
        { capabilities: ['chat', 'analysis'] } // chat appears twice
      ];
      
      mockRegistry.getAllServers.mockReturnValue(mockServers);
      
      const capabilities = serviceDiscovery.getAvailableCapabilities();
      
      expect(capabilities).toContain('chat');
      expect(capabilities).toContain('conversation');
      expect(capabilities).toContain('search');
      expect(capabilities).toContain('indexing');
      expect(capabilities).toContain('analysis');
      
      // Should not have duplicates
      const uniqueCapabilities = [...new Set(capabilities)];
      expect(capabilities).toHaveLength(uniqueCapabilities.length);
    });

    test('should return empty array when no servers exist', () => {
      mockRegistry.getAllServers.mockReturnValue([]);
      
      const capabilities = serviceDiscovery.getAvailableCapabilities();
      
      expect(capabilities).toHaveLength(0);
    });

    test('should handle servers without capabilities', () => {
      const mockServers = [
        { capabilities: ['chat'] },
        { capabilities: [] },
        { capabilities: ['search'] }
      ];
      
      mockRegistry.getAllServers.mockReturnValue(mockServers);
      
      const capabilities = serviceDiscovery.getAvailableCapabilities();
      
      expect(capabilities).toContain('chat');
      expect(capabilities).toContain('search');
      expect(capabilities).toHaveLength(2);
    });
  });

  describe('Service Subscriptions', () => {
    test('should subscribe to capability updates', () => {
      const callback = jest.fn();
      
      serviceDiscovery.subscribe('chat', callback);
      
      const subscriptions = serviceDiscovery.getSubscriptions();
      expect(subscriptions.chat).toContain(callback);
    });

    test('should allow multiple subscriptions to same capability', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      serviceDiscovery.subscribe('chat', callback1);
      serviceDiscovery.subscribe('chat', callback2);
      
      const subscriptions = serviceDiscovery.getSubscriptions();
      expect(subscriptions.chat).toHaveLength(2);
      expect(subscriptions.chat).toContain(callback1);
      expect(subscriptions.chat).toContain(callback2);
    });

    test('should unsubscribe from capability updates', () => {
      const callback = jest.fn();
      
      serviceDiscovery.subscribe('chat', callback);
      serviceDiscovery.unsubscribe('chat', callback);
      
      const subscriptions = serviceDiscovery.getSubscriptions();
      expect(subscriptions.chat).not.toContain(callback);
    });

    test('should handle unsubscribe from non-existent subscription', () => {
      const callback = jest.fn();
      
      expect(() => {
        serviceDiscovery.unsubscribe('chat', callback);
      }).not.toThrow();
    });

    test('should notify subscribers when services change', () => {
      const callback = jest.fn();
      
      serviceDiscovery.subscribe('chat', callback);
      serviceDiscovery.notifySubscribers('chat', [{ id: 'server-1' }]);
      
      expect(callback).toHaveBeenCalledWith([{ id: 'server-1' }]);
    });

    test('should handle notification errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const goodCallback = jest.fn();
      
      serviceDiscovery.subscribe('chat', errorCallback);
      serviceDiscovery.subscribe('chat', goodCallback);
      
      expect(() => {
        serviceDiscovery.notifySubscribers('chat', []);
      }).not.toThrow();
      
      expect(goodCallback).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Service Health Monitoring', () => {
    test('should start health monitoring', () => {
      const interval = serviceDiscovery.startHealthMonitoring(1000);
      
      expect(interval).toBeDefined();
      
      // Clean up
      serviceDiscovery.stopHealthMonitoring();
    });

    test('should stop health monitoring', () => {
      serviceDiscovery.startHealthMonitoring(1000);
      
      expect(() => {
        serviceDiscovery.stopHealthMonitoring();
      }).not.toThrow();
    });

    test('should perform health checks on monitored services', async () => {
      const mockServer = {
        id: 'server-1',
        url: 'http://localhost:3001',
        capabilities: ['chat']
      };
      
      mockRegistry.getAllServers.mockReturnValue([mockServer]);
      axios.get.mockResolvedValue({ status: 200, data: { status: 'healthy' } });
      
      await serviceDiscovery.performHealthChecks();
      
      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3001/health',
        expect.any(Object)
      );
    });

    test('should handle health check failures', async () => {
      const mockServer = {
        id: 'server-1',
        url: 'http://localhost:3001',
        capabilities: ['chat']
      };
      
      mockRegistry.getAllServers.mockReturnValue([mockServer]);
      axios.get.mockRejectedValue(new Error('Connection failed'));
      
      await serviceDiscovery.performHealthChecks();
      
      expect(mockRegistry.updateServerStatus).toHaveBeenCalledWith(
        'server-1',
        'unhealthy'
      );
    });

    test('should update server status based on health check', async () => {
      const mockServer = {
        id: 'server-1',
        url: 'http://localhost:3001',
        capabilities: ['chat']
      };
      
      mockRegistry.getAllServers.mockReturnValue([mockServer]);
      axios.get.mockResolvedValue({ status: 200, data: { status: 'healthy' } });
      
      await serviceDiscovery.performHealthChecks();
      
      expect(mockRegistry.updateServerStatus).toHaveBeenCalledWith(
        'server-1',
        'healthy'
      );
    });
  });

  describe('Service Registration Events', () => {
    test('should handle server registration events', () => {
      const callback = jest.fn();
      serviceDiscovery.subscribe('chat', callback);
      
      const newServer = {
        id: 'server-new',
        capabilities: ['chat'],
        status: 'healthy'
      };
      
      serviceDiscovery.onServerRegistered(newServer);
      
      expect(callback).toHaveBeenCalled();
    });

    test('should handle server unregistration events', () => {
      const callback = jest.fn();
      serviceDiscovery.subscribe('chat', callback);
      
      serviceDiscovery.onServerUnregistered('server-1', ['chat']);
      
      expect(callback).toHaveBeenCalled();
    });

    test('should handle server status change events', () => {
      const callback = jest.fn();
      serviceDiscovery.subscribe('chat', callback);
      
      serviceDiscovery.onServerStatusChanged('server-1', 'healthy', 'unhealthy', ['chat']);
      
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Advanced Filtering', () => {
    const mockServers = [
      {
        id: 'server-1',
        name: 'Fast Chat Server',
        capabilities: ['chat'],
        status: 'healthy',
        metadata: { 
          responseTime: 50,
          load: 0.2,
          version: '2.0.0',
          tags: ['fast', 'reliable']
        }
      },
      {
        id: 'server-2',
        name: 'Slow Chat Server',
        capabilities: ['chat'],
        status: 'healthy',
        metadata: {
          responseTime: 200,
          load: 0.8,
          version: '1.0.0',
          tags: ['stable']
        }
      }
    ];

    beforeEach(() => {
      mockRegistry.getServersByCapability.mockReturnValue(mockServers);
    });

    test('should filter by custom criteria', () => {
      const options = {
        filter: (server) => server.metadata.responseTime < 100
      };
      
      const services = serviceDiscovery.findServices('chat', options);
      
      expect(services).toHaveLength(1);
      expect(services[0].id).toBe('server-1');
    });

    test('should filter by tags', () => {
      const options = {
        tags: ['fast']
      };
      
      const services = serviceDiscovery.findServices('chat', options);
      
      expect(services).toHaveLength(1);
      expect(services[0].metadata.tags).toContain('fast');
    });

    test('should filter by version range', () => {
      const options = {
        versionRange: '>=2.0.0'
      };
      
      const services = serviceDiscovery.findServices('chat', options);
      
      expect(services).toHaveLength(1);
      expect(services[0].metadata.version).toBe('2.0.0');
    });

    test('should combine multiple filters', () => {
      const options = {
        healthyOnly: true,
        filter: (server) => server.metadata.load < 0.5,
        tags: ['fast']
      };
      
      const services = serviceDiscovery.findServices('chat', options);
      
      expect(services).toHaveLength(1);
      expect(services[0].id).toBe('server-1');
    });
  });

  describe('Performance and Caching', () => {
    test('should cache service discovery results', () => {
      const options = { cache: true, cacheTTL: 5000 };
      
      // First call
      serviceDiscovery.findServices('chat', options);
      expect(mockRegistry.getServersByCapability).toHaveBeenCalledTimes(1);
      
      // Second call should use cache
      serviceDiscovery.findServices('chat', options);
      expect(mockRegistry.getServersByCapability).toHaveBeenCalledTimes(1);
    });

    test('should invalidate cache after TTL', (done) => {
      const options = { cache: true, cacheTTL: 100 };
      
      // First call
      serviceDiscovery.findServices('chat', options);
      expect(mockRegistry.getServersByCapability).toHaveBeenCalledTimes(1);
      
      // Wait for cache to expire
      setTimeout(() => {
        serviceDiscovery.findServices('chat', options);
        expect(mockRegistry.getServersByCapability).toHaveBeenCalledTimes(2);
        done();
      }, 150);
    });

    test('should handle concurrent requests efficiently', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve().then(() => {
            return serviceDiscovery.findServices('chat');
          })
        );
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle registry errors gracefully', () => {
      mockRegistry.getServersByCapability.mockImplementation(() => {
        throw new Error('Registry error');
      });
      
      const services = serviceDiscovery.findServices('chat');
      
      expect(services).toHaveLength(0);
      expect(console.error).toHaveBeenCalled();
    });

    test('should handle invalid capability names', () => {
      expect(() => {
        serviceDiscovery.findServices(null);
      }).not.toThrow();
      
      expect(() => {
        serviceDiscovery.findServices('');
      }).not.toThrow();
      
      expect(() => {
        serviceDiscovery.findServices(123);
      }).not.toThrow();
    });

    test('should handle malformed server data', () => {
      const malformedServers = [
        { id: 'server-1' }, // missing capabilities
        { capabilities: ['chat'] }, // missing id
        null,
        undefined
      ];
      
      mockRegistry.getServersByCapability.mockReturnValue(malformedServers);
      
      expect(() => {
        const services = serviceDiscovery.findServices('chat');
        expect(Array.isArray(services)).toBe(true);
      }).not.toThrow();
    });

    test('should handle subscription callback errors', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      
      serviceDiscovery.subscribe('chat', errorCallback);
      
      expect(() => {
        serviceDiscovery.notifySubscribers('chat', []);
      }).not.toThrow();
      
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Cleanup and Resource Management', () => {
    test('should clean up resources on shutdown', () => {
      serviceDiscovery.startHealthMonitoring(1000);
      
      expect(() => {
        serviceDiscovery.shutdown();
      }).not.toThrow();
    });

    test('should clear all subscriptions on shutdown', () => {
      const callback = jest.fn();
      serviceDiscovery.subscribe('chat', callback);
      
      serviceDiscovery.shutdown();
      
      const subscriptions = serviceDiscovery.getSubscriptions();
      expect(Object.keys(subscriptions)).toHaveLength(0);
    });

    test('should handle multiple shutdown calls', () => {
      serviceDiscovery.startHealthMonitoring(1000);
      
      expect(() => {
        serviceDiscovery.shutdown();
        serviceDiscovery.shutdown();
        serviceDiscovery.shutdown();
      }).not.toThrow();
    });
  });
});