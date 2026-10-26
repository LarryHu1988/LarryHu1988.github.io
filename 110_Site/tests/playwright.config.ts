import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  outputDir: '../../114_Build/test-results',
  reporter: 'list',
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4173', channel: 'chrome', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: { command: 'npm run preview', cwd: root, url: 'http://127.0.0.1:4173', reuseExistingServer: true },
});
