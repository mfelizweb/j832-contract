/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',            // activa ts-jest
  testEnvironment: 'node',

  // Dónde buscar archivos de test
  roots: ['<rootDir>/src'],

  // Qué archivos tratar como tests
  testMatch: ['**/tests/**/*.spec.ts'],

  // Asegura que ts-jest procese los .ts
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },

  moduleFileExtensions: ['ts','js','json','node'],

  // Si moviste tu setup a src/
  globalSetup: '<rootDir>/src/jest.setup.ts',
};
