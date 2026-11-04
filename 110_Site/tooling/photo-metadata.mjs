import exifr from 'exifr';
import sharp from 'sharp';

const options = { reviveValues: false, translateValues: false, xmp: false, iptc: false, icc: false, ifd1: false, makerNote: false, userComment: false };
const cleanText = value => typeof value === 'string' ? value.replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 96) : '';
const captureKeys = new Set(['takenAt', 'offset', 'make', 'model', 'lens', 'aperture', 'exposureTime', 'iso', 'focalLength']);
const publicExifKeys = new Set(['Make', 'Model', 'Orientation', 'XResolution', 'YResolution', 'ResolutionUnit', 'YCbCrPositioning', 'ExifVersion', 'ComponentsConfiguration', 'FlashpixVersion', 'ColorSpace', 'ExifImageWidth', 'ExifImageHeight', 'DateTimeOriginal', 'OffsetTimeOriginal', 'SubSecTimeOriginal', 'LensModel', 'FNumber', 'ExposureTime', 'ISO', 'FocalLength']);

export function captureTimestamp(value) {
  if (typeof value !== 'string') return undefined;
  const match = value.trim().match(/^(\d{4})[:-](\d{2})[:-](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?)?$/);
  if (!match) return undefined;
  const [, year, month, day, hour, minute, second, fraction] = match;
  const date = new Date(0);
  date.setUTCFullYear(+year, +month - 1, +day);
  date.setUTCHours(+(hour || 0), +(minute || 0), +(second || 0), 0);
  if (+year < 1 || date.getUTCFullYear() !== +year || date.getUTCMonth() !== +month - 1 || date.getUTCDate() !== +day || date.getUTCHours() !== +(hour || 0) || date.getUTCMinutes() !== +(minute || 0) || date.getUTCSeconds() !== +(second || 0)) return undefined;
  // Preserve the camera's wall-clock time. A missing timezone is not UTC or the viewer's timezone.
  return `${year}-${month}-${day}${hour ? `T${hour}:${minute}${second ? ':' + second : ''}${fraction ? '.' + fraction : ''}` : ''}`;
}

async function readTags(bytes, metadata, full = false) {
  const config = { ...options, gps: full, makerNote: full, userComment: full, ifd1: full };
  let tiff = metadata?.exif;
  if (!tiff) {
    try { return await exifr.parse(bytes, config) || {}; }
    catch {
      // WebP stores its TIFF payload in an EXIF chunk, which exifr does not parse as a container.
      tiff = (await sharp(bytes).metadata()).exif;
    }
  }
  if (!tiff) return {};
  if (tiff.subarray(0, 6).equals(Buffer.from('Exif\0\0'))) tiff = tiff.subarray(6);
  return await exifr.parse(tiff, config) || {};
}

export async function extractCapture(bytes) {
  let tags;
  try { tags = await readTags(bytes); }
  catch { return {}; }
  const capture = {};
  const takenAt = captureTimestamp(tags.DateTimeOriginal) || captureTimestamp(tags.CreateDate);
  if (takenAt) {
    const subsecond = typeof tags.SubSecTimeOriginal === 'string' && /^\d{1,9}$/.test(tags.SubSecTimeOriginal) ? tags.SubSecTimeOriginal : '';
    capture.takenAt = takenAt + (subsecond && takenAt.length === 19 ? '.' + subsecond : '');
    const offset = cleanText(tags.OffsetTimeOriginal);
    if (/^[+-](?:0\d|1[0-4]):[0-5]\d$/.test(offset) && (!offset.startsWith('+14:') && !offset.startsWith('-14:') || offset.endsWith(':00'))) capture.offset = offset;
  }
  for (const [key, tag] of Object.entries({ make: 'Make', model: 'Model', lens: 'LensModel' })) {
    const value = cleanText(tags[tag]); if (value) capture[key] = value;
  }
  for (const [key, tag, max] of [['aperture', 'FNumber', 128], ['exposureTime', 'ExposureTime', 86400], ['iso', 'ISO', 10000000], ['focalLength', 'FocalLength', 10000]]) {
    const value = tags[tag]; if (typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= max) capture[key] = value;
  }
  return capture;
}

export function photographicExif(capture) {
  const IFD0 = {}, IFD2 = {};
  if (capture.make) IFD0.Make = capture.make;
  if (capture.model) IFD0.Model = capture.model;
  if (capture.lens) IFD2.LensModel = capture.lens;
  if (capture.takenAt?.length >= 19) {
    IFD2.DateTimeOriginal = capture.takenAt.slice(0, 10).replaceAll('-', ':') + ' ' + capture.takenAt.slice(11, 19);
    if (capture.offset) IFD2.OffsetTimeOriginal = capture.offset;
    if (capture.takenAt.includes('.')) IFD2.SubSecTimeOriginal = capture.takenAt.split('.')[1];
  }
  for (const [key, tag] of [['aperture', 'FNumber'], ['exposureTime', 'ExposureTime'], ['focalLength', 'FocalLength']]) {
    if (capture[key]) IFD2[tag] = exifRational(capture[key]);
  }
  if (capture.iso) IFD2.ISOSpeedRatings = String(Math.round(capture.iso));
  return { ...(Object.keys(IFD0).length ? { IFD0 } : {}), ...(Object.keys(IFD2).length ? { IFD2 } : {}) };
}

function exifRational(value) {
  let current = value, a = 0, b = 1, c = 1, d = 0;
  // Recover a bounded rational instead of rounding fast shutters such as 1/32000 to a decimal grid.
  for (let i = 0; i < 32; i++) {
    const integer = Math.floor(current), numerator = integer * b + a, denominator = integer * d + c;
    if (numerator > 0xffffffff || denominator > 0xffffffff) break;
    [a, b, c, d] = [b, numerator, d, denominator];
    if (Math.abs(b / d - value) <= value * 1e-12 || current === integer) break;
    current = 1 / (current - integer);
  }
  return `${b}/${d}`;
}

export async function checkPhotographicMetadata(bytes, metadata, capture = {}) {
  for (const key of Object.keys(capture)) if (!captureKeys.has(key)) throw new Error('Unexpected public capture information');
  if (capture.takenAt && captureTimestamp(capture.takenAt) !== capture.takenAt) throw new Error('Invalid capture timestamp');
  if (metadata.xmp || metadata.iptc || metadata.comments?.length) throw new Error('Private sidecar metadata remains in a public photo');
  if (metadata.orientation && metadata.orientation !== 1) throw new Error('A public photo still has unnormalized orientation');
  if (!metadata.exif) {
    if (Object.keys(photographicExif(capture)).length) throw new Error('Photographic EXIF was not retained');
    return;
  }
  const tags = await readTags(bytes, metadata, true);
  for (const key of Object.keys(tags)) if (!publicExifKeys.has(key)) throw new Error(`Unexpected public EXIF field: ${key}`);
  const retained = await extractCapture(bytes);
  for (const key of ['takenAt', 'offset', 'make', 'model', 'lens']) {
    if (capture[key] && !(key === 'takenAt' && capture[key].length < 19) && retained[key] !== capture[key]) throw new Error(`Photographic EXIF mismatch: ${key}`);
  }
}
