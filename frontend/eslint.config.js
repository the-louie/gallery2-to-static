// ESLint flat config (ESLint 9). Same rule sets as the former .eslintrc.cjs:
// eslint:recommended, typescript-eslint recommended, react-hooks, react + jsx-runtime,
// react-refresh, prettier (formatting rules off).
// ESLint 10 is not used yet: eslint-plugin-react 7.37.5 (latest) supports ESLint up to 9.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
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
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // the two classic react-hooks rules (v7's "recommended" adds many React Compiler rules)
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react/react-in-jsx-scope': 'off',
    },
  },
  prettier,
);
