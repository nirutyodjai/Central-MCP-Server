import WebSocket from 'ws';
// Real-time communication system with WebSocket support
export class WebSocketManager {
  constructor(port = 5202) {
    this.port = port;
    this.wss = null;
    this.clients = new Set();
    this.heartbeatInterval = null;
  }
  // Start WebSocket server
  async start(server) {
    return new Promise((resolve, reject) => {
      try {
        if (server) {
          // Attach to existing HTTP server
          this.wss = new WebSocket.Server({ server });
        } else {
          // Create standalone WebSocket server
          this.wss = new WebSocket.Server({ port: this.port });
        }
        this.wss.on('connection', (ws, request) => {
          console.log(
            `🔗 WebSocket client connected from ${request.socket.remoteAddress}`
          );
          // Add client to set
          this.clients.add(ws);
          // Setup client event handlers
          this.setupClientHandlers(ws);
          // Send welcome message
          this.sendToClient(ws, {
            type: 'welcome',
            message: 'Connected to Fast Coding MCP Server WebSocket',
            timestamp: Date.now(),
          });
        });
        this.wss.on('error', error => {
          console.error('❌ WebSocket server error:', error);
          reject(error);
        });
        this.wss.on('listening', () => {
          console.log(`✅ WebSocket server started on port ${this.port}`);
          resolve();
        });
        // Start heartbeat to keep connections alive
        this.startHeartbeat();
      } catch (error) {
        reject(error);
      }
    });
  }
  // Setup event handlers for individual client
  setupClientHandlers(ws) {
    ws.on('message', data => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(ws, message);
      } catch (error) {
        this.sendToClient(ws, {
          type: 'error',
          message: 'Invalid JSON message',
          timestamp: Date.now(),
        });
      }
    });
    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket client disconnected (code: ${code})`);
      this.clients.delete(ws);
    });
    ws.on('error', error => {
      console.error('❌ WebSocket client error:', error);
      this.clients.delete(ws);
    });
    // Handle ping/pong for connection health
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  }
  // Handle messages from clients
  handleClientMessage(ws, message) {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(ws, message);
        break;
      case 'unsubscribe':
        this.handleUnsubscription(ws, message);
        break;
      case 'request':
        this.handleRequest(ws, message);
        break;
      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
        break;
      default:
        this.sendToClient(ws, {
          type: 'error',
          message: `Unknown message type: ${message.type}`,
          timestamp: Date.now(),
        });
    }
  }
  // Handle subscription requests
  handleSubscription(ws, message) {
    const { channel } = message;
    if (channel) {
      // Subscribe client to channel
      ws.subscriptions = ws.subscriptions || new Set();
      ws.subscriptions.add(channel);
      this.sendToClient(ws, {
        type: 'subscribed',
        channel,
        timestamp: Date.now(),
      });
      console.log(`📡 Client subscribed to channel: ${channel}`);
    }
  }
  // Handle unsubscription requests
  handleUnsubscription(ws, message) {
    const { channel } = message;
    if (channel && ws.subscriptions) {
      ws.subscriptions.delete(channel);
      this.sendToClient(ws, {
        type: 'unsubscribed',
        channel,
        timestamp: Date.now(),
      });
      console.log(`📡 Client unsubscribed from channel: ${channel}`);
    }
  }
  // Handle request messages
  handleRequest(ws, message) {
    const { action, data } = message;
    // Process request based on action
    switch (action) {
      case 'get_stats':
        this.sendToClient(ws, {
          type: 'response',
          action,
          data: this.getServerStats(),
          timestamp: Date.now(),
        });
        break;
      case 'execute_tool':
        this.executeToolForClient(ws, data);
        break;
      default:
        this.sendToClient(ws, {
          type: 'error',
          message: `Unknown action: ${action}`,
          timestamp: Date.now(),
        });
    }
  }
  // Execute tool and send result to client
  async executeToolForClient(ws, data) {
    try {
      const { toolName, args } = data;
      // This would integrate with the MCP server
      const result = {
        tool: toolName,
        success: true,
        result: `Executed ${toolName} with args: ${JSON.stringify(args)}`,
        timestamp: Date.now(),
      };
      this.sendToClient(ws, {
        type: 'tool_result',
        data: result,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.sendToClient(ws, {
        type: 'error',
        message: `Tool execution failed: ${error.message}`,
        timestamp: Date.now(),
      });
    }
  }
  // Send message to specific client
  sendToClient(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
  // Broadcast message to all connected clients
  broadcast(data) {
    const message = JSON.stringify(data);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
  // Broadcast to specific channel subscribers
  broadcastToChannel(channel, data) {
    const message = JSON.stringify({ ...data, channel });
    for (const client of this.clients) {
      if (
        client.readyState === WebSocket.OPEN &&
        client.subscriptions &&
        client.subscriptions.has(channel)
      ) {
        client.send(message);
      }
    }
  }
  // Start heartbeat to detect dead connections
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      for (const client of this.clients) {
        const ws = client;
        if (ws.isAlive === false) {
          this.clients.delete(client);
          client.terminate();
          console.log('💔 Terminated dead WebSocket connection');
        } else {
          ws.isAlive = false;
          client.ping();
        }
      }
    }, 30000); // Check every 30 seconds
  }
  // Get server statistics
  getServerStats() {
    return {
      connectedClients: this.clients.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: Date.now(),
    };
  }
  // Stop WebSocket server
  async stop() {
    return new Promise(resolve => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      if (this.wss) {
        this.wss.close(() => {
          console.log('🛑 WebSocket server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
  // Get connection information
  getInfo() {
    return {
      port: this.port,
      connectedClients: this.clients.size,
      status: this.wss ? 'running' : 'stopped',
      supportedChannels: ['metrics', 'alerts', 'performance', 'logs', 'tools'],
    };
  }
}
// Plugin system for extensibility
export class PluginSystem {
  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
  }
  // Register a plugin
  register(plugin) {
    try {
      if (this.plugins.has(plugin.name)) {
        console.warn(`⚠️ Plugin ${plugin.name} is already registered`);
        return false;
      }
      // Validate plugin structure
      if (!plugin.name || !plugin.version || !plugin.initialize) {
        throw new Error('Invalid plugin structure');
      }
      // Initialize plugin
      plugin.initialize(this);
      // Register plugin hooks
      if (plugin.hooks) {
        for (const [hookName, hookFunction] of Object.entries(plugin.hooks)) {
          this.registerHook(hookName, hookFunction);
        }
      }
      this.plugins.set(plugin.name, plugin);
      console.log(`✅ Plugin ${plugin.name} v${plugin.version} registered`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to register plugin ${plugin.name}:`, error);
      return false;
    }
  }
  // Unregister a plugin
  unregister(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      console.warn(`⚠️ Plugin ${pluginName} not found`);
      return false;
    }
    try {
      // Call plugin cleanup if available
      if (plugin.cleanup) {
        plugin.cleanup();
      }
      // Remove plugin hooks
      if (plugin.hooks) {
        for (const hookName of Object.keys(plugin.hooks)) {
          this.unregisterHook(hookName, plugin.hooks[hookName]);
        }
      }
      this.plugins.delete(pluginName);
      console.log(`🗑️ Plugin ${pluginName} unregistered`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to unregister plugin ${pluginName}:`, error);
      return false;
    }
  }
  // Register hook function
  registerHook(hookName, hookFunction) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    this.hooks.get(hookName).push(hookFunction);
  }
  // Unregister hook function
  unregisterHook(hookName, hookFunction) {
    const hooks = this.hooks.get(hookName);
    if (hooks) {
      const index = hooks.indexOf(hookFunction);
      if (index > -1) {
        hooks.splice(index, 1);
      }
    }
  }
  // Execute all hooks for a given name
  async executeHook(hookName, ...args) {
    const hooks = this.hooks.get(hookName) || [];
    const results = [];
    for (const hook of hooks) {
      try {
        const result = await hook(...args);
        results.push(result);
      } catch (error) {
        console.error(`❌ Hook ${hookName} failed:`, error);
        results.push(null);
      }
    }
    return results;
  }
  // Get all registered plugins
  getPlugins() {
    return Array.from(this.plugins.values()).map(plugin => ({
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      enabled: plugin.enabled !== false,
      hooks: Object.keys(plugin.hooks || {}),
    }));
  }
  // Enable/disable plugin
  setPluginState(pluginName, enabled) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      console.warn(`⚠️ Plugin ${pluginName} not found`);
      return false;
    }
    plugin.enabled = enabled;
    console.log(`🔄 Plugin ${pluginName} ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }
}
// Advanced security features
export class SecurityManager {
  constructor() {
    this.rateLimiter = new Map();
    this.blockedIPs = new Set();
    this.securityRules = [];
  }
  // Rate limiting
  checkRateLimit(clientId, action) {
    const key = `${clientId}:${action}`;
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxRequests = this.getRateLimitForAction(action);
    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, {
        count: 1,
        windowStart: now,
        clientId,
        action,
      });
      return true;
    }
    const data = this.rateLimiter.get(key);
    // Reset window if expired
    if (now - data.windowStart > windowMs) {
      data.count = 1;
      data.windowStart = now;
      return true;
    }
    // Check if limit exceeded
    if (data.count >= maxRequests) {
      console.warn(`🚫 Rate limit exceeded for ${clientId} on ${action}`);
      return false;
    }
    data.count++;
    return true;
  }
  // IP blocking
  blockIP(ip, reason) {
    this.blockedIPs.add(ip);
    console.log(`🚫 Blocked IP ${ip}: ${reason}`);
    // Execute security hooks
    this.executeSecurityHooks('ip_blocked', { ip, reason });
  }
  // Check if IP is blocked
  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }
  // Add security rule
  addSecurityRule(rule) {
    this.securityRules.push(rule);
  }
  // Validate request against security rules
  validateRequest(request) {
    // Check blocked IPs
    if (this.isIPBlocked(request.clientIP)) {
      return {
        allowed: false,
        reason: 'IP is blocked',
        rule: 'ip_block',
      };
    }
    // Check rate limits
    if (!this.checkRateLimit(request.clientIP, request.action)) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded',
        rule: 'rate_limit',
      };
    }
    // Check security rules
    for (const rule of this.securityRules) {
      if (this.matchesRule(request, rule)) {
        if (!rule.allow) {
          return {
            allowed: false,
            reason: rule.description,
            rule: rule.name,
          };
        }
      }
    }
    return { allowed: true };
  }
  getRateLimitForAction(action) {
    const limits = {
      tool_execution: 100,
      code_analysis: 50,
      search: 200,
      file_access: 300,
    };
    return limits[action] || 50;
  }
  matchesRule(request, rule) {
    // Simple pattern matching
    if (rule.pattern && request.path.includes(rule.pattern)) {
      return true;
    }
    if (rule.action && request.action === rule.action) {
      return true;
    }
    return false;
  }
  executeSecurityHooks(event, data) {
    // This would integrate with the plugin system
    console.log(`🔒 Security event: ${event}`, data);
  }
  // Get security statistics
  getSecurityStats() {
    return {
      blockedIPs: this.blockedIPs.size,
      activeRateLimits: this.rateLimiter.size,
      securityRules: this.securityRules.length,
      timestamp: Date.now(),
    };
  }
}
//# sourceMappingURL=AdvancedSystems.js.map
