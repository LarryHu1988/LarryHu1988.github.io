import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import exifr from 'exifr';
import { photoFiles, syncPhotos, checkPhotos } from '../tooling/photo-library.mjs';
import { safePhotoPaths } from '../tooling/watch-photos.mjs';
import { bookPages, displayVariant } from '../components/photobook/page-art.js';
import { captureLabel } from '../components/photobook/capture.mjs';
import { captureTimestamp, checkPhotographicMetadata, extractCapture, photographicExif } from '../tooling/photo-metadata.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');

test('photo import retains photographic EXIF, removes private tags and never edits native pixels or originals', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-photo-test-'));
  try {
    const inbox = join(dir, 'inbox'); mkdirSync(inbox);
    const bytes = await sharp({ create: { width: 960, height: 640, channels: 3, background: '#456f89' } }).jpeg({ quality: 100 }).withExif({ IFD0: { Artist: 'Private Photographer', Make: 'Apple', Model: 'iPhone 16 Pro', ImageDescription: 'Private address' }, IFD2: { DateTimeOriginal: '2026:11:04 17:42:08', OffsetTimeOriginal: '+08:00', BodySerialNumber: 'Private Serial', LensSerialNumber: 'Private Lens Serial', CameraOwnerName: 'Private Owner', FNumber: '18/10', ISOSpeedRatings: '125', ExposureTime: '1/250', FocalLength: '65/10' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '31/1 13/1 0/1', GPSLongitudeRef: 'E', GPSLongitude: '121/1 28/1 0/1' } }).withMetadata({ orientation: 6 }).toBuffer();
    assert((await sharp(bytes).metadata()).exif);
    const original = join(inbox, 'Private-name-and-address.jpg'); writeFileSync(original, bytes);
    writeFileSync(join(inbox, 'duplicate.jpg'), bytes);
    const options = { inbox, manifestPath: join(dir, 'manifest.json'), assets: join(dir, 'assets'), privateState: join(dir, 'private.json'), workspace: join(dir, 'work') };
    const album = await syncPhotos(options);
    assert.equal(album.photos.length, 1, 'identical originals should not be duplicated');
    const photo = album.photos[0]; assert.deepEqual([photo.width, photo.height], [640, 960]);
    assert.equal(digest(readFileSync(original)), digest(bytes));
    const native = readFileSync(join(options.assets, photo.original.src.split('/').pop()));
    const metadata = await sharp(native).metadata(); assert(metadata.exif && !metadata.xmp && !metadata.iptc);
    assert.equal(captureLabel(photo.capture), '2026.11.04 17:42 · iPhone 16 Pro');
    for (const asset of [photo.original, ...photo.variants]) {
      const publicBytes = readFileSync(join(options.assets, asset.src.split('/').pop()));
      const retained = await extractCapture(publicBytes);
      assert.equal(retained.model, 'iPhone 16 Pro'); assert.equal(retained.takenAt, '2026-11-04T17:42:08');
      assert.equal(retained.offset, '+08:00'); assert.equal(retained.iso, 125);
      const info = await sharp(publicBytes).metadata();
      const tags = await exifr.parse(info.exif.subarray(6), { reviveValues: false });
      assert(Object.keys(tags).every(key => !/GPS|latitude|longitude|Serial|Owner|Artist|Description/i.test(key)));
    }
    assert.deepEqual(await sharp(native).raw().toBuffer(), await sharp(bytes).autoOrient().raw().toBuffer());
    assert(!JSON.stringify(album).includes('Private'));
    assert.equal(photo.variants.length, 1); assert.deepEqual([photo.variants[0].width, photo.variants[0].height], [320, 480]);
    await checkPhotos(album, options.assets);
    const again = await syncPhotos(options); assert.deepEqual(again, album, 'unchanged imports must be idempotent');
    const oldState = JSON.parse(readFileSync(options.privateState, 'utf8')); oldState.version = 1;
    for (const value of Object.values(oldState.files)) delete value.capture;
    writeFileSync(options.privateState, JSON.stringify(oldState));
    assert.deepEqual(await syncPhotos(options), album, 'legacy imports must recover EXIF from untouched originals, even when photo files did not change');
    const withoutOriginals = await syncPhotos({ ...options, inbox: join(dir, 'other-checkout'), privateState: join(dir, 'no-private-state.json') });
    assert.deepEqual(withoutOriginals, album, 'a public source checkout must not erase an album');
    rmSync(original); rmSync(join(inbox, 'duplicate.jpg'));
    const removed = await syncPhotos(options); assert.equal(removed.photos.length, 0);
    assert.equal(readdirSync(options.assets).length, 0);
    assert(readdirSync(join(options.workspace, 'photo-retired')).length > 0, 'retired public derivatives remain recoverable');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('capture dates stay in camera-local time and missing fields never use a file timestamp or guessed device', async () => {
  assert.equal(captureTimestamp('2026:11:04 01:02:03'), '2026-11-04T01:02:03');
  assert.equal(captureTimestamp('2024:02:29 23:59:59.123'), '2024-02-29T23:59:59.123');
  for (const invalid of ['2026:02:29 12:00:00', '2026:13:01 12:00:00', '2026:11:04 24:00:00', '0000:00:00 00:00:00']) assert.equal(captureTimestamp(invalid), undefined);
  assert.equal(captureLabel({}), '');
  assert.equal(captureLabel({ model: 'X100VI' }), 'X100VI');
  assert.equal(captureLabel({ make: 'Canon', model: 'Canon EOS R6' }), 'Canon EOS R6');
  assert.equal(captureLabel({ takenAt: '2026-11-04T01:02:03', offset: '-05:00' }), '2026.11.04 01:02');
  const plain = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } }).png().toBuffer();
  assert.deepEqual(await extractCapture(plain), {});
});

test('public validation rejects accidental GPS retention rather than accepting any EXIF block', async () => {
  const unsafe = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } }).webp().withExif({ IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '31/1 13/1 0/1' } }).toBuffer();
  await assert.rejects(checkPhotographicMetadata(unsafe, await sharp(unsafe).metadata(), {}), /Unexpected public EXIF field/);
});

test('photographic EXIF preserves fast shutter fractions rather than rounding them to a decimal grid', () => {
  for (const denominator of [125, 250, 8000, 32000, 64000]) assert.equal(photographicExif({ exposureTime: 1 / denominator }).IFD2.ExposureTime, `1/${denominator}`);
  assert.equal(photographicExif({ aperture: 1.8, focalLength: 6.5 }).IFD2.FNumber, '9/5');
  assert.equal(photographicExif({ aperture: 1.8, focalLength: 6.5 }).IFD2.FocalLength, '13/2');
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
