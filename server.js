const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const crypto = require("crypto");
const path = require("path");
const MCPRegistry = require('./mcp-registry');
const ServiceDiscovery = require('./service-discovery');
const LoadBalancer = require('./load-balancer');
const MonitoringSystem = require('./monitoring');
const {
  createMonitoringMiddleware,
  createErrorTrackingMiddleware,
  createRequestLoggingMiddleware,
  createRateLimitingMiddleware,
  createSecurityHeadersMiddleware,
  createHealthCheckMiddleware
} = require('./middleware/monitoring');
const app = express();
const port = process.env.PORT || 5050;
const logger = require("./logger");

// Security and monitoring middleware
app.use(helmet());
app.use(cors());
app.use(createSecurityHeadersMiddleware());
app.use(createHealthCheckMiddleware(monitoringSystem, mcpRegistry, loadBalancer));
app.use(createRequestLoggingMiddleware());
app.use(createMonitoringMiddleware(monitoringSystem));
app.use(createRateLimitingMiddleware(monitoringSystem, {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000 // max 1000 requests per window per IP
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files for dashboard
app.use('/dashboard', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// Request logging with Morgan
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// Error tracking middleware (should be after routes)
app.use(createErrorTrackingMiddleware(monitoringSystem));

let sharedContext = {};
let registeredClients = {}; // In-memory store for registered clients
const mcpRegistry = new MCPRegistry(); // MCP servers registry
const serviceDiscovery = new ServiceDiscovery(mcpRegistry); // Service discovery
const loadBalancer = new LoadBalancer(mcpRegistry); // Load balancer
const monitoringSystem = new MonitoringSystem(); // Monitoring system

// PID file for process management
const PID_FILE = path.join(__dirname, "server.pid");

// Server token used to protect write/secret endpoints. Can be set via env or in local config file.
// Use a reloadable variable so the server can recover if the config was fixed while running.
let SERVER_TOKEN = process.env.CENTRAL_MCP_SERVER_TOKEN || null;

// JWT secret for signing short-lived access tokens (reloadable)
let JWT_SECRET = process.env.CENTRAL_MCP_JWT_SECRET || null;
function reloadJwtSecret() {
  if (process.env.CENTRAL_MCP_JWT_SECRET) {
    JWT_SECRET = process.env.CENTRAL_MCP_JWT_SECRET;
    try {
      fs.appendFileSync(
        path.join(__dirname, "auth-debug.log"),
        `reloadJwtSecret: loaded from ENV\n`
      );
    } catch {
      // ignore
    }
    return JWT_SECRET;
  }
  try {
    const workspaceCfg = path.join(__dirname, "central-mcp-config.json");
    const cfgPath = fs.existsSync("C:/central-mcp-config.json")
      ? "C:/central-mcp-config.json"
      : workspaceCfg;
    const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
    JWT_SECRET = cfg.centralMcpJwtSecret || "dev-jwt-secret";
    try {
      fs.appendFileSync(
        path.join(__dirname, "auth-debug.log"),
        `reloadJwtSecret: secret present=${!!JWT_SECRET}\n`
      );
    } catch {
      // ignore
    }
  } catch (e) {
    try {
      fs.appendFileSync(
        path.join(__dirname, "auth-debug.log"),
        `reloadJwtSecret: error ${e && e.message}\n`
      );
    } catch {
      // ignore
    }
    JWT_SECRET = "dev-jwt-secret";
  }
  return JWT_SECRET;
}

// Optional Vault configuration (KV v2)
const VAULT_ADDR = process.env.VAULT_ADDR || null;
const VAULT_TOKEN = process.env.VAULT_TOKEN || null;
const VAULT_MOUNT = process.env.VAULT_MOUNT || "secret";
const vaultEnabled = !!(VAULT_ADDR && VAULT_TOKEN);

async function getSecretFromVault(name) {
  if (!vaultEnabled) return null;
  try {
    const base = VAULT_ADDR.replace(/\/$/, "");
    const url = `${base}/v1/${VAULT_MOUNT}/data/${encodeURIComponent(name)}`;
    const resp = await axios.get(url, {
      headers: { "X-Vault-Token": VAULT_TOKEN },
      timeout: 5000,
    });
    if (resp.data && resp.data.data && resp.data.data.data) {
      const data = resp.data.data.data;
      if (data.value) return data.value;
      const keys = Object.keys(data);
      if (keys.length) return data[keys[0]];
    }
  } catch (e) {
    logger.error("Vault read failed for", name, { error: e.message || e });
  }
  return null;
}

// Endpoint for clients to register and get a unique token
app.post("/register", (req, res) => {
  const clientName = req.body.clientName;
  if (!clientName) {
    return res.status(400).json({ error: "clientName is required" });
  }

  const clientToken = crypto.randomBytes(32).toString("hex");
  const clientId = crypto.randomBytes(16).toString("hex");

  registeredClients[clientToken] = {
    id: clientId,
    name: clientName,
    registeredAt: new Date().toISOString(),
  };

  logger.info("Client registered", { clientName, clientId });

  res.status(201).json({
    clientId,
    clientToken,
    message: `Client '${clientName}' registered successfully.`,
  });
});

// Endpoint for clients to unregister
app.post("/unregister", (req, res) => {
  const clientToken = req.body.clientToken;
  if (!clientToken) {
    return res.status(400).json({ error: "clientToken is required" });
  }

  if (registeredClients[clientToken]) {
    const client = registeredClients[clientToken];
    delete registeredClients[clientToken];
    logger.info("Client unregistered", {
      clientName: client.name,
      clientId: client.id,
    });
    res.json({ message: `Client '${client.name}' unregistered successfully.` });
  } else {
    res.status(404).json({ error: "Client not found or token is invalid." });
  }
});

function requireAuth(req, res, next) {
  // Read token from env or file on every request to avoid stale in-memory state
  reloadJwtSecret();
  let cfgToken = process.env.CENTRAL_MCP_SERVER_TOKEN || null;
  try {
    const workspaceCfg = path.join(__dirname, "central-mcp-config.json");
    const cfgPathLocal = fs.existsSync("C:/central-mcp-config.json")
      ? "C:/central-mcp-config.json"
      : workspaceCfg;
    logger.info("requireAuth: checking config", {
      path: cfgPathLocal,
      exists: fs.existsSync(cfgPathLocal),
    });
    const cfg = JSON.parse(fs.readFileSync(cfgPathLocal, "utf8"));
    logger.info("requireAuth: config keys", { keys: Object.keys(cfg) });
    logger.info("requireAuth: server token present", {
      present: !!cfg.centralMcpServerToken,
    });
    cfgToken = cfg.centralMcpServerToken || cfgToken;
  } catch {
    // ignore and fall back to env
  }
  if (!cfgToken)
    return res.status(503).json({ error: "Server token not configured" });
  const auth = req.headers["authorization"];
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ error: "Missing token" });
  const token = auth.slice(7);

  // Check against the static server token first
  if (token === cfgToken) {
    return next();
  }

  // Check against dynamically registered client tokens
  if (registeredClients[token]) {
    req.client = registeredClients[token]; // Attach client info to the request
    return next();
  }

  // Finally, try to verify as a JWT
  try {
    const payload = jwt.verify(token, JWT_SECRET || "dev-jwt-secret");
    req.jwt = payload;
    return next();
  } catch {
    return res.status(403).json({ error: "Forbidden" });
  }
}

// Issue short-lived JWTs when client presents the server token
app.post("/token", (req, res) => {
  // Reload secret and read current server token from env or config on-demand
  reloadJwtSecret();
  let currentToken = process.env.CENTRAL_MCP_SERVER_TOKEN || null;
  try {
    const workspaceCfg = path.join(__dirname, "central-mcp-config.json");
    const cfgPathLocal = fs.existsSync("C:/central-mcp-config.json")
      ? "C:/central-mcp-config.json"
      : workspaceCfg;
    currentToken = cfg.centralMcpServerToken || currentToken;
  } catch {
    // ignore
  }
  const auth = req.headers["authorization"];
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ error: "Missing token" });
  const token = auth.slice(7);
  if (!currentToken)
    return res.status(503).json({ error: "Server token not configured" });
  if (token !== currentToken)
    return res.status(403).json({ error: "Forbidden" });

  const accessToken = jwt.sign(
    { iss: "central-mcp" },
    JWT_SECRET || "dev-jwt-secret",
    {
      expiresIn: "15m",
    }
  );
  res.json({
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 900,
  });
});

