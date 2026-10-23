import { fileURLToPath } from 'node:url';
import { basename, resolve } from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const site = resolve(root, '110_Site');
export const products = resolve(root, '111_Products');
export const output = resolve(root, '119_Build/site');

export function publishable(path) {
  const name = basename(path);
  return !name.startsWith('.')
    && !/ [0-9]+\.[^.]+$/.test(name)
    && !/^(?:credentials|secrets?)(?:\.|$)/i.test(name)
    && !/\.(?:icloud|map|env|pem|key|p12|pfx|log|sql|sqlite|db|md)$/i.test(name);
}
