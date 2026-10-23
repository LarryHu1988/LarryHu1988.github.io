import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from './paths.mjs';

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 360, height: 500 }, deviceScaleFactor: 2 });
  for (const app of ['simpleworth', 'keepfit', 'pdflibrarian']) {
    await page.goto(pathToFileURL(resolve(root, '119_Build/brand', `${app}.svg`)).href);
    await page.locator('svg').screenshot({ path: resolve(root, '112_Brand', `${app}.png`) });
  }
  mkdirSync(resolve(root, '119_Build/checks'), { recursive: true });
  await page.setViewportSize({ width: 1200, height: 540 });
  await page.goto(pathToFileURL(resolve(root, '112_Brand/cover.svg')).href);
  await page.screenshot({ path: resolve(root, '119_Build/checks/readme-cover.png') });
} finally {
  await browser.close();
}
