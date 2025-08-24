// Test setup file
const winston = require('winston');

// Disable logging during tests
winston.configure({
  level: 'error',
  transports: [
    new winston.transports.Console({ silent: true })
  ]
});

// Global test configuration
global.testConfig = {
  port: 5051, // Different port for testing
  jwtSecret: 'test-jwt-secret',
  serverToken: 'test-server-token'
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '5051';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SERVER_TOKEN = 'test-server-token';
process.env.LOG_LEVEL = 'error';

// Global test utilities
global.delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock external dependencies
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }))
}));

// Suppress console.log during tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});