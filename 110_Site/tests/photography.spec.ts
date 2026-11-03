import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import album from '../content/photography.json';

test('series names and eight-character subtitles remain consistent with the photo entry', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#apps-title')).toHaveText('码上有雨.');
  await expect(page.locator('#apps .section-heading')).toContainText('一码之间 尽是风雨');
  await expect(page.locator('#poetry .section-heading')).toContainText('以诗入雨 以意观心');
  await expect(page.locator('#photos-title')).toHaveText('拾光听雨.');
  await expect(page.locator('#photos .section-heading')).toContainText('拾光成册 听雨成诗');
  await page.locator('.photo-invitation').click();
  await expect(page).toHaveURL('/photography/');
  await expect(page.locator('h1')).toHaveText('拾光听雨.');
});

test('3D Book 2 actually completes page turns, supports keyboard navigation and fits the screen density', async ({ page, browserName }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/photography/');
  await expect.poll(async () => await page.locator('.photo-reader').getAttribute('class')).toMatch(/is-ready|is-unavailable/);
  if (await page.locator('.is-unavailable').count()) {
    expect(browserName).toBe('webkit');
    await expect(page.locator('.reader-unavailable a')).toHaveAttribute('href', '#photo-contact-sheet');
    return;
  }
  const canvas = page.locator('.photo-stage canvas');
  await expect(canvas).toHaveAttribute('data-ready', 'true');
  expect(await canvas.evaluate((element: HTMLCanvasElement) => element.width / element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(await page.evaluate(() => devicePixelRatio - .01));
  await page.locator('[data-next]').click();
  await expect.poll(async () => Number(await canvas.getAttribute('data-progress'))).toBe(1);
  await expect(page.locator('[data-previous]')).toBeEnabled();
  await canvas.focus(); await page.keyboard.press('Home');
  await expect.poll(async () => Number(await canvas.getAttribute('data-progress'))).toBe(0);
  await page.keyboard.press('End');
  await expect(page.locator('[data-next]')).toBeDisabled();
  await page.keyboard.press('Home');
  await expect.poll(async () => Number(await canvas.getAttribute('data-progress'))).toBe(0);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px overflow`).toBe(true);
  }
  await page.screenshot({ path: resolve(__dirname, '../../114_Build/checks', `photos-${test.info().project.name}.png`), fullPage: true });
  expect(errors).toEqual([]);
});

test('a missing WebGL context keeps the public photo collection accessible', async ({ page }) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type.startsWith('webgl') || type === 'experimental-webgl') return null;
      return Reflect.apply(get, this, [type, ...args]);
    } as typeof get;
  });
  await page.goto('/photography/');
  await expect(page.locator('.reader-unavailable')).toBeVisible();
  await expect(page.locator('#photo-contact-sheet')).toBeAttached();
  await expect(page.locator('h1')).toHaveText('拾光听雨.');
});

test('photo artwork contains every source edge, keeps its ratio and chooses enough pixels', async ({ page }) => {
  const source = readFileSync(resolve(__dirname, '../components/photobook/page-art.js'), 'utf8');
  await page.route('**/__photo-qa/page-art.mjs', route => route.fulfill({ contentType: 'text/javascript', body: source }));
  for (const [name, width, height] of [['wide', 1200, 400], ['tall', 400, 1200]] as const) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#00ff00"/><rect width="${width / 8}" height="${height}" fill="#ff0000"/><rect x="${width * 7 / 8}" width="${width / 8}" height="${height}" fill="#0000ff"/></svg>`;
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    await page.route(`**/__photo-qa/${name}.png`, route => route.fulfill({ contentType: 'image/png', body: buffer }));
  }
  await page.goto('/photography/');
  const results = await page.evaluate(async () => {
    const path = '/__photo-qa/page-art.mjs';
    const { renderPhotoPage } = await import(path);
    const output = [];
    for (const [name, width, height] of [['wide', 1200, 400], ['tall', 400, 1200]] as const) {
      const photo = { title: '留影 001', width, height, variants: [], original: { width, height, src: `/__photo-qa/${name}.png` } };
      const canvas = await renderPhotoPage({ kind: 'photo', photo }, 900, .75, false);
      const ctx = canvas.getContext('2d')!;
      const scale = Math.min(canvas.width * .86 / width, canvas.height * .77 / height);
      const dw = width * scale, dh = height * scale;
      const x = (canvas.width - dw) / 2, y = canvas.height * .47 - dh / 2;
      const color = (px: number, py: number) => [...ctx.getImageData(Math.round(px), Math.round(py), 1, 1).data].slice(0, 3);
      output.push({ left: color(x + dw * .03, y + dh * .1), right: color(x + dw * .97, y + dh * .9), middle: color(x + dw * .5, y + dh * .5), ratio: dw / dh, source: width / height });
    }
    return output;
  });
  for (const result of results) { expect(result.left).toEqual([255, 0, 0]); expect(result.right).toEqual([0, 0, 255]); expect(result.middle).toEqual([0, 255, 0]); expect(result.ratio).toBeCloseTo(result.source, 5); }
});

test('photo page remains accessible and keeps its traditional Chinese selection', async ({ page }) => {
  await page.goto('/photography/');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
  await page.locator('.language-button').click();
  await expect(page.locator('h1')).toHaveText('拾光聽雨.');
  await expect(page.locator('.photography-heading > p:last-child')).toHaveText('拾光成冊 聽雨成詩');
  await expect.poll(async () => await page.locator('.photo-reader').getAttribute('class')).toMatch(/is-ready|is-unavailable/);
  if (!await page.locator('.is-unavailable').count()) {
    await page.locator('[data-next]').click();
    await expect.poll(async () => Number(await page.locator('canvas').getAttribute('data-progress'))).toBe(1);
  }
});

test('published photo cards use screen-density variants and open the full native image', async ({ page }) => {
  test.skip(!album.photos.length, 'No personal photographs have been supplied yet.');
  const first = album.photos[0] as { width: number; height: number; original: { src: string; width: number }; variants: { src: string; width: number }[] };
  await page.goto('/photography/');
  const card = page.locator('.photo-grid a').first(), image = card.locator('img');
  await card.scrollIntoViewIfNeeded();
  await expect(image).toHaveJSProperty('complete', true);
  const info = await image.evaluate((element: HTMLImageElement) => ({ source: new URL(element.currentSrc).pathname, width: element.getBoundingClientRect().width, ratio: element.getBoundingClientRect().width / element.getBoundingClientRect().height, density: devicePixelRatio, fit: getComputedStyle(element).objectFit }));
  const variant = [...first.variants, first.original].find(item => item.src === info.source)!;
  expect(variant.width).toBeGreaterThanOrEqual(Math.min(first.width, info.width * info.density) - 1);
  expect(info.ratio).toBeCloseTo(first.width / first.height, 2); expect(info.fit).toBe('contain');
  await card.click();
  await expect(page.locator('dialog')).toBeVisible();
  await expect(page.locator('dialog img')).toHaveAttribute('src', first.original.src);
  await expect(page.locator('dialog img')).toHaveJSProperty('complete', true);
  expect(await page.locator('dialog img').evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(first.width);
  await page.keyboard.press('Escape'); await expect(page.locator('dialog')).not.toBeVisible();
});
