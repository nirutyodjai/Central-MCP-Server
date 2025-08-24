const logger = require('../logger');

/**
 * Monitoring middleware for tracking HTTP requests
 */
function createMonitoringMiddleware(monitoringSystem) {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Store original end function
    const originalEnd = res.end;
    
    // Override end function to capture metrics
    res.end = function(...args) {
      const responseTime = Date.now() - startTime;
      
      // Track the request
      monitoringSystem.trackRequest(req, res, responseTime);
      
      // Call original end function
      originalEnd.apply(this, args);
    };
    
    next();
  };
}

/**
 * Error tracking middleware
 */
function createErrorTrackingMiddleware(monitoringSystem) {
  return (err, req, res, next) => {
    // Log the error
    logger.error('Request error', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Track error in monitoring system
    monitoringSystem.emit('requestError', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      timestamp: Date.now()
    });
    
    next(err);
  };
}

/**
 * Request logging middleware with enhanced details
 */
function createRequestLoggingMiddleware() {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Log request start
    logger.info('Request started', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: req.get('Content-Length'),
      timestamp: new Date().toISOString()
    });
    
    // Store original end function
    const originalEnd = res.end;
    
    // Override end function to log completion
    res.end = function(...args) {
      const responseTime = Date.now() - startTime;
      
      // Log request completion
      logger.info('Request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        contentLength: res.get('Content-Length'),
        timestamp: new Date().toISOString()
      });
      
      // Call original end function
      originalEnd.apply(this, args);
    };
    
    next();
  };
}

/**
 * Rate limiting tracking middleware
 */
function createRateLimitingMiddleware(monitoringSystem, options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 1000, // max requests per window
    keyGenerator = (req) => req.ip // default to IP-based limiting
  } = options;
  
  const requestCounts = new Map();
  
  // Clean up old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requestCounts.entries()) {
      if (now - data.windowStart > windowMs) {
        requestCounts.delete(key);
      }
    }
  }, windowMs);
  
  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    let requestData = requestCounts.get(key);
    
    if (!requestData || now - requestData.windowStart > windowMs) {
      // New window
      requestData = {
        count: 1,
        windowStart: now
      };
    } else {
      // Existing window
      requestData.count++;
    }
    
    requestCounts.set(key, requestData);
    
    // Check if limit exceeded
    if (requestData.count > maxRequests) {
      // Track rate limit violation
      monitoringSystem.emit('rateLimitExceeded', {
        key,
        count: requestData.count,
        maxRequests,
        windowMs,
        url: req.url,
        method: req.method,
        timestamp: now
      });
      
      logger.warn('Rate limit exceeded', {
        key,
        count: requestData.count,
        maxRequests,
        url: req.url,
        method: req.method
      });
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000} seconds.`,
        retryAfter: Math.ceil((windowMs - (now - requestData.windowStart)) / 1000)
      });
    }
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': Math.max(0, maxRequests - requestData.count),
      'X-RateLimit-Reset': new Date(requestData.windowStart + windowMs).toISOString()
    });
    
    next();
  };
}

/**
 * Security headers middleware
 */
function createSecurityHeadersMiddleware() {
  return (req, res, next) => {
    // Set security headers
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
    });
    
    next();
  };
}

/**
 * Health check middleware
 */
function createHealthCheckMiddleware(monitoringSystem, mcpRegistry, loadBalancer) {
  return (req, res, next) => {
    if (req.path === '/health' && req.method === 'GET') {
      const metrics = monitoringSystem.getMetricsSummary();
      const servers = mcpRegistry.getAllServers();
      const healthyServers = mcpRegistry.getHealthyServers();
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        servers: {
          total: servers.length,
          healthy: healthyServers.length,
          unhealthy: servers.length - healthyServers.length
        },
        metrics: {
          requests: metrics.requests.total,
          errors: metrics.requests.errors,
          avgResponseTime: metrics.requests.avgResponseTime,
          activeAlerts: metrics.activeAlerts
        }
      };
      
      // Determine overall health status
      if (metrics.activeAlerts > 0) {
        health.status = 'degraded';
      }
      
      if (healthyServers.length === 0 && servers.length > 0) {
        health.status = 'unhealthy';
      }
      
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      return res.status(statusCode).json(health);
    }
    
    next();
  };
}

module.exports = {
  createMonitoringMiddleware,
  createErrorTrackingMiddleware,
  createRequestLoggingMiddleware,
  createRateLimitingMiddleware,
  createSecurityHeadersMiddleware,
  createHealthCheckMiddleware
};