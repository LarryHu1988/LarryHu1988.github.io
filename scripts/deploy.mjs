import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const git = (args, cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const remote = git(['remote', 'get-url', 'origin']);
const source = git(['rev-parse', '--short', 'HEAD']);
const probe = spawnSync('git', ['ls-remote', '--exit-code', '--heads', remote, 'gh-pages'], { cwd: root });
if (probe.status !== 0 && probe.status !== 2) {
  throw new Error(`Cannot inspect deployment branch: ${probe.stderr.toString()}`);
}
const temp = mkdtempSync(join(tmpdir(), 'larry-studio-publish-'));
try {
  if (probe.status === 0) {
    git(['clone', '--single-branch', '--branch', 'gh-pages', remote, temp]);
    // Only the disposable deployment checkout is cleaned; source files stay in main.
    for (const entry of readdirSync(temp)) {
      if (entry !== '.git') rmSync(join(temp, entry), { recursive: true, force: true });
    }
  } else {
    git(['init', '--initial-branch=gh-pages'], temp);
    git(['remote', 'add', 'origin', remote], temp);
  }
  cpSync(join(root, 'out'), temp, { recursive: true });
  git(['add', '--all'], temp);
  const changed = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: temp });
  if (changed.status === 0) {
    console.log('The current build is already published.');
  } else if (changed.status === 1) {
    git(['-c', 'user.name=Larry Hu', '-c', 'user.email=LarryHu1988@users.noreply.github.com', 'commit', '-m', `deploy: Larry Studio (${source})`], temp);
    git(['push', 'origin', 'HEAD:refs/heads/gh-pages'], temp);
    console.log(`Published build from ${source} to gh-pages.`);
  } else {
    throw new Error('Cannot inspect staged deployment files.');
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
