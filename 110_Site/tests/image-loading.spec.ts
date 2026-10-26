import { test, expect } from '@playwright/test';
import issues from '../content/poetry-picture.json';

const latest = issues.at(-1)!;
const isCover = (url: string) => /\/poetry-picture\/\d{4}-\d{2}-\d{2}-cover\.webp/.test(url);

test('home defers offscreen app images, covers and reflections until approached', async ({ page }) => {
  const covers = new Set<string>();
  page.on('request', request => { if (isCover(request.url())) covers.add(request.url()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  // Exercise hydration before checking that no hidden covers were requested.
  await page.locator('.language-button').click();
  await page.locator('.language-button').click();
  expect(covers.size).toBe(0);
  await expect(page.locator('.album-art img')).toHaveCount(0);
  await expect(page.locator('.album-reflection[style*="url("]')).toHaveCount(0);
  await expect(page.locator('.app-card img').first()).toHaveAttribute('src', /^data:image\/svg\+xml,/);

  await page.locator('#apps').scrollIntoViewIfNeeded();
  const preview = page.locator('.simpleworth .phone-preview img');
  await page.locator('.app-card.simpleworth').scrollIntoViewIfNeeded();
  await expect.poll(() => preview.getAttribute('src')).toBe(await preview.getAttribute('data-deferred-src'));
  await expect(preview).toHaveJSProperty('naturalWidth', 1320);
  expect(covers.size).toBe(0);

  await page.locator('.poetry-player').scrollIntoViewIfNeeded();
  await expect(page.locator('.album-reflection[style*="url("]')).toHaveCount(5);
  expect(covers.size).toBe(5);
});

test('the current cover loads first and reflections cannot trigger early downloads', async ({ page }) => {
  const covers = new Set<string>();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/poetry-picture/*-cover.webp*', async route => {
    covers.add(new URL(route.request().url()).pathname);
    if (route.request().url().includes(latest.cover)) await gate;
    await route.continue();
  });
  try {
    await page.goto('/#poetry-picture', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.album-art img')).toHaveCount(1);
    await expect.poll(() => covers.size).toBe(1);
    expect([...covers]).toEqual([latest.cover.split('?')[0]]);
    await expect(page.locator('.album-reflection[style*="url("]')).toHaveCount(0);
  } finally {
    release();
  }
  await expect(page.locator('.album-reflection[style*="url("]')).toHaveCount(5);
  expect(covers.size).toBe(5);
  await expect(page.locator('.is-active .album-art img')).toHaveJSProperty('naturalWidth', latest.width);
});

test('deep links, keyboard navigation, slider jumps and revisits load only nearby native covers', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => { if (isCover(request.url())) requests.push(new URL(request.url()).pathname); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/?day=${issues[0].date}#poetry-picture`);
  const player = page.locator('.poetry-player');
  await expect(player.locator('.flow-caption h3')).toHaveText(issues[0].title);
  await expect(player.locator('.album-reflection[style*="url("]')).toHaveCount(5);
  expect(new Set(requests)).toEqual(new Set(issues.slice(0, 5).map(item => item.cover.split('?')[0])));

  const flow = player.locator('.cover-flow');
  await flow.focus();
  await flow.press('ArrowRight');
  await expect(player.locator('.flow-caption h3')).toHaveText(issues[1].title);
  await expect(player.locator('.album-reflection[style*="url("]')).toHaveCount(6);
  const before = requests.length;
  await flow.press('Home');
  await expect(player.locator('.flow-caption h3')).toHaveText(issues[0].title);
  expect(requests.length).toBe(before);

  const seek = player.locator('input[type="range"]');
  await seek.fill('10');
  await expect(player.locator('.flow-caption h3')).toHaveText(issues[10].title);
  await expect(player.locator('.is-active img')).toHaveJSProperty('naturalWidth', issues[10].width);
  await flow.focus();
  await flow.press('End');
  await expect(player.locator('.flow-caption h3')).toHaveText(latest.title);
  await expect(player.locator('.is-active img')).toHaveJSProperty('naturalWidth', latest.width);
});

test('tracklist thumbnails remain deferred and reading reuses the full-quality cover URL', async ({ page }) => {
  await page.goto('/poetry-picture/');
  const tracks = page.locator('.poetry-tracklist');
  await expect(tracks.locator('img').last()).toHaveAttribute('src', /^data:image\/svg\+xml,/);
  const first = tracks.locator('a').first();
  await first.scrollIntoViewIfNeeded();
  await expect(first.locator('img')).toHaveAttribute('src', issues[0].cover);
  await expect(first.locator('img')).toHaveJSProperty('naturalWidth', issues[0].width);
  await first.click();
  await expect(page).toHaveURL(`/poetry-picture/${issues[0].date}/`);
  await expect(page.locator('.daily-illustration img')).toHaveAttribute('src', issues[0].cover);
  await expect(page.locator('.daily-illustration img')).toHaveJSProperty('naturalWidth', issues[0].width);
  await expect(page.locator('.daily-illustration a')).toHaveAttribute('href', issues[0].cover);
});

test('a failed current image does not prevent nearby images from loading', async ({ page }) => {
  await page.route(`**${latest.cover}`, route => route.abort());
  await page.goto('/#poetry-picture');
  await expect(page.locator('.album-art img')).toHaveCount(5);
  await expect(page.locator('.album-reflection[style*="url("]')).toHaveCount(4);
});