app.get("/context", (req, res) => {
  res.json(sharedContext);
});

// Lightweight health endpoint (no secrets)
app.get("/health", (req, res) => {
  try {
    // reload token presence
    const tokenPresent = !!(
      process.env.CENTRAL_MCP_SERVER_TOKEN ||
      (() => {
        try {
          const workspaceCfg = path.join(__dirname, "central-mcp-config.json");
          const cfgPathLocal = fs.existsSync("C:/central-mcp-config.json")
            ? "C:/central-mcp-config.json"
            : workspaceCfg;
          const cfg = JSON.parse(fs.readFileSync(cfgPathLocal, "utf8"));
          return cfg.centralMcpServerToken;
        } catch {
          return null;
        }
      })()
    );
    res.json({
      status: "ok",
      uptime: process.uptime(),
      tokenConfigured: !!tokenPresent,
      vaultEnabled: !!(VAULT_ADDR && VAULT_TOKEN),
    });
  } catch (e) {
    res.status(500).json({ status: "error", details: e && e.message });
  }
});

// Protected: only clients with correct token can update context
app.post("/context", requireAuth, (req, res) => {
  sharedContext = { ...sharedContext, ...req.body };
  res.json({ status: "ok", sharedContext });
});

// Protected secrets endpoint: returns a named secret from local config (or 404)
app.get("/secrets/:name", requireAuth, async (req, res) => {
  try {
    const workspaceCfg = path.join(__dirname, "central-mcp-config.json");
    const cfgPathLocal = fs.existsSync("C:/central-mcp-config.json")
      ? "C:/central-mcp-config.json"
      : workspaceCfg;
    const cfg = JSON.parse(fs.readFileSync(cfgPathLocal, "utf8"));
    const name = req.params.name;
    // support cfg.secrets.{name} or top-level key
    if (
      cfg.secrets &&
      Object.prototype.hasOwnProperty.call(cfg.secrets, name)
    ) {
      return res.json({ name, value: cfg.secrets[name] });
    }
    if (Object.prototype.hasOwnProperty.call(cfg, name))
      return res.json({ name, value: cfg[name] });
    // try Vault if available
    const v = await getSecretFromVault(name);
    if (v) return res.json({ name, value: v, source: "vault" });
    return res.status(404).json({ error: "Not found" });
  } catch (e) {
    return res
      .status(500)
      .json({ error: "Failed to read config", details: e.message });
  }
});

