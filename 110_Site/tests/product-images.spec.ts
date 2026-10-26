import { test, expect } from '@playwright/test';

const products = [
  { id: 'simpleworth', key: 'simpleworth-language', hero: '.phone-primary img', locale: 'en-US', screen: '01-expenses' },
  { id: 'keepfit', key: 'larry-product-language', hero: '.phone-front img', locale: 'en', screen: 'eat-overview' },
];

for (const product of products) {
  test(`${product.id} downloads only the preferred-language hero screens and defers the preview`, async ({ page }) => {
    const screens = new Set<string>();
    page.on('request', request => {
      if (/\/assets\/(?:zh|en)[^/]*\.webp/.test(request.url())) screens.add(new URL(request.url()).pathname);
    });
    await page.addInitScript(key => localStorage.setItem(key, 'en'), product.key);
    await page.goto(`/${product.id}/`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator(product.hero)).toHaveJSProperty('naturalWidth', 1320);
    expect([...screens].some(url => /\/zh(?:-|\.)/.test(url))).toBe(false);
    expect(screens.size).toBe(2);
    await expect(page.locator('#preview-image')).toHaveAttribute('src', /^data:image\/svg\+xml,/);

    await page.locator('#preview-image').evaluate(img => img.parentElement!.scrollIntoView({ block: 'center' }));
    await expect(page.locator('#preview-image')).toHaveAttribute('src', `assets/${product.locale}-${product.screen}.webp?v=native-lossless`);
    await expect(page.locator('#preview-image')).toHaveJSProperty('naturalWidth', 1320);
    await page.locator('[data-preview]').nth(1).click();
    await expect(page.locator('#preview-image')).toHaveJSProperty('naturalHeight', 2868);
    await page.locator('.language, .language-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await expect(page.locator('#preview-image')).toHaveAttribute('src', /^assets\/zh/);
    await expect(page.locator('#preview-image')).toHaveJSProperty('naturalWidth', 1320);
  });
}

test('product pages retain native images when JavaScript is disabled', async ({ browser, page }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: page.viewportSize()! });
  try {
    const fallback = await context.newPage();
    for (const product of products) {
      await fallback.goto(`http://127.0.0.1:4173/${product.id}/`);
      await expect(fallback.locator(`${product.hero}:visible`)).toHaveJSProperty('naturalWidth', 1320);
      for (const image of await fallback.locator('img[data-source]').all()) await expect(image).toBeHidden();
    }
  } finally { await context.close(); }
});

test('product pages fall back to eager originals without IntersectionObserver', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'IntersectionObserver', { value: undefined }); });
  for (const product of products) {
    await page.goto(`/${product.id}/`);
    for (const image of await page.locator('img[data-source]').all()) {
      await expect(image).not.toHaveAttribute('src', /^data:/);
      await expect(image).toHaveJSProperty('naturalWidth', 1320);
    }
  }
});

test('lossless display derivatives preserve native dimensions and every rendered pixel', async ({ page }) => {
  await page.goto('/');
  for (const source of ['/simpleworth/assets/icon.png', '/keepfit/assets/icon.png', '/images/pdf-workspace-1.5.0.png']) {
    const derivative = source.includes('pdf-workspace') ? source.replace('.png', '.optimized.png') : source.replace('.png', '.webp');
    const versions = await page.evaluate(async urls => {
      const result = [];
      for (const url of urls) {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const digest = await crypto.subtle.digest('SHA-256', pixels);
        result.push({ width: canvas.width, height: canvas.height, digest: Array.from(new Uint8Array(digest)).join(',') });
      }
      return result;
    }, [source, derivative]);
    expect(versions[1]).toEqual(versions[0]);
  }
});
