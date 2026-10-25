// ESLint flat config (ESLint 10): eslint:recommended, typescript-eslint recommended,
// @eslint-react recommended-typescript, react-hooks, react-refresh, prettier (formatting rules off).
// @eslint-react replaces eslint-plugin-react, whose latest release (7.37.5) supports ESLint up to 9.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintReact from '@eslint-react/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    // Same scope as the former `eslint . --ext ts,tsx`
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      eslintReact.configs['recommended-typescript'],
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // the two classic react-hooks rules (v7's "recommended" adds many React Compiler rules)
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // exhaustive-deps stays with react-hooks, where the deliberate suppressions are documented.
      '@eslint-react/exhaustive-deps': 'off',
      // Off after review (LINT-02): its 49 hits are all "reset/sync state when an input changes" or
      // "set loading before a fetch" effects. They cost an extra render, not correctness; removing
      // them means restructuring 14 hooks/components (REFAC-01), not a lint fix.
      '@eslint-react/set-state-in-effect': 'off',
      // setXState names are deliberate: the public setX wraps the raw setter (validation, side effects)
      '@eslint-react/use-state': ['error', { enforceSetterName: false }],
      // project convention: a leading underscore marks a deliberately unused name (kept for an API)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Context modules export provider + hook + context together by design, and test-utils
    // re-exports Testing Library: fast-refresh boundaries do not matter there (LINT-01)
    files: ['src/contexts/**', 'src/test-utils.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Tests and test helpers: mocks and fixtures may use `any` (production code has none; LINT-01)
    files: ['**/*.test.{ts,tsx}', 'src/test/**', 'src/test-utils*', 'src/__mocks__/**'],
    // ... and list mocks key by index, like the library they stand in for (LINT-02)
    rules: { '@typescript-eslint/no-explicit-any': 'off', '@eslint-react/no-array-index-key': 'off' },
  },
  prettier,
);
