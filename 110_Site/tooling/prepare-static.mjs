import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { site, products, publishable } from './paths.mjs';

mkdirSync(resolve(site, 'public'), { recursive: true });
for (const path of ['simpleworth', 'keepfit']) {
  const target = resolve(site, 'public', path);
  rmSync(target, { recursive: true, force: true });
  if (!process.argv.includes('--clean')) {
    cpSync(resolve(products, path), target, { recursive: true, filter: publishable });
  }
}
