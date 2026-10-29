import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { root, site } from '../tooling/paths.mjs';
import { checkFonts, digest, fontNeeds, unicodeRanges } from '../tooling/site-fonts.mjs';

test('current Chinese copy and every published poem are covered by local variable fonts', () => {
  const result = checkFonts();
  assert.equal(result.missing.length, 0);
  for (const char of '跳跃翻张封雪国土啊深。.“”') assert(result.covered.has(char), char);
});

test('the approved base font and its license remain byte-for-byte unchanged', () => {
  for (const name of ['noto-serif-sc.woff2', 'OFL-noto-serif-sc.txt']) {
    const original = execFileSync('git', ['show', `HEAD:110_Site/public/fonts/${name}`], { cwd: root });
    assert.equal(digest(readFileSync(resolve(site, 'public/fonts', name))), digest(original));
  }
});

test('font packs are bounded and critical preloads exclude article-only glyphs', () => {
  const result = checkFonts();
  let criticalBytes = 0;
  for (const subset of result.manifest.subsets) {
    assert([...subset.characters].length <= 128);
    assert(subset.bytes < 128 * 1024);
    assert(subset.source.startsWith('https://fonts.gstatic.com/'));
    if (subset.critical) criticalBytes += subset.bytes;
  }
  assert(criticalBytes < 128 * 1024, `Critical supplement is ${criticalBytes} bytes`);
  assert(result.manifest.subsets.some(subset => !subset.critical));
});

test('new poems including escaped and supplementary-plane Chinese characters are detected automatically', () => {
  const fixture = mkdtempSync(resolve(tmpdir(), 'studio-font-needs-'));
  try {
    for (const directory of ['app', 'components', 'content']) mkdirSync(resolve(fixture, directory));
    writeFileSync(resolve(fixture, 'content/poetry-picture.json'), '[{"title":"\\u8df3\\u8dc3者","author":"海子","poem":["𠀀"]}]');
    const result = fontNeeds(fixture);
    for (const char of '跳跃者海子𠀀') assert(result.required.has(char), char);
    assert(result.critical.has('跳'));
    assert(result.catalogue.has('跃'));
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});

test('CSS unicode ranges encode complete code points and merge only contiguous ranges', () => {
  assert.equal(unicodeRanges('ABC跳跃𠀀'), 'U+41-43,U+8DC3,U+8DF3,U+20000');
});

test('publishing refuses a new missing character instead of silently mixing in a system font', () => {
  const fixture = mkdtempSync(resolve(tmpdir(), 'studio-font-guard-'));
  try {
    for (const directory of ['app', 'components', 'content']) mkdirSync(resolve(fixture, directory));
    cpSync(resolve(site, 'public/fonts'), resolve(fixture, 'public/fonts'), { recursive: true });
    cpSync(resolve(site, 'content/font-subsets.json'), resolve(fixture, 'content/font-subsets.json'));
    cpSync(resolve(site, 'app/generated-fonts.css'), resolve(fixture, 'app/generated-fonts.css'));
    writeFileSync(resolve(fixture, 'content/poetry-picture.json'), JSON.stringify([{ title: '跳跃者', author: '海子', poem: ['𠀀'] }]));
    assert.throws(() => checkFonts(fixture), /missing.*fonts:sync/);
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
