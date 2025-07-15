// ESLint v8 config for Next.js/React/TypeScript (extends-based)
module.exports = {
  extends: [
    'next',
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'eslint:recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.next/',
    'out/',
    'build/',
    'coverage/',
  ],
  rules: {
    // Add custom rules here
  },
};