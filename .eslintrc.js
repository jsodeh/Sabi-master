module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended'
  ],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'off', // Allow console for logging in Electron app
    'prefer-const': 'error',
    'no-var': 'error'
  },
  env: {
    node: true,
    es6: true
  },
  ignorePatterns: ['dist/', 'node_modules/']
};