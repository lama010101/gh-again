/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  modulePaths: ['<rootDir>/src'],
  moduleDirectories: ['node_modules', 'src'],
  moduleNameMapper: {
    // Handle module aliases (from tsconfig paths)
    '^@/(.*)$': '<rootDir>/src/$1',
    // Handle CSS imports (with CSS modules)
    '\\.module\\.(css|scss|sass)$': 'identity-obj-proxy',
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    // Mock CSS and other static files
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setupTests.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      // Enable strict type checking
      diagnostics: {
        ignoreCodes: [151001],
      },
    }],
  },
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx|js|jsx)',
    '**/?(*.)+(spec|test).(ts|tsx|js|jsx)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/index.{ts,tsx}', // Skip barrel files
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  coverageThreshold: {
    global: {
      branches: 50, // Start with a lower threshold, can be increased later
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  // Add support for absolute imports
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Transform node_modules except for specific ES modules if needed
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|@hookform|@radix-ui)/)',
  ],
  // Setup for testing-library
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
  // Watch plugins for better DX
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  // Reset mocks between tests
  resetMocks: true,
  // Clear mock calls between tests
  clearMocks: true,
  // Collect coverage while running tests
  collectCoverage: false, // Set to true when needed to generate coverage
};
