import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  outputDir: '../../114_Build/test-results',
  reporter: 'list',
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { channel: 'chrome', viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], channel: 'chrome', defaultBrowserType: 'chromium' } },
    { name: 'webkit', testMatch: '**/reliable-images.spec.ts', use: { browserName: 'webkit', channel: undefined, viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 } },
  ],
  webServer: { command: 'npm run preview', cwd: root, url: 'http://127.0.0.1:4173', reuseExistingServer: true },
});
