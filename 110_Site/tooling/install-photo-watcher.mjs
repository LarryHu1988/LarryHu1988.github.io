import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { root, site } from './paths.mjs';
import { photoInbox } from './photo-library.mjs';

if (process.platform !== 'darwin') throw new Error('This local folder watcher uses macOS launchd');
const label = 'com.larrystudio.photo-publisher';
const folder = join(homedir(), 'Library/LaunchAgents');
const plist = join(folder, label + '.plist');
const domain = `gui/${process.getuid()}`;
const local = join(root, '113_Local/photo-sync');
const xml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
if (process.argv.includes('--uninstall')) {
  spawnSync('launchctl', ['bootout', `${domain}/${label}`]);
  if (existsSync(plist)) rmSync(plist);
  console.log('Photo watcher removed. All originals and published photographs are retained.');
} else {
  mkdirSync(folder, { recursive: true }); mkdirSync(local, { recursive: true }); mkdirSync(photoInbox, { recursive: true });
  const npm = execFileSync('/usr/bin/which', ['npm'], { encoding: 'utf8' }).trim();
  const gh = execFileSync('/usr/bin/which', ['gh'], { encoding: 'utf8' }).trim();
  const node = execFileSync('/usr/bin/which', ['node'], { encoding: 'utf8' }).trim();
  const network = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => /^(?:https?_proxy|all_proxy|no_proxy)$/i.test(key) && value));
  // launchd does not inherit shell proxy settings. Keep them local, never in the public source or plist.
  writeFileSync(join(local, 'network.json'), JSON.stringify(network, null, 2) + '\n', { mode: 0o600 });
  const path = [...new Set([dirname(process.execPath), dirname(npm), dirname(gh), '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'])].join(':');
  const contents = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array><string>${xml(node)}</string><string>${xml(join(site, 'tooling/watch-photos.mjs'))}</string></array>
<key>WorkingDirectory</key><string>${xml(site)}</string>
<key>EnvironmentVariables</key><dict><key>PATH</key><string>${xml(path)}</string><key>GH_PROMPT_DISABLED</key><string>1</string></dict>
<key>WatchPaths</key><array><string>${xml(photoInbox)}</string></array>
<key>StartInterval</key><integer>60</integer>
<key>RunAtLoad</key><true/>
<key>ThrottleInterval</key><integer>30</integer>
<key>ProcessType</key><string>Background</string>
<key>LowPriorityIO</key><true/>
<key>StandardOutPath</key><string>${xml(join(local, 'watcher.log'))}</string>
<key>StandardErrorPath</key><string>${xml(join(local, 'watcher-error.log'))}</string>
</dict></plist>\n`;
  writeFileSync(plist, contents, { mode: 0o600 });
  execFileSync('/usr/bin/plutil', ['-lint', plist], { stdio: 'inherit' });
  spawnSync('launchctl', ['bootout', `${domain}/${label}`]);
  execFileSync('launchctl', ['bootstrap', domain, plist], { stdio: 'inherit' });
  console.log(`Installed ${label}: only ${photoInbox} is watched; metadata-free copies publish after checks pass.`);
}
