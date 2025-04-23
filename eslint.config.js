// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  // 1) Don’t lint these folders at all
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '**/pages/**',
      'src/components/ui/**',
      'src/utils/**',
    ],
  },

  // 2) Core JS/JSON rules
  js.configs.recommended,

  // 3) TSX/TS files under `src/`
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        React: 'readonly',
        JSX: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // TypeScript recommended
      ...tsPlugin.configs.recommended.rules,

      // React recommended
      ...reactPlugin.configs.recommended.rules,

      // React Hooks
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': [
        'warn',
        { enableDangerousAutofixThisMayCauseInfiniteLoops: false },
      ],

      // Fast‑Refresh
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // Project overrides
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': ['error'],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'react/no-unescaped-entities': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-undef': 'off',
      'prefer-const': [
        'warn',
        { destructuring: 'all', ignoreReadBeforeAssign: true },
      ],
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  // 4) UI kit override - allow empty object types
  {
    files: ['src/components/ui/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
];
