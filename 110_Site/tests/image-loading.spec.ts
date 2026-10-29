import { test, expect } from '@playwright/test';
import issues from '../content/poetry-picture.json';
import { expectDisplay } from './image-assertions';

const latest = issues.at(-1)!;
const isNativeCover = (url: string) => /\/poetry-picture\/\d{4}-\d{2}-\d{2}-cover\.webp/.test(url);

test('home defers offscreen covers and never downloads native covers while browsing cards', async ({ page }) => {
  const covers: string[] = [];
  page.on('request', request => { if (isNativeCover(request.url())) covers.push(request.url()); });
  await page.goto('/');
  await page.locator('.language-button').click();
  await page.locator('.language-button').click();
  await expect(page.locator('.album-art img')).toHaveCount(0);
  await expect(page.locator('.album-reflection[style*="url("]')).toHaveCount(0);
  await page.locator('.app-card.simpleworth').scrollIntoViewIfNeeded();
  await expectDisplay(page.locator('.simpleworth .phone-preview img'));
  await expect(page.locator('.album-art img')).toHaveCount(0);
  await page.locator('.poetry-player').scrollIntoViewIfNeeded();
  await expectDisplay(page.locator('.is-active img'));
  await expect(page.locator('.is-active .album-reflection')).toHaveAttribute('style', /previews\//);
  expect(covers).toEqual([]);
});

test('the selected sleeve loads before any neighboring covers and reflections reuse the selected derivative', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const covers = new Set<string>();
  page.on('request', request => { if (/\/poetry-picture\/previews\/.*\.w\d+\./.test(request.url())) covers.add(request.url()); });
  await page.route(`**/poetry-picture/previews/${latest.date}-cover.w*.webp`, async route => { await gate; await route.continue(); });
  try {
    await page.goto('/#poetry-picture', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.album-art img')).toHaveCount(1);
    await expect.poll(() => covers.size).toBeGreaterThan(0);
    expect([...covers].every(url => url.includes(latest.date))).toBe(true);
  } finally { release(); }
  const selected = page.locator('.is-active img');
  await expectDisplay(selected);
  await expect(page.locator('.album-art img')).toHaveCount(5);
  await expect(page.locator('.is-active .album-reflection')).toHaveAttribute('style', new RegExp((await selected.getAttribute('src'))!.replaceAll('.', '\\.')));
});

test('deep links, keyboard navigation and slider changes retain adequate resolution without native downloads', async ({ page }) => {
  const native: string[] = [];
  page.on('request', request => { if (isNativeCover(request.url())) native.push(request.url()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/?day=${issues[0].date}#poetry-picture`);
  const player = page.locator('.poetry-player');
  const active = player.locator('.is-active img');
  await expect(player.locator('.flow-caption h3')).toHaveText(issues[0].title);
  await expectDisplay(active);
  const flow = player.locator('.cover-flow');
  await flow.focus(); await flow.press('ArrowRight');
  await expect(player.locator('.flow-caption h3')).toHaveText(issues[1].title);
  await expectDisplay(active);
  await flow.press('Home');
  await expect(player.locator('.flow-caption h3')).toHaveText(issues[0].title);
  await expectDisplay(active);
  await player.locator('input[type="range"]').fill('10');
  await expect(player.locator('.flow-caption h3')).toHaveText(issues[10].title);
  await expectDisplay(active);
  await flow.focus(); await flow.press('End');
  await expect(player.locator('.flow-caption h3')).toHaveText(latest.title);
  await expectDisplay(active);
  expect(native).toEqual([]);
});

test('tracklist thumbnails stay small while opening a reading page retains its full native illustration', async ({ page }) => {
  await page.goto('/poetry-picture/');
  const tracks = page.locator('.poetry-tracklist');
  await expect(tracks.locator('img').last()).toHaveAttribute('src', /^data:image\/svg\+xml,/);
  const first = tracks.locator('a').first();
  await first.scrollIntoViewIfNeeded();
  await expectDisplay(first.locator('img'));
  expect(await first.locator('img').evaluate((n: HTMLImageElement) => n.naturalWidth)).toBeLessThanOrEqual(192);
  await first.click();
  await expect(page).toHaveURL(`/poetry-picture/${issues[0].date}/`);
  await expect(page.locator('.daily-illustration img')).toHaveAttribute('data-image-stage', 'full');
  await expect(page.locator('.daily-illustration img')).toHaveJSProperty('naturalWidth', issues[0].width);
  await expect(page.locator('.daily-illustration a')).toHaveAttribute('href', issues[0].cover);
});

test('a failed display derivative keeps a clear preview and does not block neighboring covers', async ({ page }) => {
  await page.route(`**/poetry-picture/previews/${latest.date}-cover.w*.webp`, route => route.abort());
  await page.goto('/#poetry-picture');
  await expect(page.locator('.is-active img')).toHaveAttribute('data-original-error', 'true');
  await expect(page.locator('.is-active img')).toHaveAttribute('data-image-stage', 'preview');
  await expect(page.locator('.is-active img')).toHaveJSProperty('naturalWidth', latest.width);
  await expect(page.locator('.album-art img')).toHaveCount(5);
});
