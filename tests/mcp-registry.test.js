const MCPRegistry = require('../mcp-registry');
const axios = require('axios');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('MCPRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new MCPRegistry();
    jest.clearAllMocks();
  });

  afterEach(() => {
    registry.stopHealthChecks();
  });

  describe('Server Registration', () => {
    test('should register a new server successfully', () => {
      const serverData = {
        name: 'Test Server',
        url: 'http://localhost:3000',
        capabilities: ['chat', 'search'],
        description: 'A test server'
      };

      const serverId = registry.registerServer(serverData);

      expect(serverId).toBeDefined();
      expect(typeof serverId).toBe('string');
      expect(serverId.length).toBeGreaterThan(0);

      const server = registry.getServer(serverId);
      expect(server).toBeDefined();
      expect(server.name).toBe(serverData.name);
      expect(server.url).toBe(serverData.url);
      expect(server.capabilities).toEqual(serverData.capabilities);
      expect(server.status).toBe('unknown');
      expect(server.registeredAt).toBeDefined();
    });

    test('should generate unique server IDs', () => {
      const serverData1 = {
        name: 'Server 1',
        url: 'http://localhost:3001',
        capabilities: ['chat']
      };

      const serverData2 = {
        name: 'Server 2',
        url: 'http://localhost:3002',
        capabilities: ['search']
      };

      const serverId1 = registry.registerServer(serverData1);
      const serverId2 = registry.registerServer(serverData2);

      expect(serverId1).not.toBe(serverId2);
    });

    test('should handle server registration with minimal data', () => {
      const serverData = {
        name: 'Minimal Server',
        url: 'http://localhost:3003'
      };

      const serverId = registry.registerServer(serverData);
      const server = registry.getServer(serverId);

      expect(server.capabilities).toEqual([]);
      expect(server.description).toBe('');
      expect(server.metadata).toEqual({});
    });

    test('should validate required fields', () => {
      expect(() => {
        registry.registerServer({});
      }).toThrow();

      expect(() => {
        registry.registerServer({ name: 'Test' });
      }).toThrow();

      expect(() => {
        registry.registerServer({ url: 'http://localhost:3000' });
      }).toThrow();
    });
  });

  describe('Server Retrieval', () => {
    let serverId;

    beforeEach(() => {
      serverId = registry.registerServer({
        name: 'Test Server',
        url: 'http://localhost:3000',
        capabilities: ['chat', 'search']
      });
    });

    test('should retrieve server by ID', () => {
      const server = registry.getServer(serverId);
      expect(server).toBeDefined();
      expect(server.id).toBe(serverId);
    });

    test('should return undefined for non-existent server', () => {
      const server = registry.getServer('non-existent-id');
      expect(server).toBeUndefined();
    });

    test('should get all servers', () => {
      const servers = registry.getAllServers();
      expect(Array.isArray(servers)).toBe(true);
      expect(servers.length).toBe(1);
      expect(servers[0].id).toBe(serverId);
    });

    test('should get servers by capability', () => {
      const chatServers = registry.getServersByCapability('chat');
      expect(chatServers.length).toBe(1);
      expect(chatServers[0].id).toBe(serverId);

      const analysisServers = registry.getServersByCapability('analysis');
      expect(analysisServers.length).toBe(0);
    });

    test('should get healthy servers only', () => {
      // Initially no servers are healthy (status is 'unknown')
      const healthyServers = registry.getHealthyServers();
      expect(healthyServers.length).toBe(0);

      // Mark server as healthy
      registry.updateServerStatus(serverId, 'healthy');
      const healthyServersAfter = registry.getHealthyServers();
      expect(healthyServersAfter.length).toBe(1);
    });
  });

  describe('Server Management', () => {
    let serverId;

    beforeEach(() => {
      serverId = registry.registerServer({
        name: 'Test Server',
        url: 'http://localhost:3000',
        capabilities: ['chat']
      });
    });

    test('should update server status', () => {
      registry.updateServerStatus(serverId, 'healthy');
      const server = registry.getServer(serverId);
      expect(server.status).toBe('healthy');
      expect(server.lastHealthCheck).toBeDefined();
    });

    test('should update server metrics', () => {
      const metrics = {
        responseTime: 150,
        activeConnections: 5,
        memoryUsage: 0.6
      };

      registry.updateServerMetrics(serverId, metrics);
      const server = registry.getServer(serverId);
      expect(server.metrics).toEqual(metrics);
    });

    test('should unregister server', () => {
      const result = registry.unregisterServer(serverId);
      expect(result).toBe(true);

      const server = registry.getServer(serverId);
      expect(server).toBeUndefined();

      const allServers = registry.getAllServers();
      expect(allServers.length).toBe(0);
    });

    test('should return false when unregistering non-existent server', () => {
      const result = registry.unregisterServer('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('Health Checks', () => {
    let serverId;

    beforeEach(() => {
      serverId = registry.registerServer({
        name: 'Test Server',
        url: 'http://localhost:3000',
        capabilities: ['chat']
      });
    });

    test('should perform health check on healthy server', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { status: 'healthy' }
      });

      const result = await registry.performHealthCheck(serverId);
      expect(result).toBe(true);

      const server = registry.getServer(serverId);
      expect(server.status).toBe('healthy');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:3000/health',
        { timeout: 5000 }
      );
    });

    test('should handle health check failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await registry.performHealthCheck(serverId);
      expect(result).toBe(false);

      const server = registry.getServer(serverId);
      expect(server.status).toBe('unhealthy');
    });

    test('should handle health check timeout', async () => {
      mockedAxios.get.mockRejectedValueOnce({ code: 'ECONNABORTED' });

      const result = await registry.performHealthCheck(serverId);
      expect(result).toBe(false);

      const server = registry.getServer(serverId);
      expect(server.status).toBe('unhealthy');
    });

    test('should start and stop health checks', () => {
      const startSpy = jest.spyOn(registry, 'startHealthChecks');
      const stopSpy = jest.spyOn(registry, 'stopHealthChecks');

      registry.startHealthChecks(1000); // 1 second interval for testing
      expect(startSpy).toHaveBeenCalledWith(1000);

      registry.stopHealthChecks();
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('Server Statistics', () => {
    beforeEach(() => {
      // Register multiple servers with different statuses
      const server1Id = registry.registerServer({
        name: 'Server 1',
        url: 'http://localhost:3001',
        capabilities: ['chat']
      });
      registry.updateServerStatus(server1Id, 'healthy');

      const server2Id = registry.registerServer({
        name: 'Server 2',
        url: 'http://localhost:3002',
        capabilities: ['search']
      });
      registry.updateServerStatus(server2Id, 'unhealthy');

      registry.registerServer({
        name: 'Server 3',
        url: 'http://localhost:3003',
        capabilities: ['chat', 'search']
      });
      // Server 3 remains with 'unknown' status
    });

    test('should get server statistics', () => {
      const stats = registry.getStats();

      expect(stats.total).toBe(3);
      expect(stats.healthy).toBe(1);
      expect(stats.unhealthy).toBe(1);
      expect(stats.unknown).toBe(1);
      expect(stats.capabilities).toEqual({
        chat: 2,
        search: 2
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid server data gracefully', () => {
      expect(() => {
        registry.registerServer(null);
      }).toThrow();

      expect(() => {
        registry.registerServer(undefined);
      }).toThrow();

      expect(() => {
        registry.registerServer('invalid');
      }).toThrow();
    });

    test('should handle invalid URLs', () => {
      expect(() => {
        registry.registerServer({
          name: 'Invalid Server',
          url: 'not-a-url'
        });
      }).toThrow();
    });

    test('should handle operations on non-existent servers', () => {
      expect(() => {
        registry.updateServerStatus('non-existent', 'healthy');
      }).not.toThrow();

      expect(() => {
        registry.updateServerMetrics('non-existent', {});
      }).not.toThrow();
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent server registrations', () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve().then(() => {
            return registry.registerServer({
              name: `Server ${i}`,
              url: `http://localhost:300${i}`,
              capabilities: ['test']
            });
          })
        );
      }

      return Promise.all(promises).then(serverIds => {
        expect(serverIds.length).toBe(10);
        expect(new Set(serverIds).size).toBe(10); // All IDs should be unique
        expect(registry.getAllServers().length).toBe(10);
      });
    });

    test('should handle concurrent health checks', async () => {
      const serverIds = [];
      for (let i = 0; i < 5; i++) {
        const serverId = registry.registerServer({
          name: `Server ${i}`,
          url: `http://localhost:300${i}`,
          capabilities: ['test']
        });
        serverIds.push(serverId);
      }

      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: { status: 'healthy' }
      });

      const healthCheckPromises = serverIds.map(id => 
        registry.performHealthCheck(id)
      );

      const results = await Promise.all(healthCheckPromises);
      expect(results.every(result => result === true)).toBe(true);
    });
  });
});