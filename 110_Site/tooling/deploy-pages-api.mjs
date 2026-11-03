import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, site, output, publishable } from './paths.mjs';

const repository = 'repos/LarryHu1988/LarryHu1988.github.io';
export function github(path, method = 'GET', body) {
  return JSON.parse(execFileSync('gh', ['api', `${repository}/${path}`, '--method', method, ...(body ? ['--input', '-'] : [])], {
    encoding: 'utf8', input: body ? JSON.stringify(body) : undefined, timeout: 120000, maxBuffer: 32 * 1024 * 1024,
  }));
}
async function api(path, method = 'GET', body) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return github(path, method, body); }
    catch (error) { if (attempt === 2) throw error; await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1))); }
  }
}

export async function deployPages() {
  assert.equal(execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: root, encoding: 'utf8' }), '', 'Do not publish a build while source changes are in progress');
  const source = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  assert.equal((await api('git/ref/heads/main')).object.sha, source, 'Push the exact checked source commit before deploying');
  const oldHead = (await api('git/ref/heads/gh-pages')).object.sha;
  const oldCommit = await api(`git/commits/${oldHead}`);
  const oldTree = await api(`git/trees/${oldCommit.tree.sha}?recursive=1`);
  const mainTree = await api(`git/trees/${source}?recursive=1`);
  assert(!oldTree.truncated && !mainTree.truncated, 'Refusing an incomplete remote inventory');
  const known = new Set([...oldTree.tree, ...mainTree.tree].filter(e => e.type === 'blob').map(e => e.sha));
  const previous = new Map(oldTree.tree.filter(e => e.type === 'blob').map(e => [e.path, e.sha]));
  const files = new Map();
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (!publishable(path) && entry.name !== '.nojekyll') continue;
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) {
        const bytes = readFileSync(path);
        const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
        files.set(relative(output, path), { sha, bytes });
      }
    }
  }
  walk(output);
  const album = JSON.parse(readFileSync(join(site, 'content/photography.json'), 'utf8'));
  const photoFiles = new Set(album.photos.flatMap(photo => [photo.original, ...photo.variants]).map(image => image.src.slice(1)));
  for (const path of photoFiles) assert(files.has(path), `Photo missing from export: ${path}`);
  for (const path of files.keys()) if (path.startsWith('photography/assets/')) assert(photoFiles.has(path), 'Unlisted or temporary photo found in export');
  for (const required of ['CNAME', 'index.html', '.nojekyll', 'photography/index.html']) assert(files.has(required), `Incomplete export: ${required}`);
  const tree = [];
  for (const [path, file] of files) {
    if (previous.get(path) === file.sha) continue;
    const entry = { path, mode: '100644', type: 'blob' };
    if (known.has(file.sha)) entry.sha = file.sha;
    else {
      try { entry.content = new TextDecoder('utf-8', { fatal: true }).decode(file.bytes); assert(!entry.content.includes('\0')); }
      catch {
        delete entry.content;
        const blob = await api('git/blobs', 'POST', { content: file.bytes.toString('base64'), encoding: 'base64' });
        assert.equal(blob.sha, file.sha); entry.sha = blob.sha;
      }
    }
    tree.push(entry);
  }
  for (const [path] of previous) if (!files.has(path)) tree.push({ path, mode: '100644', type: 'blob', sha: null });
  if (!tree.length) return { source, deploy: oldHead, files: files.size, unchanged: true };
  const nextTree = await api('git/trees', 'POST', { base_tree: oldCommit.tree.sha, tree });
  const verified = await api(`git/trees/${nextTree.sha}?recursive=1`);
  assert(!verified.truncated);
  const blobs = verified.tree.filter(e => e.type === 'blob');
  assert.equal(blobs.length, files.size);
  for (const blob of blobs) assert.equal(blob.sha, files.get(blob.path)?.sha, blob.path);
  const commit = await api('git/commits', 'POST', {
    message: `deploy: Larry Studio (${source.slice(0, 7)})`, tree: nextTree.sha, parents: [oldHead],
    author: { name: 'Larry Hu', email: 'LarryHu1988@users.noreply.github.com' },
  });
  assert.equal((await api('git/ref/heads/gh-pages')).object.sha, oldHead, 'Another deployment started; retry without overwriting it');
  await api('git/refs/heads/gh-pages', 'PATCH', { sha: commit.sha, force: false });
  assert.equal((await api('git/ref/heads/gh-pages')).object.sha, commit.sha);
  const result = { source, deploy: commit.sha, files: files.size, treeMatchesExport: true, at: new Date().toISOString() };
  const report = join(root, '113_Local/reports/deployment/latest.json');
  mkdirSync(dirname(report), { recursive: true }); writeFileSync(report, JSON.stringify(result, null, 2));
  return result;
}


export async function verifyPages(commit) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const build = await api('pages/builds/latest');
    if (build.commit === commit && build.status === 'built') {
      const response = await fetch(`https://larryhu.com/photography/?v=${commit.slice(0, 12)}`, { signal: AbortSignal.timeout(60000) });
      if (!response.ok || !(await response.text()).includes('拾光听雨')) throw new Error('Published photo page failed live read-back');
      return build;
    }
    if (build.commit === commit && build.status === 'errored') throw new Error('GitHub Pages build failed');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  throw new Error('Pages deployment is still unverified; source and photos are retained for retry');
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = await deployPages(); console.log(JSON.stringify(result));
  if (process.argv.includes('--verify')) { await verifyPages(result.deploy); console.log('GitHub Pages is built and the live photo page is available.'); }
}
