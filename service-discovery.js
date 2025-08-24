const EventEmitter = require('events');
const logger = require('./logger');

class ServiceDiscovery extends EventEmitter {
  constructor(mcpRegistry) {
    super();
    this.registry = mcpRegistry;
    this.serviceMap = new Map(); // capability -> [servers]
    this.subscriptions = new Map(); // clientId -> {capabilities, callback}
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Listen for registry changes
    this.on('serverRegistered', (server) => {
      this.updateServiceMap();
      this.notifySubscribers('serverAdded', server);
    });

    this.on('serverUnregistered', (serverId) => {
      this.updateServiceMap();
      this.notifySubscribers('serverRemoved', { serverId });
    });

    this.on('serverHealthChanged', (server) => {
      this.updateServiceMap();
      this.notifySubscribers('serverHealthChanged', server);
    });
  }

  // Update the service capability map
  updateServiceMap() {
    this.serviceMap.clear();
    const servers = this.registry.getAllServers();
    
    servers.forEach(server => {
      if (server.status === 'healthy') {
        server.capabilities.forEach(capability => {
          if (!this.serviceMap.has(capability)) {
            this.serviceMap.set(capability, []);
          }
          this.serviceMap.get(capability).push(server);
        });
      }
    });

    logger.debug('Service map updated', {
      capabilities: Array.from(this.serviceMap.keys()),
      totalServers: servers.length
    });
  }

  // Discover services by capability
  discoverServices(capability) {
    this.updateServiceMap();
    return this.serviceMap.get(capability) || [];
  }

  // Discover all available capabilities
  discoverCapabilities() {
    this.updateServiceMap();
    return Array.from(this.serviceMap.keys());
  }

  // Subscribe to service discovery events
  subscribe(clientId, capabilities, callback) {
    this.subscriptions.set(clientId, {
      capabilities: Array.isArray(capabilities) ? capabilities : [capabilities],
      callback
    });

    logger.info('Client subscribed to service discovery', {
      clientId,
      capabilities: Array.isArray(capabilities) ? capabilities : [capabilities]
    });

    // Send initial state
    const initialServices = {};
    const caps = Array.isArray(capabilities) ? capabilities : [capabilities];
    caps.forEach(cap => {
      initialServices[cap] = this.discoverServices(cap);
    });

    callback('initialState', initialServices);
  }

  // Unsubscribe from service discovery events
  unsubscribe(clientId) {
    const removed = this.subscriptions.delete(clientId);
    if (removed) {
      logger.info('Client unsubscribed from service discovery', { clientId });
    }
    return removed;
  }

  // Notify subscribers about changes
  notifySubscribers(eventType, data) {
    this.subscriptions.forEach((subscription, clientId) => {
      try {
        // Check if the event is relevant to this subscriber
        let isRelevant = false;
        
        if (eventType === 'serverAdded' || eventType === 'serverHealthChanged') {
          isRelevant = data.capabilities.some(cap => 
            subscription.capabilities.includes(cap)
          );
        } else if (eventType === 'serverRemoved') {
          // For server removal, we notify all subscribers
          isRelevant = true;
        }

        if (isRelevant) {
          subscription.callback(eventType, data);
        }
      } catch (error) {
        logger.error('Error notifying subscriber', {
          clientId,
          eventType,
          error: error.message
        });
      }
    });
  }

  // Find the best server for a capability based on various criteria
  findBestServer(capability, criteria = {}) {
    const servers = this.discoverServices(capability);
    
    if (servers.length === 0) {
      return null;
    }

    // Apply filtering criteria
    let filteredServers = servers;

    // Filter by metadata if specified
    if (criteria.metadata) {
      filteredServers = filteredServers.filter(server => {
        return Object.entries(criteria.metadata).every(([key, value]) => {
          return server.metadata[key] === value;
        });
      });
    }

    // Filter by minimum uptime if specified
    if (criteria.minUptime) {
      const minTime = new Date(Date.now() - criteria.minUptime);
      filteredServers = filteredServers.filter(server => {
        return new Date(server.registeredAt) <= minTime;
      });
    }

    if (filteredServers.length === 0) {
      return null;
    }

    // Apply selection strategy
    switch (criteria.strategy || 'round-robin') {
      case 'random':
        return filteredServers[Math.floor(Math.random() * filteredServers.length)];
      
      case 'least-recent':
        return filteredServers.sort((a, b) => 
          new Date(a.lastHealthCheck || 0) - new Date(b.lastHealthCheck || 0)
        )[0];
      
      case 'most-recent':
        return filteredServers.sort((a, b) => 
          new Date(b.lastHealthCheck || 0) - new Date(a.lastHealthCheck || 0)
        )[0];
      
      case 'round-robin':
      default:
        // Simple round-robin based on current time
        const index = Math.floor(Date.now() / 1000) % filteredServers.length;
        return filteredServers[index];
    }
  }

  // Get service discovery statistics
  getStats() {
    this.updateServiceMap();
    return {
      totalCapabilities: this.serviceMap.size,
      totalSubscribers: this.subscriptions.size,
      capabilityDistribution: Object.fromEntries(
        Array.from(this.serviceMap.entries()).map(([cap, servers]) => [
          cap,
          servers.length
        ])
      ),
      subscribers: Array.from(this.subscriptions.entries()).map(([clientId, sub]) => ({
        clientId,
        capabilities: sub.capabilities
      }))
    };
  }

  // Trigger server registration event
  onServerRegistered(server) {
    this.emit('serverRegistered', server);
  }

  // Trigger server unregistration event
  onServerUnregistered(serverId) {
    this.emit('serverUnregistered', serverId);
  }

  // Trigger server health change event
  onServerHealthChanged(server) {
    this.emit('serverHealthChanged', server);
  }
}

module.exports = ServiceDiscovery;