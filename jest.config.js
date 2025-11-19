module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(fast-check)/)'
  ]
};
