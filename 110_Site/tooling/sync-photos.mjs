import { checkPhotos, syncPhotos } from './photo-library.mjs';
const result = await (process.argv.includes('--check') ? checkPhotos() : syncPhotos());
console.log(`Photo library checked: ${result.photos.length} photographs. Native local originals remain untouched; public copies are metadata-free.`);
