import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root, output, publishable } from '../tooling/paths.mjs';

test('numbered workspace folders retain the consecutive source/private/build contract', () => {
  for (const path of ['110_Site', '111_Products', '112_Brand']) assert(existsSync(resolve(root, path)), path);
  assert.equal(output, resolve(root, '114_Build/site'));
  const ignore = readFileSync(resolve(root, '.gitignore'), 'utf8');
  for (const path of ['113_Local/', '114_Build/']) assert(ignore.split('\n').includes(path), path);
});

test('entry files live in folders without breaking repository discovery', () => {
  for (const path of ['.github/README.md', '110_Site/package.json', '110_Site/package-lock.json']) {
    assert(existsSync(resolve(root, path)), path);
  }
  for (const path of ['README.md', 'package.json', 'package-lock.json']) {
    assert.equal(existsSync(resolve(root, path)), false, path);
  }
});

test('publishing retains site assets and license files', () => {
  for (const path of ['site/index.html', 'site/_next/chunks/app.js', 'site/fonts/OFL.txt', 'site/assets/screen.png', 'site/CNAME']) {
    assert(publishable(path), path);
  }
});

test('publishing excludes private, internal and iCloud conflict files', () => {
  for (const path of ['site/.env', 'site/config.env', 'site/key.pem', 'site/secrets.json', 'site/README.md', 'site/app.js.map', 'site/screen 2.png', 'site/CNAME 2', 'site/.DS_Store', 'site/cache.sqlite', 'site/file.icloud']) {
    assert.equal(publishable(path), false, path);
  }
});
