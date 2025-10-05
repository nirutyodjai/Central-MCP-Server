#!/usr/bin/env node
import { FastMCPServer } from './core/FastMCPServer.js';
import { MCPServerIntegration } from './integrations/MCPServerIntegration.js';
import fs from 'fs/promises';
import path from 'path';
import { ShutdownManager } from './utils/ShutdownManager.js';
// Fast Coding MCP Server - Main Entry Point
async function main() {
  console.log('🚀 Initializing Fast Coding MCP Server...');
  try {
    // Initialize core components
    const server = new FastMCPServer();
    const mcpIntegration = new MCPServerIntegration();
    // Load existing MCP servers configuration
    await loadExistingMCPServers(mcpIntegration);
    // Register integrated servers with the main server
    registerIntegratedServers(server, mcpIntegration);
    // Start the server
    await server.start();
    // Setup graceful shutdown
    setupGracefulShutdown(server);
    // Register with central ShutdownManager for tests and integration
    ShutdownManager.register(async () => {
      try {
        await server.cleanup();
      } catch (e) {
        // already handled in setupGracefulShutdown
      }
    });
    console.log('✅ Fast Coding MCP Server ready!');
    console.log('📋 Available commands:');
    console.log('   - List tools: Send ListTools request');
    console.log('   - Execute tool: Send CallTool request');
    console.log('   - Get performance stats: Use cache_stats tool');
  } catch (error) {
    console.error('❌ Failed to start Fast Coding MCP Server:', error);
    process.exit(1);
  }
}
// Load existing MCP servers from configuration
async function loadExistingMCPServers(mcpIntegration) {
  try {
    const configPath = path.join(
      process.cwd(),
      '..',
      'central-mcp-config.json'
    );
    try {
      await fs.access(configPath);
    } catch {
      console.log('⚠️  Central MCP config not found, using default servers');
      return;
    }
    const configData = await fs.readFile(configPath, 'utf-8');
    const servers = JSON.parse(configData);
    console.log(`📦 Loading ${servers.length} existing MCP servers...`);
    // Register servers with performance optimization
    const registerPromises = servers
      .filter(server => server.url && server.url.startsWith('http'))
      .map(server => {
        return {
          id: server.id,
          name: server.name,
          url: server.url,
          description: server.description,
          capabilities: server.capabilities,
          metadata: server.metadata,
        };
      })
      .map(serverInfo => mcpIntegration.registerServer(serverInfo));
    // Use Promise.allSettled for partial failures
    const results = await Promise.allSettled(registerPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;
    console.log(`✅ Successfully registered ${successful} servers`);
    if (failed > 0) {
      console.log(`⚠️  Failed to register ${failed} servers`);
    }
  } catch (error) {
    console.error('Error loading MCP servers:', error);
  }
}
// Register integrated servers with main server
function registerIntegratedServers(server, mcpIntegration) {
  const registeredServers = mcpIntegration.getRegisteredServers();
  for (const serverInfo of registeredServers) {
    server.registerCapability(serverInfo.id, serverInfo.capabilities);
  }
  console.log(`🔗 Registered ${registeredServers.length} integrated servers`);
}
// Setup graceful shutdown
function setupGracefulShutdown(server) {
  const shutdown = async () => {
    console.log('🛑 Shutting down Fast Coding MCP Server...');
    try {
      await server.cleanup();
      console.log('✅ Shutdown complete');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
    process.exit(0);
  };
  // Handle different termination signals
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGQUIT', shutdown);
  // Handle uncaught exceptions
  process.on('uncaughtException', error => {
    console.error('💥 Uncaught Exception:', error);
    shutdown();
  });
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown();
  });
}
// Start the server
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
//# sourceMappingURL=index.js.map
