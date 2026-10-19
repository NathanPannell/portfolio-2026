import { defineConfig, devices } from '@playwright/test';

const port = 4321;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // The link crawl does not depend on viewport, so it runs once.
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testIgnore: /links\.spec\.ts/ },
  ],
  // Serves the production build in dist/; run `npm run build` first.
  webServer: {
    command: `npx astro preview --ignore-lock --host 127.0.0.1 --port ${port}`,
    // Astro detaches `astro preview` when it detects an AI agent. This variable, which Astro sets
    // for its own detached child, keeps the server in the foreground so Playwright can manage it.
    env: { ASTRO_PREVIEW_BACKGROUND: '1' },
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});
