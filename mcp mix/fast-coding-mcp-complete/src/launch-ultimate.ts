#!/usr/bin/env node

import { EnhancedFastMCPServer } from './core/EnhancedFastMCPServer.js';
import { ManagementAPI } from './services/ManagementAPI.js';
import { WebSocketManager } from './services/AdvancedSystems.js';
import { DatabaseManager } from './integrations/DatabaseAndGit.js';
import { DockerManager } from './services/DockerAndMultiLanguage.js';

// Ultimate Fast Coding MCP Server Launcher
async function launchUltimateServer() {
  console.log('🚀 Launching ULTIMATE Fast Coding MCP Server...\n');

  let mcpServer: EnhancedFastMCPServer | null = null;
  let managementAPI: ManagementAPI | null = null;
  let webSocketManager: WebSocketManager | null = null;
  let databaseManager: DatabaseManager | null = null;
  let dockerManager: DockerManager | null = null;

  try {
    // Initialize all components
    console.log('📦 Initializing server components...');

    // Initialize database
    databaseManager = new DatabaseManager();
    await databaseManager.initialize();

    // Initialize MCP server
    mcpServer = new EnhancedFastMCPServer();

    // Start MCP server
    console.log('🔗 Starting MCP server...');
    await mcpServer.start();

    // Start management API
    console.log('📊 Starting management API...');
    managementAPI = new ManagementAPI(mcpServer, 5201);
    await managementAPI.start();

    // Start WebSocket server
    console.log('🌐 Starting WebSocket server...');
    webSocketManager = new WebSocketManager(5202);
    await webSocketManager.start();

    // Initialize Docker support
    console.log('🐳 Initializing Docker support...');
    dockerManager = new DockerManager();

    // Setup graceful shutdown
    setupGracefulShutdown(
      mcpServer,
      managementAPI,
      webSocketManager,
      databaseManager
    );

    // Generate deployment files
    await generateDeploymentFiles(dockerManager);

    console.log('\n🎉 ULTIMATE Fast Coding MCP Server launched successfully!');
    console.log(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    );
    console.log('🚀 MCP Server: Ready for requests');
    console.log('📊 Management API: http://localhost:5201');
    console.log('🌐 WebSocket: ws://localhost:5202');
    console.log('🔍 Health Check: http://localhost:5201/health');
    console.log('📈 Real-time Metrics: http://localhost:5201/stream');
    console.log('📋 API Documentation: http://localhost:5201');
    console.log('');
    console.log('🚀 ALL FEATURES ENABLED:');
    console.log('   🤖 AI-Powered Intelligence');
    console.log('   📊 Advanced Monitoring & Analytics');
    console.log('   ⚡ Enhanced Performance');
    console.log('   🌐 Real-time WebSocket Communication');
    console.log('   💾 Database Integration');
    console.log('   🔒 Advanced Security');
    console.log('   🐳 Docker Deployment Support');
    console.log('   🌍 Multi-Language Support');
    console.log('   🔌 Plugin System');
    console.log('   📱 Git Integration');
  } catch (error) {
    console.error(
      '❌ Failed to launch Ultimate Fast Coding MCP Server:',
      error
    );

    // Cleanup on failure
    if (mcpServer) await mcpServer.cleanup();
    if (managementAPI) await managementAPI.stop();
    if (webSocketManager) await webSocketManager.stop();
    if (databaseManager) await databaseManager.close();

    process.exit(1);
  }
}

// Generate deployment files
async function generateDeploymentFiles(
  dockerManager: DockerManager
): Promise<void> {
  try {
    await dockerManager.createDeploymentFiles({
      nodeVersion: '20',
      port: 5200,
      managementPort: 5201,
      wsPort: 5202,
    });

    console.log('✅ Deployment files generated');
  } catch (error) {
    console.warn('⚠️ Failed to generate deployment files:', error);
  }
}

// Setup graceful shutdown
function setupGracefulShutdown(
  mcpServer: EnhancedFastMCPServer,
  managementAPI: ManagementAPI,
  webSocketManager: WebSocketManager,
  databaseManager: DatabaseManager
) {
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

    try {
      if (mcpServer) await mcpServer.cleanup();
      if (managementAPI) await managementAPI.stop();
      if (webSocketManager) await webSocketManager.stop();
      if (databaseManager) await databaseManager.close();

      console.log('✅ Ultimate Fast Coding MCP Server shut down successfully');
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

// Launch the ultimate server
launchUltimateServer().catch(error => {
  console.error('💥 Fatal error during server launch:', error);
  process.exit(1);
});
