import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import sharp from 'sharp';
import { root, site } from './paths.mjs';

export const photoInbox = resolve(root, '115_Photos/1150_Inbox');
export const photoManifest = resolve(site, 'content/photography.json');
export const photoAssets = resolve(site, 'public/photography/assets');
const statePath = resolve(root, '113_Local/photo-sync/import.json');
const supported = /\.(?:jpe?g|png|webp|avif|hei[cf]|tiff?)$/i;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const version = 1;
const readJSON = (path, fallback) => existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback;
function saveJSON(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const text = JSON.stringify(value, null, 2) + '\n';
  if (existsSync(path) && readFileSync(path, 'utf8') === text) return;
  writeFileSync(path + '.tmp', text);
  renameSync(path + '.tmp', path);
}

export function photoFiles(inbox = photoInbox) {
  const result = [];
  if (!existsSync(inbox)) return result;
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && supported.test(entry.name)) result.push(path);
    }
  }
  walk(inbox);
  return result.sort((a, b) => relative(inbox, a).localeCompare(relative(inbox, b), 'en', { numeric: true }));
}

export function photoSnapshot(inbox = photoInbox) {
  return photoFiles(inbox).map(path => {
    const stat = statSync(path);
    return [relative(inbox, path), stat.size, stat.mtimeMs];
  });
}

export async function checkPhotos(manifest = readJSON(photoManifest, { version, photos: [] }), assets = photoAssets) {
  const seen = new Set();
  for (const photo of manifest.photos) {
    if (seen.has(photo.id) || !/^[a-f0-9]{24}$/.test(photo.id)) throw new Error('Invalid or duplicated photo identity');
    seen.add(photo.id);
    if (!/^留影 \d+$/.test(photo.title)) throw new Error('Photo captions must not reveal local file names');
    for (const variant of [photo.original, ...photo.variants]) {
      if (!/^\/photography\/assets\/[a-f0-9]{24}\.webp$/.test(variant.src)) throw new Error('Unexpected photo asset path');
      const bytes = readFileSync(join(assets, variant.src.split('/').pop()));
      if (!variant.src.includes(hash(bytes).slice(0, 24))) throw new Error('Photo asset checksum mismatch');
      const meta = await sharp(bytes).metadata();
      if (meta.exif || meta.xmp || meta.iptc || meta.comments?.length) throw new Error('Public photo still contains private metadata');
      if (bytes.length !== variant.bytes || meta.width !== variant.width || meta.height !== variant.height) throw new Error('Photo dimensions do not match manifest');
      if (variant.width > photo.width || variant.height > photo.height) throw new Error('Photo must not be upscaled');
      if (Math.abs(variant.height - photo.height * variant.width / photo.width) > 1) throw new Error('Photo was cropped or stretched');
    }
    if (photo.original.width !== photo.width || photo.original.height !== photo.height) throw new Error('Native photo resolution was not retained');
  }
  return manifest;
}

export async function syncPhotos({ inbox = photoInbox, manifestPath = photoManifest, assets = photoAssets, privateState = statePath, workspace = resolve(root, '114_Build') } = {}) {
  mkdirSync(inbox, { recursive: true });
  mkdirSync(workspace, { recursive: true });
  const files = photoFiles(inbox);
  const previous = readJSON(manifestPath, { version, photos: [] });
  const state = readJSON(privateState, { version, managed: false, files: {} });
  // A checkout without private originals must retain the already-published album.
  if (!files.length && !state.managed) return checkPhotos(previous, assets);
  const staging = mkdtempSync(join(workspace, 'photo-import-'));
  const next = { version, photos: [] };
  const nextState = { version, managed: true, files: {} };
  const seen = new Set();
  try {
    for (const path of files) {
      const before = statSync(path);
      const bytes = readFileSync(path);
      if (!bytes.length) throw new Error('A photo is still empty; waiting for copying to finish');
      const sourceHash = hash(bytes);
      const id = sourceHash.slice(0, 24);
      if (seen.has(id)) continue;
      seen.add(id);
      const cached = state.files[sourceHash];
      let photo;
      if (state.version === version && cached && [cached.original, ...cached.variants].every(v => existsSync(join(assets, v.src.split('/').pop())))) {
        photo = { ...cached };
      } else {
        let input = bytes;
        if (/\.hei[cf]$/i.test(path)) {
          if (process.platform !== 'darwin') throw new Error('HEIC import needs macOS; export JPEG/PNG on this machine instead');
          const converted = join(staging, id + '.png');
          execFileSync('/usr/bin/sips', ['-s', 'format', 'png', path, '--out', converted], { stdio: 'pipe', timeout: 120000 });
          input = readFileSync(converted);
        }
        const originalBytes = await sharp(input, { limitInputPixels: 268402689 }).autoOrient().webp({ lossless: true, effort: 6 }).toBuffer();
        if (originalBytes.length >= 90 * 1024 * 1024) throw new Error('Native image exceeds the safe publication size; no downscaling was performed');
        const meta = await sharp(originalBytes).metadata();
        if (!meta.width || !meta.height) throw new Error('Could not read native image dimensions');
        async function asset(data) {
          const name = hash(data).slice(0, 24) + '.webp';
          const info = await sharp(data).metadata();
          writeFileSync(join(staging, name), data);
          return { src: '/photography/assets/' + name, width: info.width, height: info.height, bytes: data.length };
        }
        const original = await asset(originalBytes);
        const variants = [];
        for (const width of [320, 640, 960, 1280, 1920, 2560, 3840].filter(width => width < meta.width)) {
          const display = await sharp(originalBytes).resize({ width, withoutEnlargement: true }).webp({ quality: 97, effort: 6, alphaQuality: 100 }).toBuffer();
          variants.push(await asset(display));
        }
        photo = { id, title: '', width: meta.width, height: meta.height, original, variants };
      }
      const after = statSync(path);
      if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error('A photo changed while importing; retry after copying finishes');
      photo.title = '留影 ' + String(next.photos.length + 1).padStart(3, '0');
      next.photos.push(photo);
      nextState.files[sourceHash] = photo;
    }
    mkdirSync(assets, { recursive: true });
    for (const name of readdirSync(staging).filter(name => name.endsWith('.webp'))) renameSync(join(staging, name), join(assets, name));
    await checkPhotos(next, assets);
    saveJSON(manifestPath, next);
    saveJSON(privateState, nextState);
    const retained = new Set(next.photos.flatMap(p => [p.original, ...p.variants]).map(v => v.src.split('/').pop()));
    for (const name of readdirSync(assets)) if (/^[a-f0-9]{24}\.webp$/.test(name) && !retained.has(name)) {
      const retired = join(workspace, 'photo-retired', new Date().toISOString().replace(/[:.]/g, '-'));
      mkdirSync(retired, { recursive: true });
      renameSync(join(assets, name), join(retired, name));
    }
    return next;
  } finally { rmSync(staging, { recursive: true, force: true }); }
}
