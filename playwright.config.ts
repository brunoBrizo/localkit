import { defineConfig, devices } from '@playwright/test';

// Web end-to-end tests. They run against the production build, which carries
// the CSP, never against the dev server.
export default defineConfig({
  testDir: 'e2e/web',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // WebKit is the engine behind the desktop app on macOS and Linux.
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
  },
});
