/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('jest').Config} */
const config = {
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'app/**/*.js',
    '!app/**.js',
    '!app/scripts/**/*.js',
    '!app/fdk.js',
    '!app/models/**/*.js',
    '!app/routes/index.js',
    '!app/common/**/*.js',
    '!app/health_check/**/*.js',
    '!app/controllers/orderController.js',
    '!app/routes/**/*',
    '!__tests__/**/*.js',
  ],
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coverageReporters: ['json', 'text', 'lcov', 'clover', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 85,
      statements: 85,
    },
  }
};

module.exports = config;
