/**
 * Main entry point for Ultimate MCP Platform
 */

import { UltimateMCPPlatform } from './ultimate-mcp-platform-fixed.js';

// Create and start the platform on port 4523
const platform = new UltimateMCPPlatform(4523);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Received SIGTERM, shutting down gracefully...');
});

process.on('SIGINT', () => {
  console.log('🔄 Received SIGINT, shutting down gracefully...');
});

// Start the platform
platform.start().catch(error => {
  console.error('❌ Failed to start platform:', error);
  process.exit(1);
});
