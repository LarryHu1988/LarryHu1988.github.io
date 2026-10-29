import { test, expect, type Locator } from '@playwright/test';

async function visiblePhoto(image: Locator) {
  await image.scrollIntoViewIfNeeded();
  await expect(image).not.toHaveAttribute('src', /^data:/);
  await expect.poll(() => image.evaluate((n: HTMLImageElement) => n.complete && n.naturalWidth > 0 && !n.currentSrc.startsWith('data:'))).toBe(true);
  await expect.poll(() => image.evaluate(n => {
    for (let parent: Element | null = n; parent; parent = parent.parentElement) {
      if (Number(getComputedStyle(parent).opacity) < 0.98) return false;
    }
    return true;
  })).toBe(true);
}

test('homepage photos render with JavaScript enabled but every application bundle blocked', async ({ page }) => {
  await page.route(/\/_next\/.*\.js(?:\?|$)/, route => route.abort());
  await page.goto('/#apps', { waitUntil: 'domcontentloaded' });
  for (const card of await page.locator('.app-card').all()) {
    for (const image of await card.locator('img').all()) await visiblePhoto(image);
  }
  await visiblePhoto(page.locator('.is-active .album-art img'));
});

test('product screenshots render even when their module and shared loader are blocked', async ({ page }) => {
  await page.route(/\/(?:simpleworth|site|progressive-images)\.js(?:\?|$)/, route => route.abort());
  for (const product of ['simpleworth', 'keepfit']) {
    await page.goto(`/${product}/`, { waitUntil: 'domcontentloaded' });
    await visiblePhoto(page.locator('.hero img[data-source]').last());
    await visiblePhoto(page.locator('#preview-image'));
  }
});

test('clipped mockups remain visible when IntersectionObserver never reports an intersection', async ({ page }) => {
  await page.addInitScript(() => {
    window.IntersectionObserver = class {
      root = null; rootMargin = ''; thresholds = [0];
      constructor(private callback: IntersectionObserverCallback) {}
      observe(target: Element) {
        if (!(target instanceof HTMLImageElement)) queueMicrotask(() => this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
      }
      unobserve() {} disconnect() {} takeRecords() { return []; }
    } as unknown as typeof IntersectionObserver;
  });
  await page.goto('/#apps', { waitUntil: 'domcontentloaded' });
  for (const image of await page.locator('.app-card img').all()) await visiblePhoto(image);
});

test('browser-visible photos do not depend on the enhancement decode queue resolving', async ({ page }) => {
  await page.addInitScript(() => { HTMLImageElement.prototype.decode = () => new Promise(() => {}); });
  await page.goto('/#apps', { waitUntil: 'domcontentloaded' });
  for (const image of await page.locator('.app-card img').all()) await visiblePhoto(image);
  await visiblePhoto(page.locator('.is-active .album-art img'));
});

test('normal browsing renders and enhances every visible card without script errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#apps');
  for (const card of await page.locator('.app-card').all()) {
    for (const image of await card.locator('img').all()) {
      await visiblePhoto(image);
      await expect(image).toHaveAttribute('data-image-stage', 'display');
    }
  }
  expect(errors).toEqual([]);
});