app.get("/", (req, res) => {
  res.send("Central MCP Server is running.");
});

// Dashboard route
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Status endpoint: returns runtime info useful for monitoring
app.get("/status", (req, res) => {
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const loadBalancerStats = loadBalancer.getStats();
    
    const info = {
      pid: process.pid,
      status: "running",
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      node: process.version,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      startTime: new Date(
        Date.now() - Math.floor(process.uptime() * 1000)
      ).toISOString(),
      configPath: fs.existsSync(path.join(__dirname, "central-mcp-config.json"))
        ? path.join(__dirname, "central-mcp-config.json")
        : fs.existsSync("C:/central-mcp-config.json")
        ? "C:/central-mcp-config.json"
        : null,
      mcpServers: {
        total: mcpRegistry.getAllServers().length,
        healthy: mcpRegistry.getHealthyServers().length,
        unhealthy: loadBalancerStats.unhealthyServers || 0,
        stats: mcpRegistry.getStats()
      },
      loadBalancer: {
        healthCheckInterval: loadBalancerStats.healthCheckInterval,
        totalConnections: Object.values(loadBalancerStats.connectionCounts || {}).reduce((sum, count) => sum + count, 0),
        strategies: loadBalancerStats.strategies || []
      },
      serviceDiscovery: {
        capabilities: serviceDiscovery.discoverCapabilities().length
      },
      timestamp: new Date().toISOString()
    };
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: "failed", details: e.message });
  }
});

