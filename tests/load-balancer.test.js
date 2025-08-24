const LoadBalancer = require('../load-balancer');

describe('LoadBalancer', () => {
  let loadBalancer;
  let mockServers;

  beforeEach(() => {
    loadBalancer = new LoadBalancer();
    
    // Create mock servers
    mockServers = [
      {
        id: 'server1',
        name: 'Server 1',
        url: 'http://localhost:3001',
        status: 'healthy',
        capabilities: ['chat', 'search'],
        metrics: { responseTime: 100, activeConnections: 2 },
        weight: 1
      },
      {
        id: 'server2',
        name: 'Server 2',
        url: 'http://localhost:3002',
        status: 'healthy',
        capabilities: ['chat'],
        metrics: { responseTime: 150, activeConnections: 1 },
        weight: 2
      },
      {
        id: 'server3',
        name: 'Server 3',
        url: 'http://localhost:3003',
        status: 'unhealthy',
        capabilities: ['search'],
        metrics: { responseTime: 300, activeConnections: 5 },
        weight: 1
      }
    ];
  });

  describe('Round Robin Strategy', () => {
    test('should select servers in round robin order', () => {
      const healthyServers = mockServers.filter(s => s.status === 'healthy');
      
      const server1 = loadBalancer.getNextServer(healthyServers, 'round-robin');
      const server2 = loadBalancer.getNextServer(healthyServers, 'round-robin');
      const server3 = loadBalancer.getNextServer(healthyServers, 'round-robin');
      
      expect(server1.id).toBe('server1');
      expect(server2.id).toBe('server2');
      expect(server3.id).toBe('server1'); // Should wrap around
    });

    test('should handle single server', () => {
      const singleServer = [mockServers[0]];
      
      const server1 = loadBalancer.getNextServer(singleServer, 'round-robin');
      const server2 = loadBalancer.getNextServer(singleServer, 'round-robin');
      
      expect(server1.id).toBe('server1');
      expect(server2.id).toBe('server1');
    });

    test('should return null for empty server list', () => {
      const server = loadBalancer.getNextServer([], 'round-robin');
      expect(server).toBeNull();
    });
  });

  describe('Least Connections Strategy', () => {
    test('should select server with least connections', () => {
      const healthyServers = mockServers.filter(s => s.status === 'healthy');
      
      const server = loadBalancer.getNextServer(healthyServers, 'least-connections');
      expect(server.id).toBe('server2'); // Has 1 connection vs server1's 2
    });

    test('should handle servers with same connection count', () => {
      const servers = [
        { ...mockServers[0], metrics: { activeConnections: 1 } },
        { ...mockServers[1], metrics: { activeConnections: 1 } }
      ];
      
      const server = loadBalancer.getNextServer(servers, 'least-connections');
      expect(['server1', 'server2']).toContain(server.id);
    });

    test('should handle missing metrics', () => {
      const servers = [
        { ...mockServers[0], metrics: undefined },
        { ...mockServers[1] }
      ];
      
      const server = loadBalancer.getNextServer(servers, 'least-connections');
      expect(server.id).toBe('server1'); // Should treat undefined as 0 connections
    });
  });

  describe('Weighted Round Robin Strategy', () => {
    test('should respect server weights', () => {
      const healthyServers = mockServers.filter(s => s.status === 'healthy');
      const selections = [];
      
      // Get 6 selections (should be 2 server1, 4 server2 based on weights 1:2)
      for (let i = 0; i < 6; i++) {
        const server = loadBalancer.getNextServer(healthyServers, 'weighted-round-robin');
        selections.push(server.id);
      }
      
      const server1Count = selections.filter(id => id === 'server1').length;
      const server2Count = selections.filter(id => id === 'server2').length;
      
      expect(server2Count).toBeGreaterThan(server1Count);
    });

    test('should handle servers without weights', () => {
      const servers = [
        { ...mockServers[0], weight: undefined },
        { ...mockServers[1], weight: undefined }
      ];
      
      const server = loadBalancer.getNextServer(servers, 'weighted-round-robin');
      expect(['server1', 'server2']).toContain(server.id);
    });
  });

  describe('Random Strategy', () => {
    test('should select random server', () => {
      const healthyServers = mockServers.filter(s => s.status === 'healthy');
      const selections = new Set();
      
      // Get multiple selections to test randomness
      for (let i = 0; i < 20; i++) {
        const server = loadBalancer.getNextServer(healthyServers, 'random');
        selections.add(server.id);
      }
      
      // Should have selected both servers at some point
      expect(selections.size).toBeGreaterThan(1);
    });

    test('should handle single server', () => {
      const singleServer = [mockServers[0]];
      
      const server = loadBalancer.getNextServer(singleServer, 'random');
      expect(server.id).toBe('server1');
    });
  });

  describe('Health-Based Strategy', () => {
    test('should prefer healthy servers', () => {
      const allServers = mockServers;
      
      const server = loadBalancer.getNextServer(allServers, 'health-based');
      expect(['server1', 'server2']).toContain(server.id);
      expect(server.status).toBe('healthy');
    });

    test('should return null if no healthy servers', () => {
      const unhealthyServers = mockServers.map(s => ({ ...s, status: 'unhealthy' }));
      
      const server = loadBalancer.getNextServer(unhealthyServers, 'health-based');
      expect(server).toBeNull();
    });
  });

  describe('Response Time Strategy', () => {
    test('should select server with best response time', () => {
      const healthyServers = mockServers.filter(s => s.status === 'healthy');
      
      const server = loadBalancer.getNextServer(healthyServers, 'response-time');
      expect(server.id).toBe('server1'); // Has 100ms vs server2's 150ms
    });

    test('should handle missing response time metrics', () => {
      const servers = [
        { ...mockServers[0], metrics: { responseTime: undefined } },
        { ...mockServers[1] }
      ];
      
      const server = loadBalancer.getNextServer(servers, 'response-time');
      expect(server.id).toBe('server2'); // Should prefer server with known response time
    });
  });

  describe('Connection Management', () => {
    test('should track active connections', () => {
      const serverId = 'server1';
      
      loadBalancer.acquireConnection(serverId);
      expect(loadBalancer.getConnectionCount(serverId)).toBe(1);
      
      loadBalancer.acquireConnection(serverId);
      expect(loadBalancer.getConnectionCount(serverId)).toBe(2);
    });

    test('should release connections', () => {
      const serverId = 'server1';
      
      loadBalancer.acquireConnection(serverId);
      loadBalancer.acquireConnection(serverId);
      expect(loadBalancer.getConnectionCount(serverId)).toBe(2);
      
      loadBalancer.releaseConnection(serverId);
      expect(loadBalancer.getConnectionCount(serverId)).toBe(1);
      
      loadBalancer.releaseConnection(serverId);
      expect(loadBalancer.getConnectionCount(serverId)).toBe(0);
    });

    test('should not go below zero connections', () => {
      const serverId = 'server1';
      
      loadBalancer.releaseConnection(serverId);
      expect(loadBalancer.getConnectionCount(serverId)).toBe(0);
    });

    test('should get all connection counts', () => {
      loadBalancer.acquireConnection('server1');
      loadBalancer.acquireConnection('server1');
      loadBalancer.acquireConnection('server2');
      
      const counts = loadBalancer.getAllConnectionCounts();
      expect(counts.server1).toBe(2);
      expect(counts.server2).toBe(1);
    });
  });

  describe('Health Checking', () => {
    test('should perform health check', async () => {
      const mockHealthCheck = jest.fn().mockResolvedValue(true);
      loadBalancer.setHealthCheckFunction(mockHealthCheck);
      
      const result = await loadBalancer.checkServerHealth('server1');
      expect(result).toBe(true);
      expect(mockHealthCheck).toHaveBeenCalledWith('server1');
    });

    test('should handle health check failure', async () => {
      const mockHealthCheck = jest.fn().mockRejectedValue(new Error('Health check failed'));
      loadBalancer.setHealthCheckFunction(mockHealthCheck);
      
      const result = await loadBalancer.checkServerHealth('server1');
      expect(result).toBe(false);
    });

    test('should check all servers health', async () => {
      const mockHealthCheck = jest.fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      
      loadBalancer.setHealthCheckFunction(mockHealthCheck);
      
      const results = await loadBalancer.checkAllServersHealth(mockServers);
      expect(results.server1).toBe(true);
      expect(results.server2).toBe(false);
      expect(results.server3).toBe(true);
    });
  });

  describe('Statistics', () => {
    test('should get load balancer statistics', () => {
      loadBalancer.acquireConnection('server1');
      loadBalancer.acquireConnection('server1');
      loadBalancer.acquireConnection('server2');
      
      const stats = loadBalancer.getStats();
      expect(stats.totalConnections).toBe(3);
      expect(stats.serverConnections.server1).toBe(2);
      expect(stats.serverConnections.server2).toBe(1);
      expect(stats.strategies).toContain('round-robin');
    });

    test('should track strategy usage', () => {
      const healthyServers = mockServers.filter(s => s.status === 'healthy');
      
      loadBalancer.getNextServer(healthyServers, 'round-robin');
      loadBalancer.getNextServer(healthyServers, 'least-connections');
      loadBalancer.getNextServer(healthyServers, 'round-robin');
      
      const stats = loadBalancer.getStats();
      expect(stats.strategyUsage['round-robin']).toBe(2);
      expect(stats.strategyUsage['least-connections']).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid strategy', () => {
      const healthyServers = mockServers.filter(s => s.status === 'healthy');
      
      const server = loadBalancer.getNextServer(healthyServers, 'invalid-strategy');
      expect(server).toBeNull();
    });

    test('should handle null server list', () => {
      const server = loadBalancer.getNextServer(null, 'round-robin');
      expect(server).toBeNull();
    });

    test('should handle undefined server list', () => {
      const server = loadBalancer.getNextServer(undefined, 'round-robin');
      expect(server).toBeNull();
    });

    test('should handle servers without required properties', () => {
      const invalidServers = [
        { id: 'server1' }, // Missing other properties
        { name: 'Server 2' } // Missing id
      ];
      
      const server = loadBalancer.getNextServer(invalidServers, 'round-robin');
      expect(server.id).toBe('server1'); // Should still work with minimal data
    });
  });

  describe('Performance', () => {
    test('should handle large number of servers efficiently', () => {
      const largeServerList = [];
      for (let i = 0; i < 1000; i++) {
        largeServerList.push({
          id: `server${i}`,
          name: `Server ${i}`,
          status: 'healthy',
          metrics: { responseTime: Math.random() * 1000, activeConnections: Math.floor(Math.random() * 10) }
        });
      }
      
      const startTime = Date.now();
      
      // Perform multiple selections
      for (let i = 0; i < 100; i++) {
        loadBalancer.getNextServer(largeServerList, 'round-robin');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    test('should handle rapid connection changes', () => {
      const serverId = 'server1';
      
      // Rapidly acquire and release connections
      for (let i = 0; i < 1000; i++) {
        loadBalancer.acquireConnection(serverId);
        if (i % 2 === 0) {
          loadBalancer.releaseConnection(serverId);
        }
      }
      
      const finalCount = loadBalancer.getConnectionCount(serverId);
      expect(finalCount).toBe(500); // Should be exactly 500
    });
  });

  describe('Integration with Server Selection', () => {
    test('should integrate connection tracking with least-connections strategy', () => {
      const healthyServers = mockServers.filter(s => s.status === 'healthy');
      
      // Acquire connections on server1
      loadBalancer.acquireConnection('server1');
      loadBalancer.acquireConnection('server1');
      
      // Update server metrics to reflect current connections
      healthyServers[0].metrics.activeConnections = loadBalancer.getConnectionCount('server1');
      healthyServers[1].metrics.activeConnections = loadBalancer.getConnectionCount('server2');
      
      const server = loadBalancer.getNextServer(healthyServers, 'least-connections');
      expect(server.id).toBe('server2'); // Should prefer server2 with fewer connections
    });

    test('should work with capability-based filtering', () => {
      const chatServers = mockServers.filter(s => 
        s.status === 'healthy' && s.capabilities.includes('chat')
      );
      
      const server = loadBalancer.getNextServer(chatServers, 'round-robin');
      expect(['server1', 'server2']).toContain(server.id);
      expect(server.capabilities).toContain('chat');
    });
  });
});