import dotenv from 'dotenv';

// Load environment variables from .env.test file
dotenv.config({ path: '.env.test' });

// Set up global test variables
global.__DEV__ = process.env.NODE_ENV !== 'production';

// Set up test timeout
jest.setTimeout(30000); // 30 seconds

// Mock any global objects or functions needed for testing
global.console = {
  ...console,
  // Override any console methods if needed for testing
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Add any other global test setup here
beforeAll(async () => {
  // Any setup that needs to run before all tests
});

afterAll(async () => {
  // Any cleanup that needs to run after all tests
});

// Mock any modules that should be mocked globally
jest.mock('../utils/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));