// MCP Server Management Endpoints

// Register a new MCP server
app.post("/mcp/servers", requireAuth, (req, res) => {
  try {
    const { name, url, description, capabilities, metadata } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ error: "name and url are required" });
    }
    
    const serverId = mcpRegistry.registerServer({
      name,
      url,
      description,
      capabilities: capabilities || [],
      metadata: metadata || {}
    });
    
    // Notify service discovery
    const server = mcpRegistry.getServer(serverId);
    serviceDiscovery.onServerRegistered(server);
    
    res.status(201).json({
      serverId,
      message: `MCP Server '${name}' registered successfully`
    });
  } catch (error) {
    logger.error('Failed to register MCP server', { error: error.message });
    res.status(500).json({ error: "Failed to register server", details: error.message });
  }
});

// Get all MCP servers
app.get("/mcp/servers", (req, res) => {
  try {
    const servers = mcpRegistry.getAllServers();
    res.json({ servers, count: servers.length });
  } catch (error) {
    logger.error('Failed to get MCP servers', { error: error.message });
    res.status(500).json({ error: "Failed to get servers", details: error.message });
  }
});

// Get a specific MCP server
app.get("/mcp/servers/:serverId", (req, res) => {
  try {
    const server = mcpRegistry.getServer(req.params.serverId);
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }
    res.json(server);
  } catch (error) {
    logger.error('Failed to get MCP server', { error: error.message });
    res.status(500).json({ error: "Failed to get server", details: error.message });
  }
});

// Unregister an MCP server
app.delete("/mcp/servers/:serverId", requireAuth, (req, res) => {
  try {
    const serverId = req.params.serverId;
    const success = mcpRegistry.unregisterServer(serverId);
    if (!success) {
      return res.status(404).json({ error: "Server not found" });
    }
    
    // Notify service discovery
    serviceDiscovery.onServerUnregistered(serverId);
    
    res.json({ message: "Server unregistered successfully" });
  } catch (error) {
    logger.error('Failed to unregister MCP server', { error: error.message });
    res.status(500).json({ error: "Failed to unregister server", details: error.message });
  }
});

// Get healthy MCP servers
app.get("/mcp/servers/healthy", (req, res) => {
  try {
    const servers = mcpRegistry.getHealthyServers();
    res.json({ servers, count: servers.length });
  } catch (error) {
    logger.error('Failed to get healthy MCP servers', { error: error.message });
    res.status(500).json({ error: "Failed to get healthy servers", details: error.message });
  }
});

// Get servers by capability
app.get("/mcp/servers/capability/:capability", (req, res) => {
  try {
    const servers = mcpRegistry.getServersByCapability(req.params.capability);
    res.json({ servers, count: servers.length, capability: req.params.capability });
  } catch (error) {
    logger.error('Failed to get servers by capability', { error: error.message });
    res.status(500).json({ error: "Failed to get servers by capability", details: error.message });
  }
});

// Trigger health check for a specific server
app.post("/mcp/servers/:serverId/health-check", requireAuth, async (req, res) => {
  try {
    const server = mcpRegistry.getServer(req.params.serverId);
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }
    
    await mcpRegistry.checkServerHealth(req.params.serverId);
    const updatedServer = mcpRegistry.getServer(req.params.serverId);
    
    res.json({ 
      message: "Health check completed", 
      server: updatedServer 
    });
  } catch (error) {
    logger.error('Failed to perform health check', { error: error.message });
    res.status(500).json({ error: "Failed to perform health check", details: error.message });
  }
});

