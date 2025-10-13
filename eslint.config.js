import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  {
    ignores: [
      'node_modules/',
      '*.min.js',
      '*.bundle.js',
      'coverage/',
      'dist/',
      'build/',
      '.git/'
    ]
  },
  js.configs.recommended,
  prettier,
  {
    files: ['**/*.js'],
    plugins: {
      prettier: prettierPlugin
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        document: 'readonly',
        window: 'readonly',
        fetch: 'readonly'
      }
    },
    rules: {
      'prettier/prettier': ['error', {}, { usePrettierrc: true }],
      'no-unused-vars': 'warn',
      'no-console': 'off'
    }
  }
];
