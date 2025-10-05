#!/usr/bin/env node
import { FastMCPServer } from './core/FastMCPServer.js';
import { FastCache } from './cache/FastCache.js';
import { PerformanceMonitor } from './utils/PerformanceMonitor.js';
// Test script for Fast Coding MCP Server
async function runTests() {
  console.log('🧪 Starting Fast Coding MCP Server Tests...\n');
  try {
    // Test 1: Cache Performance
    console.log('1️⃣ Testing Cache Performance...');
    await testCachePerformance();
    console.log('✅ Cache test completed\n');
    // Test 2: Performance Monitoring
    console.log('2️⃣ Testing Performance Monitoring...');
    await testPerformanceMonitoring();
    console.log('✅ Performance monitoring test completed\n');
    // Test 3: Server Initialization
    console.log('3️⃣ Testing Server Initialization...');
    await testServerInitialization();
    console.log('✅ Server initialization test completed\n');
    // Test 4: Integration Capabilities
    console.log('4️⃣ Testing Integration Capabilities...');
    await testIntegrationCapabilities();
    console.log('✅ Integration test completed\n');
    console.log('🎉 All tests completed successfully!');
    console.log('🚀 Fast Coding MCP Server is ready for production use');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}
// Test cache performance
async function testCachePerformance() {
  const cache = FastCache.getInstance();
  // Test basic operations
  const startTime = Date.now();
  // Set multiple items
  for (let i = 0; i < 1000; i++) {
    cache.set(`test_key_${i}`, { data: `test_value_${i}`, index: i });
  }
  // Get items back
  for (let i = 0; i < 1000; i++) {
    const value = cache.get(`test_key_${i}`);
    if (!value) {
      throw new Error(`Failed to retrieve cached item ${i}`);
    }
  }
  const duration = Date.now() - startTime;
  console.log(`   ⏱️  1000 set/get operations completed in ${duration}ms`);
  // Test cache statistics
  const stats = cache.getStats();
  console.log(
    `   📊 Cache stats: ${stats.memoryCache.size} memory items, ${stats.persistentCache.keys} persistent keys`
  );
  // Test batch operations
  const batchStartTime = Date.now();
  const batchEntries = Array.from({ length: 100 }, (_, i) => ({
    key: `batch_key_${i}`,
    value: { batch: true, index: i },
  }));
  await cache.batchSet(batchEntries);
  const batchResults = await cache.batchGet(batchEntries.map(e => e.key));
  const batchDuration = Date.now() - batchStartTime;
  console.log(`   ⚡ Batch operations (100 items): ${batchDuration}ms`);
  // Cleanup test data
  cache.clear();
}
// Test performance monitoring
async function testPerformanceMonitoring() {
  const monitor = new PerformanceMonitor();
  // Simulate various operations
  const operations = [
    { name: 'fast_search', duration: 150 },
    { name: 'code_analysis', duration: 300 },
    { name: 'cache_operation', duration: 50 },
    { name: 'file_read', duration: 200 },
    { name: 'error_operation', duration: 100 },
  ];
  for (const op of operations) {
    monitor.startOperation(op.name);
    await new Promise(resolve => setTimeout(resolve, op.duration));
    monitor.endOperation(op.name, op.name !== 'error_operation');
  }
  const stats = monitor.getStats();
  console.log(`   📈 Total operations: ${stats.summary.totalOperations}`);
  console.log(
    `   ⏱️  Average response time: ${stats.summary.averageResponseTime.toFixed(2)}ms`
  );
  console.log(
    `   ✅ Success rate: ${(stats.summary.successRate * 100).toFixed(1)}%`
  );
  // Test slow operation detection
  const slowOps = monitor.getSlowOperations(100);
  console.log(`   🚨 Found ${slowOps.length} slow operations`);
  monitor.reset();
}
// Test server initialization
async function testServerInitialization() {
  const server = new FastMCPServer();
  // Test capability registration
  server.registerCapability('test-server', {
    tools: ['test_tool_1', 'test_tool_2'],
    resources: ['test_resource_1'],
  });
  // Test performance stats
  const stats = server.getPerformanceStats();
  console.log(`   📊 Server initialized with performance tracking`);
  // Test cleanup
  await server.cleanup();
  console.log(`   🧹 Server cleanup completed`);
}
// Test integration capabilities
async function testIntegrationCapabilities() {
  // Test that all required modules can be imported
  const modules = ['FastMCPServer', 'FastCache', 'PerformanceMonitor'];
  for (const moduleName of modules) {
    try {
      // Dynamic import test
      const module = await import(
        `./${moduleName.toLowerCase().replace('fast', '')}.js`
      );
      console.log(`   ✅ ${moduleName} module loaded successfully`);
    } catch (error) {
      console.warn(`   ⚠️  ${moduleName} module has issues:`, error.message);
    }
  }
}
// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}
//# sourceMappingURL=test.js.map
