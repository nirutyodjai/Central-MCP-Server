const crypto = require('crypto');
const axios = require('axios');
const logger = require('./logger');

class MCPRegistry {
  constructor() {
    this.servers = new Map(); // serverId -> server info
    this.healthCheckInterval = 30000; // 30 seconds
    this.startHealthCheck();
  }

  // Register a new MCP server
  registerServer(serverInfo) {
    const serverId = crypto.randomBytes(16).toString('hex');
    const server = {
      id: serverId,
      name: serverInfo.name,
      url: serverInfo.url,
      description: serverInfo.description || '',
      capabilities: serverInfo.capabilities || [],
      status: 'unknown',
      lastHealthCheck: null,
      registeredAt: new Date().toISOString(),
      metadata: serverInfo.metadata || {}
    };

    this.servers.set(serverId, server);
    logger.info('MCP Server registered', { serverId, name: server.name, url: server.url });
    
    // Immediate health check
    this.checkServerHealth(serverId);
    
    return serverId;
  }

  // Unregister an MCP server
  unregisterServer(serverId) {
    const server = this.servers.get(serverId);
    if (server) {
      this.servers.delete(serverId);
      logger.info('MCP Server unregistered', { serverId, name: server.name });
      return true;
    }
    return false;
  }

  // Get all registered servers
  getAllServers() {
    return Array.from(this.servers.values());
  }

  // Get server by ID
  getServer(serverId) {
    return this.servers.get(serverId);
  }

  // Update server status manually (used for testing)
  updateServerStatus(serverId, status) {
    const server = this.servers.get(serverId);
    if (server) {
      server.status = status;
      logger.info('Server status updated manually', { 
        serverId, 
        name: server.name, 
        newStatus: status 
      });
      return true;
    }
    return false;
  }

  // Get healthy servers only
  getHealthyServers() {
    return Array.from(this.servers.values()).filter(server => server.status === 'healthy');
  }

  // Get servers by capability
  getServersByCapability(capability) {
    return Array.from(this.servers.values()).filter(server => 
      server.capabilities.includes(capability) && server.status === 'healthy'
    );
  }

  // Health check for a specific server
  async checkServerHealth(serverId) {
    const server = this.servers.get(serverId);
    if (!server) return;

    try {
      const response = await axios.get(`${server.url}/health`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Central-MCP-Server/1.0'
        }
      });
      
      server.status = response.status === 200 ? 'healthy' : 'unhealthy';
      server.lastHealthCheck = new Date().toISOString();
      
      if (response.data && response.data.capabilities) {
        server.capabilities = response.data.capabilities;
      }
      
      logger.debug('Health check completed', { 
        serverId, 
        name: server.name, 
        status: server.status 
      });
    } catch (error) {
      server.status = 'unhealthy';
      server.lastHealthCheck = new Date().toISOString();
      logger.warn('Health check failed', { 
        serverId, 
        name: server.name, 
        error: error.message 
      });
    }
  }

  // Start periodic health checks
  startHealthCheck() {
    setInterval(() => {
      for (const serverId of this.servers.keys()) {
        this.checkServerHealth(serverId);
      }
    }, this.healthCheckInterval);
    
    logger.info('Health check service started', { interval: this.healthCheckInterval });
  }

  // Load balancing - get next available server for a capability
  getNextServer(capability = null) {
    let availableServers;
    
    if (capability) {
      availableServers = this.getServersByCapability(capability);
    } else {
      availableServers = this.getHealthyServers();
    }
    
    if (availableServers.length === 0) {
      return null;
    }
    
    // Simple round-robin load balancing
    const index = Math.floor(Math.random() * availableServers.length);
    return availableServers[index];
  }

  // Update server metadata
  updateServerMetadata(serverId, metadata) {
    const server = this.servers.get(serverId);
    if (server) {
      server.metadata = { ...server.metadata, ...metadata };
      return true;
    }
    return false;
  }

  // Get registry statistics
  getStats() {
    const servers = Array.from(this.servers.values());
    return {
      total: servers.length,
      healthy: servers.filter(s => s.status === 'healthy').length,
      unhealthy: servers.filter(s => s.status === 'unhealthy').length,
      unknown: servers.filter(s => s.status === 'unknown').length,
      capabilities: [...new Set(servers.flatMap(s => s.capabilities))]
    };
  }
}

module.exports = MCPRegistry;