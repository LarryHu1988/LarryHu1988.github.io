import { cpSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
// Product sites retain their existing URLs and their independent release cycles.
for (const path of ['CNAME']) {
  cpSync(resolve(root, path), resolve(root, 'out', path), { recursive: true });
}
writeFileSync(resolve(root, 'out/.nojekyll'), '');
