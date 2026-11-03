import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, site } from './paths.mjs';
import { photoInbox, photoSnapshot, syncPhotos } from './photo-library.mjs';
import { deployPages, github, verifyPages } from './deploy-pages-api.mjs';

const local = join(root, '113_Local/photo-sync');
const lock = join(local, 'publishing.lock');
const stateFile = join(local, 'watcher.json');
const networkFile = join(local, 'network.json');
function restoreNetwork() {
  if (existsSync(networkFile)) for (const [key, value] of Object.entries(JSON.parse(readFileSync(networkFile, 'utf8')))) {
    if (/^(?:https?_proxy|all_proxy|no_proxy)$/i.test(key) && typeof value === 'string') process.env[key] = value;
  }
}
const allowed = /^(?:110_Site\/content\/photography\.json|110_Site\/public\/photography\/assets\/[a-f0-9]{24}\.webp)$/;
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', timeout: 120000 }).trim();
const run = args => execFileSync(process.execPath, args, { cwd: site, stdio: 'inherit', timeout: 600000 });
const save = state => {
  writeFileSync(stateFile + '.tmp', JSON.stringify(state, null, 2) + '\n');
  renameSync(stateFile + '.tmp', stateFile);
};

export function safePhotoPaths(status) {
  const records = status.split('\0').filter(Boolean);
  return records.every(record => !/[RC]/.test(record.slice(0, 2)) && allowed.test(record.slice(3)));
}

async function checkOnce() {
  restoreNetwork();
  mkdirSync(photoInbox, { recursive: true }); mkdirSync(local, { recursive: true });
  if (existsSync(join(local, 'PAUSED'))) return;
  try { mkdirSync(lock); }
  catch {
    if (existsSync(join(lock, 'pid'))) {
      const pid = Number(readFileSync(join(lock, 'pid'), 'utf8'));
      try { process.kill(pid, 0); return; } catch { rmSync(lock, { recursive: true, force: true }); return; }
    }
    if (Date.now() - statSync(lock).mtimeMs > 600000) rmSync(lock, { recursive: true, force: true });
    return;
  }
  writeFileSync(join(lock, 'pid'), String(process.pid));
  try {
    const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : {};
    const snapshot = JSON.stringify(photoSnapshot());
    if (state.snapshot === snapshot && !state.pending) return;
    if (state.failureSnapshot === snapshot && Date.now() < state.retryAfter) return;
    const status = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: root, encoding: 'utf8' });
    if (!safePhotoPaths(status)) { console.log('Photo publishing deferred: unrelated repository work is in progress.'); return; }
    if (JSON.parse(snapshot).some(([, , modified]) => Date.now() - modified < 15000)) return;
    const remote = github('git/ref/heads/main').object.sha;
    const head = git(['rev-parse', 'HEAD']);
    if (remote !== head && !(state.pendingSource === head && git(['rev-parse', 'HEAD^']) === remote)) {
      console.log('Photo publishing deferred: local and remote source differ.'); return;
    }
    if (state.pendingDeploy && state.pendingSource === head && state.snapshot === snapshot && github('git/ref/heads/gh-pages').object.sha === state.pendingDeploy) {
      await verifyPages(state.pendingDeploy);
      save({ snapshot, count: state.count, source: head, deployment: state.pendingDeploy, status: 'published', verifiedAt: new Date().toISOString() });
      return;
    }
    const imported = await syncPhotos();
    if (snapshot !== JSON.stringify(photoSnapshot())) throw new Error('Photo folder changed during import; retry on next check');
    const paths = ['110_Site/content/photography.json', '110_Site/public/photography/assets'];
    const updated = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: root, encoding: 'utf8' });
    if (!safePhotoPaths(updated)) throw new Error('Repository changed during import; leaving all work untouched');
    if (!updated && !state.pending) { save({ snapshot, count: imported.photos.length, status: 'unchanged' }); return; }
    // Record pending state before validation/commit so an interrupted push or build can be resumed.
    save({ ...state, pending: true, snapshot, count: imported.photos.length, status: 'validating' });
    run(['tooling/sync-photos.mjs', '--check']);
    run(['tooling/sync-fonts.mjs', '--check']);
    execFileSync('npm', ['run', 'build'], { cwd: site, stdio: 'inherit', timeout: 600000 });
    execFileSync('npm', ['run', 'typecheck'], { cwd: site, stdio: 'inherit', timeout: 120000 });
    execFileSync('npm', ['run', 'test:tooling'], { cwd: site, stdio: 'inherit', timeout: 120000 });
    execFileSync('npm', ['run', 'test:photos'], { cwd: site, stdio: 'inherit', timeout: 240000 });
    const checked = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: root, encoding: 'utf8' });
    if (!safePhotoPaths(checked) || snapshot !== JSON.stringify(photoSnapshot())) throw new Error('Source or photos changed during checks; publication deferred');
    git(['add', '--', ...paths.filter(path => existsSync(join(root, path)))]);
    run(['tooling/check-repository.mjs']);
    if (git(['diff', '--cached', '--name-only'])) git(['-c', 'user.name=Larry Hu', '-c', 'user.email=LarryHu1988@users.noreply.github.com', 'commit', '--only', '-m', `photos: update Light & Rain (${imported.photos.length} photographs)`, '--', ...paths.filter(path => existsSync(join(root, path)))]);
    const source = git(['rev-parse', 'HEAD']);
    save({ pending: true, pendingSource: source, snapshot, count: imported.photos.length, status: 'publishing' });
    git(['-c', 'http.version=HTTP/1.1', 'push', 'origin', 'main']);
    const deployment = await deployPages();
    save({ pending: true, pendingSource: source, pendingDeploy: deployment.deploy, snapshot, count: imported.photos.length, status: 'verifying' });
    await verifyPages(deployment.deploy);
    save({ snapshot, count: imported.photos.length, source, deployment: deployment.deploy, status: 'published', verifiedAt: new Date().toISOString() });
    console.log(`Photo publication verified: ${imported.photos.length} photographs, ${deployment.deploy}`);
  } finally { rmSync(lock, { recursive: true, force: true }); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try { await checkOnce(); }
  catch (error) {
    console.error('Photo publishing stopped safely:', error.message);
    try {
      const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : {};
      const attempts = (state.attempts || 0) + 1;
      save({ ...state, status: 'failed', lastError: error.message, attempts, failureSnapshot: JSON.stringify(photoSnapshot()), retryAfter: Date.now() + Math.min(1800000, 60000 * 2 ** Math.min(attempts, 5)) });
    } catch { /* Preserve the original failure if the local filesystem is unavailable. */ }
    process.exitCode = 1;
  }
}
