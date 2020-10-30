module.exports = {
  clearMocks: true,
  collectCoverageFrom: ['src/**/*'],
  coverageDirectory: 'coverage',
  setupFiles: ['./testsetup.js'],
  setupFilesAfterEnv: ['jest-sinon'],
  testEnvironment: 'node',
  testRegex: ['(/test/.*|(\\.|/)(test|spec))\\.[jt]sx?$'],
};