// Get next available server (load balancing)
app.get("/mcp/servers/next/:capability?", (req, res) => {
  try {
    const capability = req.params.capability;
    const server = mcpRegistry.getNextServer(capability);
    
    if (!server) {
      return res.status(404).json({ 
        error: "No available servers", 
        capability: capability || "any" 
      });
    }
    
    res.json({ server, capability: capability || "any" });
  } catch (error) {
    logger.error('Failed to get next server', { error: error.message });
    res.status(500).json({ error: "Failed to get next server", details: error.message });
  }
});

// Update server metadata
app.patch("/mcp/servers/:serverId/metadata", requireAuth, (req, res) => {
  try {
    const success = mcpRegistry.updateServerMetadata(req.params.serverId, req.body);
    if (!success) {
      return res.status(404).json({ error: "Server not found" });
    }
    
    const updatedServer = mcpRegistry.getServer(req.params.serverId);
    res.json({ message: "Metadata updated successfully", server: updatedServer });
  } catch (error) {
    logger.error('Failed to update server metadata', { error: error.message });
    res.status(500).json({ error: "Failed to update metadata", details: error.message });
  }
});

// Service Discovery Endpoints

// Discover services by capability
app.get("/discovery/services/:capability", (req, res) => {
  try {
    const capability = req.params.capability;
    const services = serviceDiscovery.discoverServices(capability);
    res.json({ 
      capability, 
      services, 
      count: services.length 
    });
  } catch (error) {
    logger.error('Failed to discover services', { error: error.message });
    res.status(500).json({ error: "Failed to discover services", details: error.message });
  }
});

// Discover all available capabilities
app.get("/discovery/capabilities", (req, res) => {
  try {
    const capabilities = serviceDiscovery.discoverCapabilities();
    res.json({ 
      capabilities, 
      count: capabilities.length 
    });
  } catch (error) {
    logger.error('Failed to discover capabilities', { error: error.message });
    res.status(500).json({ error: "Failed to discover capabilities", details: error.message });
  }
});

// Find best server for a capability
app.post("/discovery/best-server/:capability", (req, res) => {
  try {
    const capability = req.params.capability;
    const criteria = req.body || {};
    const server = serviceDiscovery.findBestServer(capability, criteria);
    
    if (!server) {
      return res.status(404).json({ 
        error: "No suitable server found", 
        capability,
        criteria 
      });
    }
    
    res.json({ 
      capability, 
      server, 
      criteria 
    });
  } catch (error) {
    logger.error('Failed to find best server', { error: error.message });
    res.status(500).json({ error: "Failed to find best server", details: error.message });
  }
});

// Get service discovery statistics
app.get("/discovery/stats", (req, res) => {
  try {
    const stats = serviceDiscovery.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get discovery stats', { error: error.message });
    res.status(500).json({ error: "Failed to get discovery stats", details: error.message });
  }
});

// Subscribe to service discovery events (WebSocket would be better, but using polling for now)
app.post("/discovery/subscribe", requireAuth, (req, res) => {
  try {
    const { clientId, capabilities } = req.body;
    
    if (!clientId || !capabilities) {
      return res.status(400).json({ error: "clientId and capabilities are required" });
    }
    
    // Store subscription info (in a real implementation, this would use WebSockets)
    serviceDiscovery.subscribe(clientId, capabilities, (eventType, data) => {
      logger.info('Service discovery event', { clientId, eventType, data });
      // In a real implementation, this would send the event via WebSocket
    });
    
    res.json({ 
      message: "Subscribed to service discovery events", 
      clientId, 
      capabilities 
    });
  } catch (error) {
    logger.error('Failed to subscribe to discovery events', { error: error.message });
    res.status(500).json({ error: "Failed to subscribe", details: error.message });
  }
});

