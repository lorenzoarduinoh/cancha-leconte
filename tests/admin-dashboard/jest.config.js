/**
 * Jest configuration for Admin Dashboard tests
 * Extends the main project Jest config with dashboard-specific settings
 */

const path = require('path');

module.exports = {
  // Extend base configuration
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Test discovery
  roots: [
    '<rootDir>/tests/admin-dashboard',
  ],
  
  testMatch: [
    '<rootDir>/tests/admin-dashboard/**/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/tests/admin-dashboard/**/?(*.)(test|spec).(ts|tsx|js)',
  ],
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/app/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/tests/(.*)$': '<rootDir>/tests/$1',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/admin-dashboard/setup/test-setup.ts',
    '<rootDir>/tests/setup.ts', // Main project setup
  ],
  
  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'app/admin/dashboard/**/*.(ts|tsx)',
    'app/api/admin/dashboard/**/*.(ts|tsx)',
    'lib/utils/api.ts',
    'app/lib/utils/csrf.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/*.config.*',
    '!**/coverage/**',
  ],
  
  coverageDirectory: '<rootDir>/coverage/admin-dashboard',
  
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary',
  ],
  
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 95,
      lines: 90,
      statements: 90,
    },
    // Specific thresholds for critical files
    './app/admin/dashboard/page.tsx': {
      branches: 90,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    './app/api/admin/dashboard/route.ts': {
      branches: 85,
      functions: 100,
      lines: 90,
      statements: 90,
    },
  },
  
  // Test environment configuration
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
  
  // Global variables available in tests
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  
  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  
  // Timeout configuration
  testTimeout: 10000, // 10 seconds for integration tests
  
  // Watch configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/.next/',
  ],
  
  // Error handling
  errorOnDeprecated: true,
  
  // Test reporting
  verbose: true,
  
  // Custom matchers
  setupFilesAfterEnv: [
    '<rootDir>/tests/admin-dashboard/setup/test-setup.ts',
    '@testing-library/jest-dom',
  ],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@supabase|@testing-library))',
  ],
  
  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>',
  ],
  
  // Snapshot configuration
  snapshotSerializers: [
    '@testing-library/jest-dom/serializers',
  ],
  
  // Test result processor for custom reporting
  testResultsProcessor: undefined,
  
  // Custom test runner (if needed)
  // testRunner: 'jest-circus/runner',
  
  // Environment variables for tests
  setupFiles: [
    '<rootDir>/tests/admin-dashboard/setup/env.ts',
  ],
  
  // Performance monitoring
  slowTestThreshold: 5, // Warn for tests taking longer than 5 seconds
  
  // Parallel testing
  maxWorkers: '50%', // Use half of available CPU cores
  
  // Cache configuration
  cacheDirectory: '<rootDir>/node_modules/.cache/jest/admin-dashboard',
  
  // Custom matchers and utilities
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
};