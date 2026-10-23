import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { site, products, output, publishable } from './paths.mjs';

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(resolve(site, 'out'), output, { recursive: true, filter: publishable });
for (const path of ['simpleworth', 'keepfit']) {
  cpSync(resolve(products, path), resolve(output, path), { recursive: true, filter: publishable });
}
cpSync(resolve(site, 'CNAME'), resolve(output, 'CNAME'));
writeFileSync(resolve(output, '.nojekyll'), '');
rmSync(resolve(site, 'out'), { recursive: true, force: true });
