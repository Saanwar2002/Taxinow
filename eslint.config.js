// ESLint v9+ flat config for Next.js/React/TypeScript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import next from 'eslint-config-next';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  next,
  {
    ignores: [
      'node_modules',
      'dist',
      '.next',
      'out',
      'build',
      'coverage',
    ],
    rules: {
      // Add custom rules here
    },
  },
];