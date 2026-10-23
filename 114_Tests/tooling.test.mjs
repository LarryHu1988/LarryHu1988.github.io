import test from 'node:test';
import assert from 'node:assert/strict';
import { publishable } from '../113_Tooling/paths.mjs';

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
