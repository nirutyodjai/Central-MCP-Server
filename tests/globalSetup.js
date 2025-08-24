// Global setup for Jest tests
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  // Create test directories
  const testDirs = [
    path.join(__dirname, '../logs'),
    path.join(__dirname, '../config'),
    path.join(__dirname, '../temp')
  ];

  testDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Create test configuration file
  const testConfig = {
    port: 5051,
    jwtSecret: 'test-jwt-secret',
    serverToken: 'test-server-token',
    logLevel: 'error',
    healthCheckInterval: 5000,
    metricsRetentionHours: 1
  };

  fs.writeFileSync(
    path.join(__dirname, '../config/test.json'),
    JSON.stringify(testConfig, null, 2)
  );

  // Set global test variables
  global.__TEST_CONFIG__ = testConfig;
  
  console.log('Global test setup completed');
};