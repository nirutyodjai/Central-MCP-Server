const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const MCPRegistry = require('../mcp-registry');
const LoadBalancer = require('../load-balancer');
const MonitoringSystem = require('../monitoring');
const ServiceDiscovery = require('../service-discovery');

// Mock external dependencies
jest.mock('axios');

describe('API Integration Tests', () => {
  let app;
  let server;
  let registry;
  let loadBalancer;
  let monitoring;
  let serviceDiscovery;
  let authToken;

  beforeAll(async () => {
    // Create Express app with all middleware and routes
    app = express();
    
    // Initialize components
    registry = new MCPRegistry();
    loadBalancer = new LoadBalancer();
    monitoring = new MonitoringSystem();
    serviceDiscovery = new ServiceDiscovery(registry);
    
    // Set up middleware
    app.use(express.json());
    app.use(require('cors')());
    app.use(require('helmet')());
    
    // Add monitoring middleware
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        monitoring.recordRequest(req.method, req.path, res.statusCode, duration);
      });
      next();
    });
    
    // Authentication middleware
    const authenticateToken = (req, res, next) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-jwt-secret');
        req.user = decoded;
        next();
      } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
      }
    };
    
    // Routes
    
    // Health check
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
      });
    });
    
    // Authentication
    app.post('/token', (req, res) => {
      const { token } = req.body;
      
      if (token !== (process.env.SERVER_TOKEN || 'test-server-token')) {
        return res.status(401).json({ error: 'Invalid server token' });
      }
      
      const jwtToken = jwt.sign(
        { type: 'server', timestamp: Date.now() },
        process.env.JWT_SECRET || 'test-jwt-secret',
        { expiresIn: '1h' }
      );
      
      res.json({ token: jwtToken, expiresIn: '1h' });
    });
    
    // MCP Server Management
    app.post('/mcp/servers', authenticateToken, (req, res) => {
      try {
        const serverId = registry.registerServer(req.body);
        monitoring.recordServerRegistration(serverId);
        res.status(201).json({ id: serverId, message: 'Server registered successfully' });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });
    
    app.get('/mcp/servers', (req, res) => {
      const servers = registry.getAllServers();
      res.json(servers);
    });
    
    app.get('/mcp/servers/healthy', (req, res) => {
      const servers = registry.getHealthyServers();
      res.json(servers);
    });
    
    app.get('/mcp/servers/capability/:capability', (req, res) => {
      const { capability } = req.params;
      const servers = registry.getServersByCapability(capability);
      res.json(servers);
    });
    
    app.get('/mcp/servers/:id', (req, res) => {
      const { id } = req.params;
      const server = registry.getServer(id);
      
      if (!server) {
        return res.status(404).json({ error: 'Server not found' });
      }
      
      res.json(server);
    });
    
    app.delete('/mcp/servers/:id', authenticateToken, (req, res) => {
      const { id } = req.params;
      const success = registry.unregisterServer(id);
      
      if (!success) {
        return res.status(404).json({ error: 'Server not found' });
      }
      
      monitoring.recordServerUnregistration(id);
      res.json({ message: 'Server unregistered successfully' });
    });
    
    app.post('/mcp/servers/:id/health-check', authenticateToken, async (req, res) => {
      const { id } = req.params;
      
      try {
        const isHealthy = await registry.performHealthCheck(id);
        res.json({ serverId: id, healthy: isHealthy });
      } catch (error) {
        res.status(500).json({ error: 'Health check failed' });
      }
    });
    
    // Load Balancer
    app.get('/mcp/servers/next/:capability', (req, res) => {
      const { capability } = req.params;
      const { strategy = 'round-robin' } = req.query;
      
      const servers = registry.getServersByCapability(capability)
        .filter(server => server.status === 'healthy');
      
      const selectedServer = loadBalancer.getNextServer(servers, strategy);
      
      if (!selectedServer) {
        return res.status(404).json({ error: 'No healthy servers available' });
      }
      
      loadBalancer.acquireConnection(selectedServer.id);
      res.json(selectedServer);
    });
    
    app.post('/loadbalancer/release/:serverId', (req, res) => {
      const { serverId } = req.params;
      loadBalancer.releaseConnection(serverId);
      res.json({ message: 'Connection released' });
    });
    
    // Service Discovery
    app.get('/discovery/services/:capability', (req, res) => {
      const { capability } = req.params;
      const services = serviceDiscovery.findServices(capability);
      res.json(services);
    });
    
    app.get('/discovery/capabilities', (req, res) => {
      const capabilities = serviceDiscovery.getAvailableCapabilities();
      res.json(capabilities);
    });
    
    // Monitoring
    app.get('/metrics', (req, res) => {
      const metrics = monitoring.getMetrics();
      res.json(metrics);
    });
    
    app.get('/metrics/summary', (req, res) => {
      const summary = monitoring.getSummary();
      res.json(summary);
    });
    
    app.post('/metrics/reset', authenticateToken, (req, res) => {
      monitoring.reset();
      res.json({ message: 'Metrics reset successfully' });
    });
    
    // Error handling middleware
    app.use((error, req, res, next) => {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
    
    // Generate auth token for tests
    authToken = jwt.sign(
      { type: 'server', timestamp: Date.now() },
      process.env.JWT_SECRET || 'test-jwt-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  beforeEach(() => {
    // Clear registry and reset components
    registry = new MCPRegistry();
    loadBalancer = new LoadBalancer();
    monitoring = new MonitoringSystem();
    serviceDiscovery = new ServiceDiscovery(registry);
  });

  describe('Health Check', () => {
    test('GET /health should return server status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
      expect(response.body.version).toBeDefined();
    });
  });

  describe('Authentication', () => {
    test('POST /token should return JWT token with valid server token', async () => {
      const response = await request(app)
        .post('/token')
        .send({ token: 'test-server-token' })
        .expect(200);
      
      expect(response.body.token).toBeDefined();
      expect(response.body.expiresIn).toBe('1h');
    });

    test('POST /token should reject invalid server token', async () => {
      const response = await request(app)
        .post('/token')
        .send({ token: 'invalid-token' })
        .expect(401);
      
      expect(response.body.error).toBe('Invalid server token');
    });
  });

  describe('MCP Server Management', () => {
    const validServerData = {
      name: 'Test Server',
      url: 'http://localhost:3000',
      capabilities: ['chat', 'search'],
      description: 'A test server'
    };

    test('POST /mcp/servers should register new server', async () => {
      const response = await request(app)
        .post('/mcp/servers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validServerData)
        .expect(201);
      
      expect(response.body.id).toBeDefined();
      expect(response.body.message).toBe('Server registered successfully');
    });

    test('POST /mcp/servers should require authentication', async () => {
      await request(app)
        .post('/mcp/servers')
        .send(validServerData)
        .expect(401);
    });

    test('POST /mcp/servers should validate server data', async () => {
      const response = await request(app)
        .post('/mcp/servers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Invalid Server' }) // Missing URL
        .expect(400);
      
      expect(response.body.error).toBeDefined();
    });

    test('GET /mcp/servers should return all servers', async () => {
      // Register a server first
      const serverId = registry.registerServer(validServerData);
      
      const response = await request(app)
        .get('/mcp/servers')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].id).toBe(serverId);
    });

    test('GET /mcp/servers/healthy should return only healthy servers', async () => {
      const serverId = registry.registerServer(validServerData);
      registry.updateServerStatus(serverId, 'healthy');
      
      const response = await request(app)
        .get('/mcp/servers/healthy')
        .expect(200);
      
      expect(response.body.length).toBe(1);
      expect(response.body[0].status).toBe('healthy');
    });

    test('GET /mcp/servers/capability/:capability should filter by capability', async () => {
      registry.registerServer(validServerData);
      registry.registerServer({
        name: 'Search Server',
        url: 'http://localhost:3001',
        capabilities: ['search']
      });
      
      const response = await request(app)
        .get('/mcp/servers/capability/chat')
        .expect(200);
      
      expect(response.body.length).toBe(1);
      expect(response.body[0].capabilities).toContain('chat');
    });

    test('GET /mcp/servers/:id should return specific server', async () => {
      const serverId = registry.registerServer(validServerData);
      
      const response = await request(app)
        .get(`/mcp/servers/${serverId}`)
        .expect(200);
      
      expect(response.body.id).toBe(serverId);
      expect(response.body.name).toBe(validServerData.name);
    });

    test('GET /mcp/servers/:id should return 404 for non-existent server', async () => {
      const response = await request(app)
        .get('/mcp/servers/non-existent-id')
        .expect(404);
      
      expect(response.body.error).toBe('Server not found');
    });

    test('DELETE /mcp/servers/:id should unregister server', async () => {
      const serverId = registry.registerServer(validServerData);
      
      const response = await request(app)
        .delete(`/mcp/servers/${serverId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.message).toBe('Server unregistered successfully');
      
      // Verify server is removed
      const server = registry.getServer(serverId);
      expect(server).toBeUndefined();
    });

    test('DELETE /mcp/servers/:id should require authentication', async () => {
      const serverId = registry.registerServer(validServerData);
      
      await request(app)
        .delete(`/mcp/servers/${serverId}`)
        .expect(401);
    });
  });

  describe('Load Balancer', () => {
    beforeEach(() => {
      // Register test servers
      const server1Id = registry.registerServer({
        name: 'Server 1',
        url: 'http://localhost:3001',
        capabilities: ['chat']
      });
      registry.updateServerStatus(server1Id, 'healthy');
      
      const server2Id = registry.registerServer({
        name: 'Server 2',
        url: 'http://localhost:3002',
        capabilities: ['chat']
      });
      registry.updateServerStatus(server2Id, 'healthy');
    });

    test('GET /mcp/servers/next/:capability should return next server', async () => {
      const response = await request(app)
        .get('/mcp/servers/next/chat')
        .expect(200);
      
      expect(response.body.id).toBeDefined();
      expect(response.body.capabilities).toContain('chat');
      expect(response.body.status).toBe('healthy');
    });

    test('GET /mcp/servers/next/:capability should support strategy parameter', async () => {
      const response = await request(app)
        .get('/mcp/servers/next/chat?strategy=least-connections')
        .expect(200);
      
      expect(response.body.id).toBeDefined();
    });

    test('GET /mcp/servers/next/:capability should return 404 when no servers available', async () => {
      const response = await request(app)
        .get('/mcp/servers/next/nonexistent-capability')
        .expect(404);
      
      expect(response.body.error).toBe('No healthy servers available');
    });

    test('POST /loadbalancer/release/:serverId should release connection', async () => {
      const servers = registry.getHealthyServers();
      const serverId = servers[0].id;
      
      loadBalancer.acquireConnection(serverId);
      expect(loadBalancer.getConnectionCount(serverId)).toBe(1);
      
      const response = await request(app)
        .post(`/loadbalancer/release/${serverId}`)
        .expect(200);
      
      expect(response.body.message).toBe('Connection released');
      expect(loadBalancer.getConnectionCount(serverId)).toBe(0);
    });
  });

  describe('Service Discovery', () => {
    beforeEach(() => {
      registry.registerServer({
        name: 'Chat Server',
        url: 'http://localhost:3001',
        capabilities: ['chat']
      });
      
      registry.registerServer({
        name: 'Search Server',
        url: 'http://localhost:3002',
        capabilities: ['search', 'analysis']
      });
    });

    test('GET /discovery/services/:capability should return services', async () => {
      const response = await request(app)
        .get('/discovery/services/chat')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('GET /discovery/capabilities should return all capabilities', async () => {
      const response = await request(app)
        .get('/discovery/capabilities')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toContain('chat');
      expect(response.body).toContain('search');
      expect(response.body).toContain('analysis');
    });
  });

  describe('Monitoring', () => {
    test('GET /metrics should return metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);
      
      expect(response.body.requests).toBeDefined();
      expect(response.body.servers).toBeDefined();
      expect(response.body.system).toBeDefined();
    });

    test('GET /metrics/summary should return summary', async () => {
      const response = await request(app)
        .get('/metrics/summary')
        .expect(200);
      
      expect(response.body.totalRequests).toBeDefined();
      expect(response.body.averageResponseTime).toBeDefined();
      expect(response.body.errorRate).toBeDefined();
    });

    test('POST /metrics/reset should reset metrics', async () => {
      const response = await request(app)
        .post('/metrics/reset')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.message).toBe('Metrics reset successfully');
    });

    test('POST /metrics/reset should require authentication', async () => {
      await request(app)
        .post('/metrics/reset')
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/mcp/servers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    test('should handle missing Content-Type', async () => {
      const response = await request(app)
        .post('/mcp/servers')
        .set('Authorization', `Bearer ${authToken}`)
        .send('some data')
        .expect(400);
    });

    test('should return 404 for non-existent routes', async () => {
      await request(app)
        .get('/non-existent-route')
        .expect(404);
    });
  });

  describe('Rate Limiting', () => {
    test('should handle multiple concurrent requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/health')
            .expect(200)
        );
      }
      
      const responses = await Promise.all(promises);
      expect(responses.length).toBe(10);
      responses.forEach(response => {
        expect(response.body.status).toBe('healthy');
      });
    });
  });

  describe('CORS', () => {
    test('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should handle preflight requests', async () => {
      await request(app)
        .options('/mcp/servers')
        .expect(204);
    });
  });
});