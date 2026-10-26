import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { resolve } from 'node:path';
import poems from '../content/poems.json';

test('home keeps the selected content and real product images', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('写代码');
  await expect(page.locator('.rain-drawing')).toBeVisible();
  await expect(page.getByText('雨的形状', { exact: true })).toHaveCount(0);
  await expect(page.getByText('FIELD NOTES / 001', { exact: true })).toHaveCount(0);
  await expect(page.locator('.study-caption')).toContainText('一滴水，一个小小的世界。');
  await expect(page.locator('.app-card')).toHaveCount(3);
  await expect(page.locator('.poem-card')).toHaveCount(2);
  await expect(page.locator('#sports, #insight, #notes, #melody, #cinema')).toHaveCount(0);
  await page.locator('#apps').scrollIntoViewIfNeeded();
  for (const card of await page.locator('.app-card').all()) {
    await card.scrollIntoViewIfNeeded();
    for (const image of await card.locator('img').all()) {
      await expect.poll(() => image.getAttribute('src')).toBe(await image.getAttribute('data-deferred-src'));
      await expect(image).toHaveJSProperty('complete', true);
      expect(await image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    }
  }
  await page.locator('#poetry').scrollIntoViewIfNeeded();
  await page.locator('.poetry-player').scrollIntoViewIfNeeded();
  await expect(page.locator('.album-reflection[style*="url("]')).toHaveCount(5);
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: resolve(__dirname, '../../119_Build/checks', `${testInfo.project.name}-home.png`), fullPage: true, animations: 'disabled' });
  expect(errors).toEqual([]);
});

test('PDF Librarian centers a computer window with the complete native screenshot at every breakpoint', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const visual = page.locator('.pdflibrarian .app-visual');
  const image = visual.locator('img');
  await visual.scrollIntoViewIfNeeded();
  await expect(image).toHaveJSProperty('complete', true);
  await expect(image).toHaveJSProperty('naturalWidth', 2880);
  await expect(image).toHaveJSProperty('naturalHeight', 1800);
  await expect(image).toHaveAttribute('src', '/images/pdf-workspace-1.5.0.png');
  await expect(visual.locator('.mac-titlebar')).toHaveCount(1);
  for (const width of [320, 375, 390, 600, 768, 850, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const hover of [false, true]) {
      if (hover) await visual.hover();
      else await page.mouse.move(0, 0);
      const geometry = await image.evaluate(element => {
        const parent = element.closest('.app-visual')!;
        const bounds = parent.getBoundingClientRect();
        const image = element.getBoundingClientRect();
        const rect = element.closest('.mac-window')!.getBoundingClientRect();
        const titlebar = parent.querySelector('.mac-titlebar')!.getBoundingClientRect();
        return {
          x: Math.abs(rect.x + rect.width / 2 - bounds.x - bounds.width / 2),
          y: Math.abs(rect.y + rect.height / 2 - bounds.y - bounds.height / 2),
          ratio: image.width / image.height,
          contained: rect.x >= bounds.x && rect.y >= bounds.y && rect.right <= bounds.right && rect.bottom <= bounds.bottom && image.x >= rect.x && image.right <= rect.right && image.y >= titlebar.bottom && image.bottom <= rect.bottom,
          fit: getComputedStyle(element).objectFit,
          transform: getComputedStyle(element.parentElement!).transform,
        };
      });
      expect(geometry.x, `horizontal center at ${width}px`).toBeLessThan(1);
      expect(geometry.y, `vertical center at ${width}px`).toBeLessThan(1);
      expect(geometry.ratio, `native screenshot ratio at ${width}px`).toBeCloseTo(1.6, 2);
      expect(geometry.contained, `uncropped screenshot at ${width}px`).toBe(true);
      expect(geometry.fit).toBe('contain');
      expect(geometry.transform).toBe('none');
    }
  }
});

test('poems preserve every original line and navigate correctly', async ({ page }) => {
  await page.goto('/');
  await page.locator('.poem-card').first().click();
  await expect(page).toHaveURL(/poems\/second-granduncle\//);
  const stanzas = await page.locator('.poem-full p').allTextContents();
  expect(stanzas.join('\n\n')).toBe(poems[0].content);
  await page.locator('.next-poem').click();
  await expect(page).toHaveURL(/poems\/performance\//);
  expect((await page.locator('.poem-full p').allTextContents()).join('\n\n')).toBe(poems[1].content);
  await page.locator('.reading-back').click();
  await expect(page).toHaveURL('/#poetry');
});

test('language preference survives reload and navigation', async ({ page }) => {
  await page.goto('/');
  await page.locator('.language-button').click();
  await expect(page.locator('#about-title')).toHaveText('滴水龍雨.');
  await expect(page.locator('.bio-chinese')).toContainText('踢實況');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
  await expect(page.locator('#apps-title')).toHaveText('數碼雨飯.');
});

test('product pages and legal routes remain available', async ({ request }) => {
  for (const path of ['/simpleworth/', '/simpleworth/support/', '/simpleworth/privacy/', '/keepfit/', '/keepfit/support/', '/keepfit/privacy/']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
  }
  const response = await request.get('/not-a-real-page/');
  expect(response.status()).toBe(404);
});

test('navigation works on mobile and layout stays within the viewport', async ({ page }, testInfo) => {
  await page.goto('/');
  if (testInfo.project.name === 'mobile') {
    await page.locator('.menu-button').click();
    await expect(page.locator('#mobile-nav')).toBeVisible();
    await page.locator('#mobile-nav a').nth(1).click();
    await expect(page).toHaveURL('/#apps');
    await expect(page.locator('#mobile-nav')).toBeHidden();
  }
  for (const width of [320, 375, 390, 600, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `overflow at ${width}px`).toBe(true);
  }
});

test('home and reading page meet accessibility rules', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of ['/', '/poems/performance/']) {
    await page.goto(path);
    for (const element of await page.locator('[data-reveal]').all()) await element.scrollIntoViewIfNeeded();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, reason: node.failureSummary })) }))).toEqual([]);
  }
});
