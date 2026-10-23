import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import poems from '../110_Site/content/poems.json';

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
  for (const image of await page.locator('.app-card img').all()) {
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  }
  await page.locator('#poetry').scrollIntoViewIfNeeded();
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `119_Build/checks/${testInfo.project.name}-home.png`, fullPage: true, animations: 'disabled' });
  expect(errors).toEqual([]);
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
