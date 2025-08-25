// Conditional Jest configuration to avoid Next.js runtime conflicts
const createJestConfig = (() => {
  // Only load next/jest when actually running tests
  if (process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('jest'))) {
    try {
      const nextJest = require('next/jest');
      return nextJest({
        // Provide the path to your Next.js app to load next.config.js and .env files
        dir: './',
      });
    } catch (error) {
      console.warn('Failed to load next/jest, using basic Jest config:', error.message);
      return (config) => config;
    }
  }
  // Return identity function if not in test environment
  return (config) => config;
})()

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testEnvironment: 'jsdom', // Use jsdom for React component tests
  // Prevent Jest workers from conflicting with Next.js
  maxWorkers: 1,
  workerIdleMemoryLimit: '512MB',
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!app/**/_*.{js,jsx,ts,tsx}', // Exclude Next.js private files
    '!app/**/layout.{js,jsx,ts,tsx}', // Exclude layouts for now
    '!app/**/page.{js,jsx,ts,tsx}', // Test pages separately
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/tests/**/*.spec.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jose|@supabase|@hookform|zod|@playwright)/)',
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  // Limitación crítica de workers
  maxWorkers: 1,
  workerIdleMemoryLimit: '512MB',
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)