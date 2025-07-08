/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',           
  testEnvironment: 'node',

 
  roots: ['<rootDir>/src'],

 
  testMatch: ['**/tests/**/*.spec.ts'],
 
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },

  moduleFileExtensions: ['ts','js','json','node'],
 
  globalSetup: '<rootDir>/src/jest.setup.ts',
};
