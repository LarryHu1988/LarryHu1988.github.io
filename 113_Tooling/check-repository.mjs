import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { root, output, publishable } from './paths.mjs';

const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const files = git(['ls-files', '-z']).split('\0').filter(Boolean);
const privatePath = /(?:\/Users\/[A-Za-z0-9_.-]+\/|[A-Za-z]:\\Users\\[A-Za-z0-9_.-]+\\)/;
const textTypes = new Set(['.md', '.mjs', '.json', '.ts', '.tsx', '.css', '.html', '.svg', '.txt', '.py']);

for (const file of files) {
  assert(!/^(?:115_Local|119_Build|node_modules|\.next)\//.test(file), `Local-only file is tracked: ${file}`);
  assert(!/(?:^|\/)(?:\.env(?:\..*)?|id_rsa|id_ed25519)$|\.(?:pem|key|p12|pfx|sqlite|db|log)$/i.test(file), `Sensitive file name: ${file}`);
  if (textTypes.has(extname(file)) && existsSync(resolve(root, file))) {
    assert(!privatePath.test(readFileSync(resolve(root, file), 'utf8')), `Personal filesystem path: ${file}`);
  }
}
const readme = readFileSync(resolve(root, 'README.md'), 'utf8');
assert(!/开发与发布|内容维护|npm |Next\.js|gh-pages/.test(readme), 'README contains internal instructions');
for (const [, asset] of readme.matchAll(/(?:src="|\]\()(112_Brand\/[^"\s)]+)/g)) {
  assert(existsSync(resolve(root, asset)), `README image is missing: ${asset}`);
}
function inspect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (/ [0-9]+(?:\.[^.]+)?$/.test(entry.name) || entry.name === '.DS_Store') continue;
    if (entry.isDirectory()) inspect(path);
    else assert(publishable(path) || entry.name === '.nojekyll', `Internal or unsafe published file: ${entry.name}`);
  }
}
if (existsSync(output)) inspect(output);
if (process.argv.includes('--history')) {
  const identities = git(['log', '--all', '--format=%ae%n%ce']).trim().split('\n');
  assert(identities.every(email => email.endsWith('@users.noreply.github.com')), 'History contains a personal email or machine identity');
  assert(!privatePath.test(git(['log', '--all', '-p', '--format='])), 'History contains personal filesystem paths');
}
console.log(`Repository checks passed (${files.length} tracked files).`);
