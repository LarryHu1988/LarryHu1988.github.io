import { test, expect } from '@playwright/test';
import previews from '../content/image-previews.json';
import { expectDisplay } from './image-assertions';

const expense = '/simpleworth/assets/zh-Hans-01-expenses.webp?v=native-lossless';
const nativeAsset = /\/(?:simpleworth|keepfit)\/assets\/(?!previews\/)[^/]+\.(?:webp|png)|\/images\/[^/]+\.png/;

test('small cards never download originals and retain enough pixels for the current screen', async ({ page }) => {
  const native: string[] = [];
  page.on('request', request => { if (nativeAsset.test(request.url())) native.push(request.url()); });
  await page.goto('/#apps');
  for (const card of await page.locator('.app-card').all()) {
    await card.scrollIntoViewIfNeeded();
    for (const image of await card.locator('img').all()) await expectDisplay(image);
  }
  expect(native).toEqual([]);
});

test('1x through 4x screens select the first candidate at least as large as the required pixel width', async ({ browser }) => {
  for (const deviceScaleFactor of [1, 2, 3, 4]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:4173/#apps');
      const image = page.locator('.simpleworth .phone-preview img');
      await image.scrollIntoViewIfNeeded();
      await expectDisplay(image);
      const required = Number(await image.getAttribute('data-required-width'));
      const selected = previews[expense.split('?')[0] as keyof typeof previews].variants.find(item => item.width >= required)!;
      await expect(image).toHaveJSProperty('naturalWidth', selected.width);
      expect(required).toBeGreaterThan(140 * deviceScaleFactor);
    } finally { await context.close(); }
  }
});

test('resizing or changing display density upgrades without blanking, shifting layout or downloading an original', async ({ page }) => {
  await page.goto('/#apps');
  const image = page.locator('.simpleworth .phone-preview img');
  await image.scrollIntoViewIfNeeded();
  await expectDisplay(image);
  await image.evaluate(node => {
    node.parentElement!.style.width = '300px';
    Object.defineProperty(window, 'devicePixelRatio', { value: 4, configurable: true });
    window.dispatchEvent(new Event('resize'));
  });
  await expect.poll(async () => Number(await image.getAttribute('data-required-width'))).toBeGreaterThan(1100);
  await expectDisplay(image);
  const before = await image.boundingBox();
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await expectDisplay(image);
  expect(await image.boundingBox()).toEqual(before);
});

test('a failed size candidate retains a clear fallback and retries after reconnecting', async ({ page }) => {
  await page.route('**/previews/zh-Hans-01-expenses.w*.webp', route => route.abort());
  await page.goto('/#apps');
  const image = page.locator('.simpleworth .phone-preview img');
  await image.scrollIntoViewIfNeeded();
  await expect(image).toHaveAttribute('data-original-error', 'true');
  await expect(image).toHaveAttribute('src', previews['/simpleworth/assets/zh-Hans-01-expenses.webp'].src);
  await expect(image).toHaveJSProperty('naturalWidth', 880);
  await page.unroute('**/previews/zh-Hans-01-expenses.w*.webp');
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expectDisplay(image);
});

test('opening a product screenshot downloads the unchanged native original, not the card derivative', async ({ page, context }) => {
  await page.addInitScript(() => localStorage.setItem('simpleworth-language', 'zh'));
  const requests: string[] = [];
  context.on('request', request => { if (request.url().endsWith(expense)) requests.push(request.url()); });
  await page.goto('/simpleworth/');
  const image = page.locator('#preview-image');
  await image.scrollIntoViewIfNeeded();
  await expectDisplay(image);
  expect(requests).toEqual([]);
  const next = context.waitForEvent('page');
  await image.focus();
  await image.press('Enter');
  const original = await next;
  try {
    await expect(original).toHaveURL(new RegExp(expense.replace('?', '\\?') + '$'));
    await expect(original.locator('img')).toHaveJSProperty('naturalWidth', 1320);
    await expect(original.locator('img')).toHaveJSProperty('naturalHeight', 2868);
  } finally { await original.close(); }
  expect(requests).toHaveLength(1);
});

test('a late old candidate cannot replace a newer screenshot selection', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/previews/en-US-04-income.w*.webp', async route => { await gate; await route.continue(); });
  await page.addInitScript(() => localStorage.setItem('simpleworth-language', 'en'));
  const image = page.locator('#preview-image');
  try {
    await page.goto('/simpleworth/');
    await image.scrollIntoViewIfNeeded();
    await expectDisplay(image);
    await page.locator('[data-preview="04-income"]').click();
    await page.locator('[data-preview="05-savings"]').click();
    await image.scrollIntoViewIfNeeded();
    await expectDisplay(image);
    release();
    await expect(image).toHaveAttribute('src', /previews\/en-US-05-savings\.w/);
    await expect(image).toHaveAttribute('data-original-src', 'assets/en-US-05-savings.webp?v=native-lossless');
  } finally { release(); }
});

test('the shared queue starts the foreground first and holds background concurrency at two', async ({ page }) => {
  const keys = Object.keys(previews).filter(source => source.includes('/poetry-picture/')).slice(0, 3) as (keyof typeof previews)[];
  const starts: string[] = [];
  const releases = new Map<string, () => void>();
  await page.route('**/poetry-picture/previews/*-cover.w*.*.webp?queue-fixture=1', async route => {
    const path = new URL(route.request().url()).pathname;
    starts.push(path);
    await new Promise<void>(resolve => releases.set(path, resolve));
    await route.continue();
  });
  try {
    await page.goto('/');
    await page.evaluate(async items => {
      const moduleURL = '/scripts/progressive-images.js?queue-check';
      const { loadDisplayImage } = await import(moduleURL);
      for (const [index, item] of items.entries()) {
        const image = document.createElement('img');
        image.id = `queue-image-${index}`;
        image.style.cssText = `position:fixed;top:${index * 185 + 100}px;left:10px;width:100px;height:178px;z-index:1000`;
        document.body.append(image);
        loadDisplayImage(image, item.source, { [item.source]: item.info }, { priority: index === 1 ? 'high' : 'low' });
      }
    }, keys.map(source => ({ source, info: { ...previews[source], variants: previews[source].variants.map(variant => ({ ...variant, src: variant.src + '?queue-fixture=1' })) } })));
    await expect.poll(() => starts.length).toBe(2);
    expect(starts[0]).toContain(keys[1].split('/').at(-1)!.replace('.webp', '.w'));
    for (const release of releases.values()) release();
    await expect.poll(() => starts.length).toBe(3);
    for (const release of releases.values()) release();
    for (let index = 0; index < 3; index++) await expectDisplay(page.locator(`#queue-image-${index}`));
  } finally { for (const release of releases.values()) release(); }
});

test('pinch zoom requests more real pixels without exceeding the native resolution', async ({ page, context }) => {
  await page.goto('/#apps');
  const image = page.locator('.simpleworth .phone-preview img');
  await image.scrollIntoViewIfNeeded();
  await expectDisplay(image);
  const before = Number(await image.getAttribute('data-required-width'));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  await expect.poll(() => page.evaluate(() => window.visualViewport!.scale)).toBe(2);
  await expect.poll(async () => Number(await image.getAttribute('data-required-width'))).toBeGreaterThan(before);
  await expectDisplay(image);
  expect(await image.evaluate((n: HTMLImageElement) => n.naturalWidth)).toBeLessThanOrEqual(1320);
});
