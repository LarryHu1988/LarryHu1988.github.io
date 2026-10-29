import { test, expect } from '@playwright/test';

const sample = '跳跃者翻张封雪国土啊深诗情画意。';

test('Chinese serif text loads locally at real weights without changing the selected design', async ({ page }) => {
  const foreign: string[] = [];
  page.on('request', request => { if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) foreign.push(request.url()); });
  await page.goto('/poetry-picture/');
  await page.evaluate(async text => {
    const probe = document.createElement('span');
    probe.id = 'font-coverage-probe';
    probe.style.cssText = 'position:fixed;top:100px;left:20px;z-index:1000;font:500 24px "Studio Serif"';
    probe.textContent = text;
    document.body.append(probe);
    for (const weight of [400, 500, 600, 700]) {
      const faces = await document.fonts.load(`${weight} 24px "Studio Serif"`, text);
      if (!faces.length || faces.some(face => face.status !== 'loaded')) throw new Error(`Unloaded font weight ${weight}`);
    }
    await document.fonts.ready;
  }, sample);
  await expect(page.locator('.collection-heading h1')).toHaveCSS('font-weight', '500');
  await expect(page.locator('.flow-caption h2')).toHaveCSS('font-weight', '500');
  expect(foreign).toEqual([]);
  const requests = await page.evaluate(() => performance.getEntriesByType('resource').filter(entry => /\/fonts\/serif\//.test(entry.name)).map(entry => entry.name));
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.length).toBeLessThanOrEqual(4);
});

test('previously missing Chinese characters are actually rendered with Noto, not a system fallback', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Platform glyph inspection uses the Chromium debugging protocol.');
  await page.goto('/poetry-picture/');
  await page.evaluate(async text => {
    const probe = document.createElement('span');
    probe.id = 'font-platform-probe';
    probe.style.cssText = 'position:fixed;top:100px;left:20px;z-index:1000;font:500 24px "Studio Serif"';
    probe.textContent = text;
    document.body.append(probe);
    await document.fonts.load('500 24px "Studio Serif"', text);
    await document.fonts.ready;
  }, sample);
  const session = await page.context().newCDPSession(page);
  await session.send('DOM.enable'); await session.send('CSS.enable');
  const { root } = await session.send('DOM.getDocument');
  const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#font-platform-probe' });
  const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId });
  expect(fonts.length).toBeGreaterThan(0);
  expect(fonts.every(font => font.isCustomFont && font.familyName.startsWith('Noto Serif SC'))).toBe(true);
  expect(fonts.reduce((sum, font) => sum + font.glyphCount, 0)).toBe(sample.length);
});
