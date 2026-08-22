import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // varsIgnorePattern covers plain unused vars; argsIgnorePattern is the one that actually
      // matters for `{ icon: Icon, ... }`-style destructured props — Icon IS used, as a JSX tag
      // (`<Icon />`), but base no-unused-vars doesn't parse JSX without eslint-plugin-react, so
      // every capitalized destructured prop/arg needs the same allowance as a capitalized var.
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // Playwright/Vitest test files and config run under Node, not the browser — they need
    // Node globals (process, require via import, etc.), not window/document.
    files: ['e2e/**/*.js', 'playwright.config.js', 'vite.config.js', 'vitest.setup.js', '**/*.test.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
];
