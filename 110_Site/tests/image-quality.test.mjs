import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { root } from '../tooling/paths.mjs';

function pngSize(path) {
  const bytes = readFileSync(resolve(root, path));
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG', path);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

function losslessWebpSize(path) {
  const bytes = readFileSync(resolve(root, path));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', path);
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', path);
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    assert.notEqual(type, 'VP8 ', `Lossy WebP: ${path}`);
    if (type === 'VP8L') {
      assert.equal(bytes[offset + 8], 0x2f, path);
      const bits = bytes.readUInt32LE(offset + 9);
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    offset += 8 + size + (size % 2);
  }
  assert.fail(`Missing lossless pixel data: ${path}`);
}

test('all phone screenshots retain native 1320 by 2868 lossless pixels', () => {
  let count = 0;
  for (const product of ['simpleworth', 'keepfit']) {
    const dir = `111_Products/${product}/assets`;
    for (const name of readdirSync(resolve(root, dir)).filter(name => name.endsWith('.webp') && name !== 'icon.webp')) {
      assert.deepEqual(losslessWebpSize(`${dir}/${name}`), [1320, 2868], name);
      count++;
    }
  }
  assert.equal(count, 18);
});

test('app icons and hosted README screenshots retain native PNG resolution', () => {
  for (const path of ['111_Products/simpleworth/assets/icon.png', '111_Products/keepfit/assets/icon.png', '110_Site/public/images/pdf-icon.png']) {
    assert.deepEqual(pngSize(path), [1024, 1024], path);
  }
  const dir = '111_Products/simpleworth/assets/github';
  const names = readdirSync(resolve(root, dir)).filter(name => /-(01-expenses|03-breakdown|04-income|05-savings)\.png$/.test(name));
  assert.equal(names.length, 8);
  for (const name of names) assert.deepEqual(pngSize(`${dir}/${name}`), [1320, 2868], name);
  assert.deepEqual(pngSize('110_Site/public/images/pdf-workspace-1.5.0.png'), [2880, 1800]);
  assert.deepEqual(losslessWebpSize('110_Site/public/images/pdf-overview.webp'), [2880, 1800]);
  assert.deepEqual(pngSize('110_Site/public/images/pdf-workspace-1.5.0.optimized.png'), [2880, 1800]);
  for (const path of ['111_Products/simpleworth/assets/icon.webp', '111_Products/keepfit/assets/icon.webp']) {
    assert.deepEqual(losslessWebpSize(path), [1024, 1024], path);
  }
});

test('poetry covers use the exact full-resolution approved illustration', () => {
  const poems = JSON.parse(readFileSync(resolve(root, '110_Site/content/poetry-picture.json'), 'utf8'));
  assert(poems.length > 0);
  for (const poem of poems) {
    const image = `110_Site/public${poem.image.split('?')[0]}`;
    const cover = `110_Site/public${poem.cover.split('?')[0]}`;
    assert.deepEqual(readFileSync(resolve(root, cover)), readFileSync(resolve(root, image)), poem.date);
    assert.deepEqual(losslessWebpSize(cover), [poem.width, poem.height], poem.date);
  }
});

test('vector-derived share and README cards are exported at high pixel density', () => {
  assert.deepEqual(pngSize('110_Site/public/social.png'), [3840, 2016]);
  for (const app of ['simpleworth', 'keepfit', 'pdflibrarian']) {
    assert.deepEqual(pngSize(`112_Brand/${app}.png`), [2160, 3000], app);
  }
});
