export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
  // .claude/ holds local agent tooling and worktrees (full repo copies).
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/'],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  transform: {
    '^.+\\.tsx?$': '<rootDir>/jest.importMetaEnvTransform.cjs',
  },
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$|@testing-library))'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
