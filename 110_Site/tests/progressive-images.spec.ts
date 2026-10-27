import { test, expect } from '@playwright/test';
import previews from '../content/image-previews.json';

const expense = '/simpleworth/assets/zh-Hans-01-expenses.webp?v=native-lossless';
const expensePreview = previews['/simpleworth/assets/zh-Hans-01-expenses.webp'].src;

test('a crisp preview remains visible while native downloads are stalled, then upgrades without layout shift', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const native = new Set<string>();
  await page.route(/\/(?:simpleworth|keepfit)\/assets\/(?!previews\/)[^/]+\.(?:webp|png)|\/images\/[^/]+\.png/, async route => {
    native.add(route.request().url());
    await gate;
    await route.continue();
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const image = page.locator('.simpleworth .phone-preview img');
  let before;
  try {
    await page.goto('/#apps', { waitUntil: 'domcontentloaded' });
    await page.locator('.app-card.simpleworth').scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute('data-image-stage', 'preview');
    await expect(image).toHaveAttribute('src', expensePreview);
    await expect(image).toHaveJSProperty('naturalWidth', 880);
    await expect.poll(() => native.size).toBe(2);
    before = await image.boundingBox();
  } finally { release(); }
  await expect(image).toHaveAttribute('src', expense);
  await expect(image).toHaveJSProperty('naturalWidth', 1320);
  const after = await image.boundingBox();
  expect(after!.width).toBeCloseTo(before!.width, 1);
  expect(after!.height).toBeCloseTo(before!.height, 1);
});

test('a missing preview falls back to the unmodified native image', async ({ page }) => {
  await page.route(`**${expensePreview}`, route => route.abort());
  await page.goto('/#apps');
  const image = page.locator('.simpleworth .phone-preview img');
  await expect(image).toHaveAttribute('data-image-stage', 'full');
  await expect(image).toHaveJSProperty('naturalWidth', 1320);
});

test('a failed original keeps a clear preview and upgrades when the connection returns', async ({ page }) => {
  await page.route(`**${expense}`, route => route.abort());
  await page.goto('/#apps');
  const image = page.locator('.simpleworth .phone-preview img');
  await expect(image).toHaveAttribute('data-original-error', 'true');
  await expect(image).toHaveAttribute('src', expensePreview);
  await expect(image).toHaveJSProperty('naturalWidth', 880);
  await page.unroute(`**${expense}`);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(image).toHaveAttribute('data-image-stage', 'full');
  await expect(image).toHaveAttribute('src', expense);
  await expect(image).toHaveJSProperty('naturalWidth', 1320);
});

test('a late original cannot replace a newer tab selection', async ({ page }) => {
  let releaseIncome!: () => void, releaseSavings!: () => void;
  const income = new Promise<void>(resolve => { releaseIncome = resolve; });
  const savings = new Promise<void>(resolve => { releaseSavings = resolve; });
  await page.route('**/en-US-04-income.webp?*', async route => { await income; await route.continue(); });
  await page.route('**/en-US-05-savings.webp?*', async route => { await savings; await route.continue(); });
  await page.addInitScript(() => localStorage.setItem('simpleworth-language', 'en'));
  const image = page.locator('#preview-image');
  try {
    await page.goto('/simpleworth/');
    await image.evaluate(img => img.parentElement!.scrollIntoView({ block: 'center' }));
    await page.locator('[data-preview="04-income"]').click();
    await expect(image).toHaveAttribute('data-image-stage', 'preview');
    await page.locator('[data-preview="05-savings"]').click();
    await expect(image).toHaveAttribute('data-original-src', 'assets/en-US-05-savings.webp?v=native-lossless');
    await expect(image).toHaveAttribute('data-image-stage', 'preview');
    releaseIncome();
    await expect(image).toHaveAttribute('data-original-src', 'assets/en-US-05-savings.webp?v=native-lossless');
    await expect(image).toHaveAttribute('src', /previews\/en-US-05-savings\./);
  } finally { releaseIncome(); releaseSavings(); }
  await expect(image).toHaveAttribute('src', 'assets/en-US-05-savings.webp?v=native-lossless');
  await expect(image).toHaveJSProperty('naturalWidth', 1320);
});
