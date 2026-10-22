import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
mkdirSync(resolve(root, 'public'), { recursive: true });
for (const path of ['simpleworth', 'keepfit']) {
  cpSync(resolve(root, path), resolve(root, 'public', path), { recursive: true });
}
