import express from 'express';
import cors from 'cors';
import { MonitoringSystem } from './AdvancedFeatures.js';
// REST API Server for monitoring and management
export class ManagementAPI {
  constructor(enhancedServer, port = 5201) {
    this.port = port;
    this.enhancedServer = enhancedServer;
    this.monitoring = new MonitoringSystem();
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
      next();
    });
  }
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
      });
    });
    // Server statistics
    this.app.get('/stats', (req, res) => {
      try {
        const stats = this.enhancedServer.getEnhancedStats();
        res.json({ success: true, data: stats });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
    // Performance metrics
    this.app.get('/metrics', (req, res) => {
      try {
        const { name, startTime, endTime } = req.query;
        const metrics = this.monitoring.getMetrics(
          name,
          startTime ? parseInt(startTime) : undefined,
          endTime ? parseInt(endTime) : undefined
        );
        res.json({ success: true, data: metrics });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
    // Active alerts
    this.app.get('/alerts', (req, res) => {
      try {
        const alerts = this.monitoring.getAlerts();
        res.json({ success: true, data: alerts });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
    // Create alert rule
    this.app.post('/alerts', (req, res) => {
      try {
        const alert = req.body;
        this.monitoring.createAlert(alert);
        res.json({ success: true, data: alert });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
    // Code analysis
    this.app.post('/analyze', async (req, res) => {
      try {
        const { filePath, content, language } = req.body;
        if (!filePath || !content || !language) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: filePath, content, language',
          });
        }
        // This would integrate with the code intelligence system
        const analysis = {
          filePath,
          language,
          complexity: Math.floor(Math.random() * 20),
          maintainability: Math.floor(Math.random() * 100),
          suggestions: [
            'Consider adding error handling',
            'Function could be broken into smaller pieces',
          ],
        };
        res.json({ success: true, data: analysis });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
    // Batch operations
    this.app.post('/batch', async (req, res) => {
      try {
        const { operations } = req.body;
        if (!Array.isArray(operations)) {
          return res.status(400).json({
            success: false,
            error: 'Operations must be an array',
          });
        }
        const results = [];
        for (const operation of operations) {
          try {
            // Process each operation
            const result = await this.processOperation(operation);
            results.push({ success: true, result });
          } catch (error) {
            results.push({ success: false, error: error.message, operation });
          }
        }
        res.json({ success: true, data: results });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
    // Real-time metrics stream
    this.app.get('/stream', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      // Send initial data
      const initialData = {
        type: 'initial',
        timestamp: Date.now(),
        stats: this.enhancedServer.getEnhancedStats(),
      };
      res.write(`data: ${JSON.stringify(initialData)}\n\n`);
      // Subscribe to real-time updates
      const unsubscribe = this.monitoring.subscribe(data => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      });
      // Handle client disconnect
      req.on('close', () => {
        unsubscribe();
        res.end();
      });
    });
    // Configuration management
    this.app.get('/config', (req, res) => {
      res.json({
        success: true,
        data: {
          port: this.port,
          features: [
            'real-time-monitoring',
            'advanced-analytics',
            'ai-integration',
            'batch-processing',
            'code-intelligence',
          ],
          limits: {
            maxBatchSize: 1000,
            maxConcurrentOperations: 50,
            cacheSize: 10000,
          },
        },
      });
    });
    // Performance optimization suggestions
    this.app.get('/optimization', (req, res) => {
      const suggestions = [
        {
          category: 'cache',
          title: 'Increase Cache TTL',
          description:
            'Consider increasing cache TTL for frequently accessed data',
          impact: 'high',
          effort: 'low',
        },
        {
          category: 'worker',
          title: 'Optimize Worker Pool Size',
          description: 'Current worker pool may be undersized for workload',
          impact: 'medium',
          effort: 'medium',
        },
        {
          category: 'batch',
          title: 'Adjust Batch Sizes',
          description: 'Current batch sizes may not be optimal for throughput',
          impact: 'medium',
          effort: 'low',
        },
      ];
      res.json({ success: true, data: suggestions });
    });
    // Error handling
    this.app.use((err, req, res, next) => {
      console.error('API Error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    });
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
      });
    });
  }
  setupWebSocket() {
    // WebSocket implementation for real-time communication
    // This would integrate with a WebSocket library like 'ws'
  }
  async processOperation(operation) {
    // Process individual operations
    switch (operation.type) {
      case 'analyze':
        return { type: 'analysis', result: 'Analysis completed' };
      case 'search':
        return { type: 'search', results: [], count: 0 };
      case 'refactor':
        return { type: 'refactor', changes: [], success: true };
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }
  // Start the management API server
  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`🚀 Management API started on port ${this.port}`);
          console.log(`📊 Monitoring dashboard: http://localhost:${this.port}`);
          console.log(
            `📈 Real-time metrics: http://localhost:${this.port}/stream`
          );
          console.log(`🔍 Health check: http://localhost:${this.port}/health`);
          resolve();
        });
        this.server.on('error', error => {
          if (error.code === 'EADDRINUSE') {
            console.error(`❌ Port ${this.port} is already in use`);
          } else {
            console.error('❌ Failed to start management API:', error);
          }
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  // Stop the management API server
  async stop() {
    return new Promise(resolve => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 Management API stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
  // Get server information
  getInfo() {
    return {
      port: this.port,
      status: this.server ? 'running' : 'stopped',
      endpoints: [
        'GET /health',
        'GET /stats',
        'GET /metrics',
        'GET /alerts',
        'POST /alerts',
        'POST /analyze',
        'POST /batch',
        'GET /stream',
        'GET /config',
        'GET /optimization',
      ],
    };
  }
}
//# sourceMappingURL=ManagementAPI.js.map