// Unsubscribe from service discovery events
app.delete("/discovery/subscribe/:clientId", requireAuth, (req, res) => {
  try {
    const clientId = req.params.clientId;
    const success = serviceDiscovery.unsubscribe(clientId);
    
    if (!success) {
      return res.status(404).json({ error: "Subscription not found" });
    }
    
    res.json({ message: "Unsubscribed successfully", clientId });
  } catch (error) {
    logger.error('Failed to unsubscribe from discovery events', { error: error.message });
    res.status(500).json({ error: "Failed to unsubscribe", details: error.message });
  }
});

// Load Balancing Endpoints

// Get next server using load balancing
app.post("/loadbalancer/next/:capability", (req, res) => {
  try {
    const capability = req.params.capability;
    const { strategy = 'round-robin', options = {} } = req.body;
    
    const server = loadBalancer.getNextServer(capability, strategy, options);
    
    if (!server) {
      return res.status(404).json({ 
        error: "No available server found", 
        capability,
        strategy 
      });
    }
    
    // Track connection
    loadBalancer.trackConnection(server.id, true);
    
    res.json({ 
      capability, 
      strategy, 
      server,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get next server', { error: error.message });
    res.status(500).json({ error: "Failed to get next server", details: error.message });
  }
});

// Release connection from server
app.post("/loadbalancer/release/:serverId", (req, res) => {
  try {
    const serverId = req.params.serverId;
    loadBalancer.trackConnection(serverId, false);
    
    res.json({ 
      message: "Connection released", 
      serverId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to release connection', { error: error.message });
    res.status(500).json({ error: "Failed to release connection", details: error.message });
  }
});

// Get load balancer statistics
app.get("/loadbalancer/stats", (req, res) => {
  try {
    const stats = loadBalancer.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get load balancer stats', { error: error.message });
    res.status(500).json({ error: "Failed to get load balancer stats", details: error.message });
  }
});

// Trigger manual health check for all servers
app.post("/loadbalancer/health-check", requireAuth, (req, res) => {
  try {
    // Trigger health check asynchronously
    loadBalancer.performHealthChecks().then(() => {
      logger.info('Manual health check completed');
    }).catch(error => {
      logger.error('Manual health check failed', { error: error.message });
    });
    
    res.json({ 
      message: "Health check triggered", 
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to trigger health check', { error: error.message });
    res.status(500).json({ error: "Failed to trigger health check", details: error.message });
  }
});

// Update health check configuration
app.patch("/loadbalancer/health-config", requireAuth, (req, res) => {
  try {
    const config = req.body;
    loadBalancer.updateHealthCheckConfig(config);
    
    res.json({ 
      message: "Health check configuration updated", 
      config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to update health check config', { error: error.message });
    res.status(500).json({ error: "Failed to update health check config", details: error.message });
  }
});

// Get available load balancing strategies
app.get("/loadbalancer/strategies", (req, res) => {
  try {
    const strategies = {
      'round-robin': 'Distributes requests evenly across servers',
      'least-connections': 'Routes to server with fewest active connections',
      'weighted-round-robin': 'Round-robin with server weights',
      'random': 'Randomly selects a server',
      'health-based': 'Prioritizes healthiest servers',
      'response-time': 'Routes to fastest responding servers'
    };
    
    res.json({ strategies });
  } catch (error) {
    logger.error('Failed to get strategies', { error: error.message });
    res.status(500).json({ error: "Failed to get strategies", details: error.message });
  }
});

// Monitoring and Metrics Endpoints

// Get comprehensive metrics
app.get("/metrics", (req, res) => {
  try {
    const metrics = monitoringSystem.getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get metrics', { error: error.message });
    res.status(500).json({ error: "Failed to get metrics", details: error.message });
  }
});

// Get metrics summary
app.get("/metrics/summary", (req, res) => {
  try {
    const summary = monitoringSystem.getMetricsSummary();
    res.json(summary);
  } catch (error) {
    logger.error('Failed to get metrics summary', { error: error.message });
    res.status(500).json({ error: "Failed to get metrics summary", details: error.message });
  }
});

// Get active alerts
app.get("/metrics/alerts", (req, res) => {
  try {
    const metrics = monitoringSystem.getMetrics();
    res.json({
      active: metrics.alerts.active,
      thresholds: metrics.alerts.thresholds,
      count: metrics.alerts.active.length
    });
  } catch (error) {
    logger.error('Failed to get alerts', { error: error.message });
    res.status(500).json({ error: "Failed to get alerts", details: error.message });
  }
});

// Update alert thresholds
app.patch("/metrics/alerts/thresholds", requireAuth, (req, res) => {
  try {
    const thresholds = req.body;
    monitoringSystem.updateAlertThresholds(thresholds);
    
    res.json({
      message: "Alert thresholds updated successfully",
      thresholds: monitoringSystem.getMetrics().alerts.thresholds,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to update alert thresholds', { error: error.message });
    res.status(500).json({ error: "Failed to update alert thresholds", details: error.message });
  }
});

// Reset metrics
app.post("/metrics/reset", requireAuth, (req, res) => {
  try {
    monitoringSystem.resetMetrics();
    
    res.json({
      message: "Metrics reset successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to reset metrics', { error: error.message });
    res.status(500).json({ error: "Failed to reset metrics", details: error.message });
  }
});

// Get response time history
app.get("/metrics/response-time", (req, res) => {
  try {
    const metrics = monitoringSystem.getMetrics();
    const limit = parseInt(req.query.limit) || 100;
    
    res.json({
      history: metrics.responseTimeHistory.slice(-limit),
      average: metrics.requests.avgResponseTime,
      count: metrics.responseTimeHistory.length
    });
  } catch (error) {
    logger.error('Failed to get response time history', { error: error.message });
    res.status(500).json({ error: "Failed to get response time history", details: error.message });
  }
});

// Get system metrics
app.get("/metrics/system", (req, res) => {
  try {
    const metrics = monitoringSystem.getMetrics();
    res.json({
      system: metrics.system,
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    });
  } catch (error) {
    logger.error('Failed to get system metrics', { error: error.message });
    res.status(500).json({ error: "Failed to get system metrics", details: error.message });
  }
});

// Event listeners for monitoring integration

// Load balancer event listeners
loadBalancer.on('serverRecovered', (server) => {
  logger.info('Server recovered and back online', { serverId: server.id, url: server.url });
  monitoringSystem.emit('serverRecovered', { serverId: server.id, timestamp: Date.now() });
});

loadBalancer.on('serverUnhealthy', (server, error) => {
  logger.warn('Server marked as unhealthy', { 
    serverId: server.id, 
    url: server.url, 
    error: error.message 
  });
  monitoringSystem.emit('serverUnhealthy', { serverId: server.id, error: error.message, timestamp: Date.now() });
});

// Monitoring system event listeners
monitoringSystem.on('alertTriggered', (alert) => {
  logger.warn('Monitoring alert triggered', alert);
  // In a production environment, you might want to send notifications here
  // e.g., send email, Slack message, or webhook
});

monitoringSystem.on('alertResolved', (alert) => {
  logger.info('Monitoring alert resolved', alert);
});

monitoringSystem.on('rateLimitExceeded', (data) => {
  logger.warn('Rate limit exceeded', data);
});

// Track monitoring events for various operations
const originalRegisterServer = mcpRegistry.registerServer.bind(mcpRegistry);
mcpRegistry.registerServer = function(serverInfo) {
  const result = originalRegisterServer(serverInfo);
  if (result) {
    monitoringSystem.trackServerRegistration(result.id, serverInfo);
  }
  return result;
};

const originalUnregisterServer = mcpRegistry.unregisterServer.bind(mcpRegistry);
mcpRegistry.unregisterServer = function(serverId) {
  const result = originalUnregisterServer(serverId);
  if (result) {
    monitoringSystem.trackServerUnregistration(serverId);
  }
  return result;
};

// Track load balancer requests
const originalGetNextServer = loadBalancer.getNextServer.bind(loadBalancer);
loadBalancer.getNextServer = function(capability, strategy, options) {
  const server = originalGetNextServer(capability, strategy, options);
  if (server) {
    monitoringSystem.trackLoadBalancerRequest(capability, strategy, server.id);
  }
  return server;
};

// Track connection releases
const originalTrackConnection = loadBalancer.trackConnection.bind(loadBalancer);
loadBalancer.trackConnection = function(serverId, increment) {
  const result = originalTrackConnection(serverId, increment);
  if (!increment) { // Connection release
    monitoringSystem.trackConnectionRelease(serverId);
  }
  return result;
};

// Track service discovery queries
const originalDiscoverServices = serviceDiscovery.discoverServices.bind(serviceDiscovery);
serviceDiscovery.discoverServices = function(capability) {
  const services = originalDiscoverServices(capability);
  monitoringSystem.trackServiceDiscoveryQuery(capability, services.length);
  return services;
};

// Track service discovery subscriptions
const originalSubscribe = serviceDiscovery.subscribe.bind(serviceDiscovery);
serviceDiscovery.subscribe = function(clientId, capabilities, callback) {
  const result = originalSubscribe(clientId, capabilities, callback);
  monitoringSystem.trackServiceDiscoverySubscription(clientId, capabilities);
  return result;
};

const originalUnsubscribe = serviceDiscovery.unsubscribe.bind(serviceDiscovery);
serviceDiscovery.unsubscribe = function(clientId) {
  const result = originalUnsubscribe(clientId);
  if (result) {
    monitoringSystem.trackServiceDiscoveryUnsubscription(clientId);
  }
  return result;
};

// Track health checks
const originalCheckServerHealth = loadBalancer.checkServerHealth.bind(loadBalancer);
loadBalancer.checkServerHealth = async function(server) {
  const result = await originalCheckServerHealth(server);
  monitoringSystem.trackHealthCheck(server.id, result.healthy, result.responseTime);
  
  // Check for unhealthy servers alert
  const allServers = mcpRegistry.getAllServers();
  const unhealthyCount = allServers.filter(s => s.status !== 'healthy').length;
  monitoringSystem.checkUnhealthyServersAlert(allServers.length, unhealthyCount);
  
  return result;
};

app.listen(port, () => {
  console.log(`Central MCP Server listening at http://localhost:${port}`);
  try {
    // show diagnostic info at startup
    const workspaceCfg = path.join(__dirname, "central-mcp-config.json");
    const cfgPathLocal = fs.existsSync("C:/central-mcp-config.json")
      ? "C:/central-mcp-config.json"
      : workspaceCfg;
    logger.info("startup: __dirname=", __dirname);
    logger.info(
      "startup: cfgPathLocal=",
      cfgPathLocal,
      "exists=",
      fs.existsSync(cfgPathLocal)
    );
    // try to read token at startup
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgPathLocal, "utf8"));
      logger.info("startup: cfg keys=", Object.keys(cfg));
      logger.info(
        "startup: server token present=",
        !!cfg.centralMcpServerToken
      );
    } catch (e) {
      logger.warn("startup: unable to read cfg at startup", {
        error: e && e.message,
      });
    }
  } catch (e) {
    logger.error("startup diag failed", { error: e && e.message });
  }
  if (SERVER_TOKEN) logger.info("Auth token configured.");
  // write pid file so external tooling can find/stop this process
  try {
    fs.writeFileSync(PID_FILE, String(process.pid), { encoding: "utf8" });
    logger.info("wrote pid to", { path: PID_FILE });
  } catch (e) {
    logger.error("failed to write pid file", { error: e && e.message });
  }
  // graceful shutdown handlers
  function cleanupAndExit(code) {
    try {
      if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    } catch {
      // ignore
    }
    // Stop health checks
    loadBalancer.stopHealthChecks();
    
    // Clean up resources
    loadBalancer.destroy();
    
    logger.info("shutting down", { code: code || 0 });
    process.exit(code || 0);
  }
  process.on("SIGINT", () => cleanupAndExit(0));
  process.on("SIGTERM", () => cleanupAndExit(0));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    cleanupAndExit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
  });
});

module.exports = app;
