import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.test\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@commons/(.*)$': '<rootDir>/Commons/$1',
    '^@domains/(.*)$': '<rootDir>/Domains/$1',
    '^@applications/(.*)$': '<rootDir>/Applications/$1',
    '^@infrastructures/(.*)$': '<rootDir>/Infrastructures/$1',
    '^@interfaces/(.*)$': '<rootDir>/Interfaces/$1',
  },
  setupFiles: ['dotenv/config'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

export default config;
