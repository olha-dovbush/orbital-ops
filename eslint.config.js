// Locked file: the grading contract. Fix the code, not the config.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  {
    files: ['src/**/*.{ts,tsx}', 'scripts/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: { window: 'readonly', document: 'readonly', fetch: 'readonly', console: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', AbortController: 'readonly', process: 'readonly' } },
    rules: {
      complexity: ['error', 10],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-duplicate-imports': 'error'
    }
  },
  {
    files: ['src/components/**/*.tsx'],
    rules: {
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }]
    }
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error'
    }
  }
);
