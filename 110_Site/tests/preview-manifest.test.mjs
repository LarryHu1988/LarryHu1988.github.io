import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { root } from '../tooling/paths.mjs';

test('clear previews are content-addressed, much smaller, and retain useful high-density dimensions', () => {
  const manifest = JSON.parse(readFileSync(resolve(root, '110_Site/content/image-previews.json'), 'utf8'));
  for (const [source, image] of Object.entries(manifest)) {
    const local = source.startsWith('/simpleworth/') || source.startsWith('/keepfit/') ? '111_Products' : '110_Site/public';
    assert.match(image.src, /\/previews\/[^/]+\.[a-f0-9]{12}\.webp$/);
    assert.equal(statSync(resolve(root, local + source)).size, image.nativeBytes, source);
    assert.equal(statSync(resolve(root, local + image.src)).size, image.bytes, source);
    assert(image.width <= image.nativeWidth && image.height <= image.nativeHeight, source);
    assert(image.bytes < image.nativeBytes * 0.6, source);
    if (source.includes('/poetry-picture/')) {
      assert.equal(image.width, image.nativeWidth, source);
      assert.equal(image.height, image.nativeHeight, source);
    } else if (image.nativeWidth === image.nativeHeight) assert(image.width >= 192, source);
    else if (image.nativeHeight > image.nativeWidth * 2) assert(image.width >= 880, source);
    else assert(image.width >= 1600, source);
    assert(image.variants.length >= 5, source);
    assert.equal(image.variants.at(-1).width, image.nativeWidth, source);
    let previous = 0;
    for (const variant of image.variants) {
      assert(variant.width > previous && variant.width <= image.nativeWidth, source);
      assert(variant.height <= image.nativeHeight, source);
      assert.match(variant.src, /\/previews\/.*\.w\d+\.[a-f0-9]{12}\.webp$/);
      assert.equal(statSync(resolve(root, local + variant.src)).size, variant.bytes, source);
      previous = variant.width;
    }
  }
});
