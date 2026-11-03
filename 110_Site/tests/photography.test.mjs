import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { photoFiles, syncPhotos, checkPhotos } from '../tooling/photo-library.mjs';
import { safePhotoPaths } from '../tooling/watch-photos.mjs';
import { bookPages, displayVariant } from '../components/photobook/page-art.js';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');

test('photo import preserves oriented native pixels, strips metadata and never edits private originals', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-photo-test-'));
  try {
    const inbox = join(dir, 'inbox'); mkdirSync(inbox);
    const bytes = await sharp({ create: { width: 960, height: 640, channels: 3, background: '#456f89' } }).jpeg({ quality: 100 }).withExif({ IFD0: { Artist: 'Private Photographer', Make: 'Private Camera', ImageDescription: 'Private address' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '31/1 13/1 0/1', GPSLongitudeRef: 'E', GPSLongitude: '121/1 28/1 0/1' } }).withMetadata({ orientation: 6 }).toBuffer();
    assert((await sharp(bytes).metadata()).exif);
    const original = join(inbox, 'Private-name-and-address.jpg'); writeFileSync(original, bytes);
    writeFileSync(join(inbox, 'duplicate.jpg'), bytes);
    const options = { inbox, manifestPath: join(dir, 'manifest.json'), assets: join(dir, 'assets'), privateState: join(dir, 'private.json'), workspace: join(dir, 'work') };
    const album = await syncPhotos(options);
    assert.equal(album.photos.length, 1, 'identical originals should not be duplicated');
    const photo = album.photos[0]; assert.deepEqual([photo.width, photo.height], [640, 960]);
    assert.equal(digest(readFileSync(original)), digest(bytes));
    const native = readFileSync(join(options.assets, photo.original.src.split('/').pop()));
    const metadata = await sharp(native).metadata(); assert(!metadata.exif && !metadata.xmp && !metadata.iptc);
    assert.deepEqual(await sharp(native).raw().toBuffer(), await sharp(bytes).autoOrient().raw().toBuffer());
    assert(!JSON.stringify(album).includes('Private'));
    assert.equal(photo.variants.length, 1); assert.deepEqual([photo.variants[0].width, photo.variants[0].height], [320, 480]);
    await checkPhotos(album, options.assets);
    const again = await syncPhotos(options); assert.deepEqual(again, album, 'unchanged imports must be idempotent');
    const withoutOriginals = await syncPhotos({ ...options, inbox: join(dir, 'other-checkout'), privateState: join(dir, 'no-private-state.json') });
    assert.deepEqual(withoutOriginals, album, 'a public source checkout must not erase an album');
    rmSync(original); rmSync(join(inbox, 'duplicate.jpg'));
    const removed = await syncPhotos(options); assert.equal(removed.photos.length, 0);
    assert.equal(readdirSync(options.assets).length, 0);
    assert(readdirSync(join(options.workspace, 'photo-retired')).length > 0, 'retired public derivatives remain recoverable');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('only supported photos inside the nominated folder are ingested, never symlinks or hidden files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-photo-scope-'));
  try {
    const inbox = join(dir, 'inbox'); mkdirSync(inbox); mkdirSync(join(inbox, 'trip'));
    for (const file of ['10.JPG', '2.HEIC', '.hidden.jpg', 'private.txt', 'pending.jpg.icloud']) writeFileSync(join(inbox, file), 'test');
    writeFileSync(join(inbox, 'trip/1.png'), 'test'); writeFileSync(join(dir, 'outside.jpg'), 'test');
    symlinkSync(join(dir, 'outside.jpg'), join(inbox, 'linked.jpg'));
    assert.deepEqual(photoFiles(inbox).map(path => path.slice(inbox.length + 1)), ['2.HEIC', '10.JPG', 'trip/1.png']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('automatic commits accept only sanitized photo assets and their manifest', () => {
  const asset = '110_Site/public/photography/assets/' + 'a'.repeat(24) + '.webp';
  assert(safePhotoPaths(''));
  assert(safePhotoPaths(' M 110_Site/content/photography.json\0?? ' + asset + '\0'));
  for (const unsafe of [' M 110_Site/app/page.tsx\0', '?? 115_Photos/private.jpg\0', ' M .github/README.md\0', 'R  ' + asset + '\0old.jpg\0']) assert(!safePhotoPaths(unsafe));
});

test('book editions have a front/back cover and complete photo leaves, including empty and odd counts', () => {
  for (const count of [0, 1, 2, 3, 24]) {
    const photos = Array.from({ length: count }, (_, i) => ({ id: i }));
    const pages = bookPages(photos);
    assert.equal(pages[0].kind, 'cover'); assert.equal(pages.at(-1).kind, 'back');
    assert.equal(pages.length % 2, 0);
    assert.deepEqual(pages.filter(page => page.kind === 'photo').map(page => page.photo), photos);
  }
});

test('page textures choose sufficient actual display pixels without forcing every card to load the native original', () => {
  const photo = { variants: [{ width: 320, src: '320' }, { width: 1280, src: '1280' }], original: { width: 4032, src: 'original' } };
  assert.equal(displayVariant(photo, 319).src, '320'); assert.equal(displayVariant(photo, 900).src, '1280');
  assert.equal(displayVariant(photo, 2000).src, 'original'); assert.equal(displayVariant(photo, 8000).src, 'original');
});
