// Global teardown for Jest tests
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  // Clean up test files
  const testFiles = [
    path.join(__dirname, '../config/test.json'),
    path.join(__dirname, '../logs/test.log')
  ];

  testFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch (error) {
        console.warn(`Failed to clean up test file: ${file}`);
      }
    }
  });

  // Clean up temporary directories
  const tempDir = path.join(__dirname, '../temp');
  if (fs.existsSync(tempDir)) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up temp directory');
    }
  }

  console.log('Global test teardown completed');
};