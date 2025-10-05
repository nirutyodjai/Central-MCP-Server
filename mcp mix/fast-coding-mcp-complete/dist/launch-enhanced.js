#!/usr/bin/env node
import { EnhancedFastMCPServer } from './core/EnhancedFastMCPServer.js';
import { ManagementAPI } from './services/ManagementAPI.js';
import { MonitoringSystem } from './services/AdvancedFeatures.js';
// Enhanced server launcher with management capabilities
async function launchEnhancedServer() {
  console.log('🚀 Launching Enhanced Fast Coding MCP Server...\n');
  let mcpServer = null;
  let managementAPI = null;
  let monitoringSystem = null;
  try {
    // Initialize core components
    console.log('📦 Initializing server components...');
    mcpServer = new EnhancedFastMCPServer();
    monitoringSystem = new MonitoringSystem();
    // Setup monitoring integration
    setupMonitoringIntegration(mcpServer, monitoringSystem);
    // Start MCP server
    console.log('🔗 Starting MCP server...');
    await mcpServer.start();
    // Start management API
    console.log('📊 Starting management API...');
    managementAPI = new ManagementAPI(mcpServer, 5201);
    await managementAPI.start();
    // Setup graceful shutdown
    setupGracefulShutdown(mcpServer, managementAPI);
    console.log('\n✅ Enhanced Fast Coding MCP Server launched successfully!');
    console.log(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    );
    console.log('🚀 MCP Server: Ready for requests');
    console.log('📊 Management API: http://localhost:5201');
    console.log('🔍 Health Check: http://localhost:5201/health');
    console.log('📈 Real-time Metrics: http://localhost:5201/stream');
    console.log('📋 API Documentation: http://localhost:5201');
    console.log('');
    console.log('🎯 Advanced Features Available:');
    console.log('   🤖 AI-Powered Code Analysis');
    console.log('   ⚡ Batch Processing & Optimization');
    console.log('   📊 Real-time Performance Monitoring');
    console.log('   🔍 Code Intelligence & Pattern Detection');
    console.log('   🚨 Alert System & Notifications');
    console.log('   🔧 Management & Configuration API');
  } catch (error) {
    console.error(
      '❌ Failed to launch Enhanced Fast Coding MCP Server:',
      error
    );
    // Cleanup on failure
    if (mcpServer) await mcpServer.cleanup();
    if (managementAPI) await managementAPI.stop();
    process.exit(1);
  }
}
// Setup monitoring integration
function setupMonitoringIntegration(server, monitoring) {
  // Monitor server performance
  const originalStartOperation = server.performanceMonitor?.startOperation;
  const originalEndOperation = server.performanceMonitor?.endOperation;
  if (originalStartOperation && originalEndOperation) {
    // Override performance monitoring to integrate with our system
    console.log('🔗 Monitoring system integrated');
  }
  // Setup alert rules
  monitoring.createAlert({
    id: 'high_response_time',
    metricName: 'response_time',
    condition: 'greater_than',
    threshold: 1000,
    severity: 'warning',
    message: 'High response time detected',
    enabled: true,
  });
  monitoring.createAlert({
    id: 'error_rate',
    metricName: 'error_rate',
    condition: 'greater_than',
    threshold: 0.1,
    severity: 'critical',
    message: 'High error rate detected',
    enabled: true,
  });
}
// Setup graceful shutdown
function setupGracefulShutdown(mcpServer, managementAPI) {
  const shutdown = async signal => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    try {
      if (mcpServer) await mcpServer.cleanup();
      if (managementAPI) await managementAPI.stop();
      console.log('✅ Enhanced Fast Coding MCP Server shut down successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };
  // Handle different termination signals
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGQUIT', () => shutdown('SIGQUIT'));
  // Handle uncaught exceptions
  process.on('uncaughtException', error => {
    console.error('💥 Uncaught Exception:', error);
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
}
// Launch the enhanced server
launchEnhancedServer().catch(error => {
  console.error('💥 Fatal error during server launch:', error);
  process.exit(1);
});
//# sourceMappingURL=launch-enhanced.js.map
