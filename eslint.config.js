import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['dist/', '.astro/', 'node_modules/', 'playwright-report/', 'test-results/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  // Client scripts run only in the browser.
  { files: ['src/scripts/**'], languageOptions: { globals: globals.browser } },
  // Astro components run at build time and may ship inline browser scripts.
  {
    files: ['src/**/*.astro'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  // Tooling and contract tests run in Node.
  {
    files: ['*.{js,ts,mjs}', 'src/*.ts', 'src/lib/**', 'tests/**'],
    languageOptions: { globals: globals.node },
  },
  // Playwright specs run in Node and pass callbacks into the page.
  { files: ['e2e/**'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
);
