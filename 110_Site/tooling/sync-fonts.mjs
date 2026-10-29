import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as fontkit from 'fontkit';
import { site } from './paths.mjs';
import { basePath, checkFonts, cssPath, digest, fontCSS, inspectFonts, manifestPath } from './site-fonts.mjs';

const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
async function download(url, binary = false) {
  if (!['fonts.googleapis.com', 'fonts.gstatic.com'].includes(new URL(url).hostname)) throw new Error('Unexpected font provider');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`Font provider returned HTTP ${response.status}`);
      return binary ? Buffer.from(await response.arrayBuffer()) : await response.text();
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

if (process.argv.includes('--check')) {
  const result = checkFonts();
  console.log(`Font coverage passed: ${result.required.size} required characters, ${result.manifest.subsets.length} local subsets.`);
} else {
  const inspected = inspectFonts();
  const { base, manifest, critical, catalogue, frequency } = inspected;
  if (process.argv.includes('--rebuild')) manifest.subsets = [];
  const covered = process.argv.includes('--rebuild') ? base.characters : inspected.covered;
  const missing = [...inspected.required].filter(char => !covered.has(char));
  const baseBefore = digest(readFileSync(resolve(site, 'public' + basePath)));
  const order = (a, b) => (frequency.get(b) || 0) - (frequency.get(a) || 0) || a.codePointAt(0) - b.codePointAt(0);
  // Keep collection titles together so listing poems does not fetch article-only glyph packs.
  const groups = [
    missing.filter(char => char.codePointAt(0) < 256).sort(order),
    missing.filter(char => char.codePointAt(0) >= 256 && critical.has(char)).sort(order),
    missing.filter(char => char.codePointAt(0) >= 256 && !critical.has(char) && catalogue.has(char)).sort(order),
    missing.filter(char => char.codePointAt(0) >= 256 && !critical.has(char) && !catalogue.has(char)).sort(order),
  ];
  for (const group of groups) for (let offset = 0; offset < group.length; offset += 128) {
    const characters = group.slice(offset, offset + 128).sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join('');
    const query = new URLSearchParams({ family: 'Noto Serif SC:wght@400..700', display: 'swap', text: characters });
    const css = await download('https://fonts.googleapis.com/css2?' + query);
    if (!/font-weight:\s*400 700/.test(css)) throw new Error('Provider did not return a variable font');
    const url = css.match(/src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)\s*format\(['"]woff2['"]\)/)?.[1];
    if (!url) throw new Error('Provider did not return WOFF2');
    const bytes = await download(url, true);
    const face = fontkit.create(bytes);
    const actual = new Set(face.characterSet);
    for (const char of characters) if (!actual.has(char.codePointAt(0))) throw new Error(`Provider is missing requested character: ${char}`);
    if (!face.variationAxes?.wght || face.variationAxes.wght.min > 400 || face.variationAxes.wght.max < 700) throw new Error('Missing real variable weights');
    const sha256 = digest(bytes);
    const path = `/fonts/serif/serif-${sha256.slice(0, 12)}.woff2`;
    mkdirSync(resolve(site, 'public/fonts/serif'), { recursive: true });
    writeFileSync(resolve(site, 'public' + path), bytes);
    manifest.subsets.push({ path, characters, sha256, bytes: bytes.length, critical: [...characters].some(char => critical.has(char)), source: url });
    console.log(`Added ${characters.length} characters (${Math.round(bytes.length / 1024)} KiB).`);
  }
  for (const subset of manifest.subsets) subset.critical = [...subset.characters].some(char => critical.has(char));
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(cssPath, fontCSS(manifest, base));
  if (baseBefore !== digest(readFileSync(resolve(site, 'public' + basePath)))) throw new Error('The existing font must remain unchanged');
  const result = checkFonts();
  console.log(`Covered ${result.required.size} characters. Existing font unchanged; visitors use local, unicode-ranged WOFF2 only.`);
}
