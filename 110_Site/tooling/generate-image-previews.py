"""Generate crisp temporary previews; never modify the native originals."""
import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]


def generate(source, public_path, manifest):
    original = source.read_bytes()
    with Image.open(source) as native:
        image = ImageOps.exif_transpose(native).convert('RGBA' if 'A' in native.getbands() else 'RGB')
        width, height = image.size
        if width == height:
            image.thumbnail((192, 192), Image.Resampling.LANCZOS)
        elif height > width * 2:
            image.thumbnail((880, 1912), Image.Resampling.LANCZOS)
        elif width > height:
            image.thumbnail((1600, 1000), Image.Resampling.LANCZOS)
        # Poetry already fits a high-density cover; retain all native pixels in its preview.
        settings = f'clear-1:{image.width}x{image.height}:q92'
        digest = hashlib.sha256(original + settings.encode()).hexdigest()[:12]
        target = source.parent / 'previews' / f'{source.stem}.{digest}.webp'
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            image.save(target, 'WEBP', quality=92, method=6,
                       **({'icc_profile': native.info['icc_profile']} if native.info.get('icc_profile') else {}))
        preview_path = str(Path(public_path).parent / 'previews' / target.name)
        manifest[public_path] = {'src': preview_path, 'width': image.width, 'height': image.height,
                                 'nativeWidth': width, 'nativeHeight': height,
                                 'bytes': target.stat().st_size, 'nativeBytes': len(original)}
        if public_path.startswith('/poetry-picture/'):
            small = image.copy()
            small.thumbnail((192, 384), Image.Resampling.LANCZOS)
            digest = hashlib.sha256(original + f'thumb-1:{small.width}x{small.height}:q92'.encode()).hexdigest()[:12]
            thumb = target.parent / f'{source.stem}.thumb.{digest}.webp'
            if not thumb.exists():
                small.save(thumb, 'WEBP', quality=92, method=6,
                           **({'icc_profile': native.info['icc_profile']} if native.info.get('icc_profile') else {}))
            manifest[public_path]['thumbnail'] = {'src': str(Path(public_path).parent / 'previews' / thumb.name),
                                                   'width': small.width, 'height': small.height, 'bytes': thumb.stat().st_size}
    assert source.read_bytes() == original, source


def inject_manifest(html, manifest, helper='/scripts/progressive-images.js?v=clear-1'):
    block = '<!-- image-previews:start --><script id="image-previews" type="application/json">' + json.dumps(manifest, ensure_ascii=True, separators=(',', ':')) + '</script><link rel="modulepreload" href="' + helper + '"><!-- image-previews:end -->'
    text = html.read_text()
    text = re.sub(r'<!-- image-previews:start -->.*?<!-- image-previews:end -->', '', text, flags=re.S)
    charset = re.search(r'<meta\s+charset=[^>]+>', text, flags=re.I)
    if not charset:
        raise ValueError(f'Missing early charset declaration: {html.name}')
    text = text[:charset.end()] + block + text[charset.end():]
    html.write_text(text)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pdf-site', type=Path)
    args = parser.parse_args()
    manifest = {}
    for product in ['simpleworth', 'keepfit']:
        folder = ROOT / '111_Products' / product
        local = {}
        for source in sorted((folder / 'assets').glob('*.webp')):
            if re.search(r' [0-9]+\.', source.name):
                continue
            generate(source, 'assets/' + source.name, local)
        inject_manifest(folder / 'index.html', local)
        for path, info in local.items():
            manifest[f'/{product}/{path}'] = {**info, 'src': f'/{product}/{info["src"]}'}
    public = ROOT / '110_Site/public'
    for source in sorted((public / 'poetry-picture').glob('*-cover.webp')):
        if re.search(r' [0-9]+\.', source.name):
            continue
        generate(source, '/poetry-picture/' + source.name, manifest)
    for name in ['pdf-icon.png', 'pdf-workspace-1.5.0.optimized.png']:
        generate(public / 'images' / name, '/images/' + name, manifest)
    (ROOT / '110_Site/content/image-previews.json').write_text(json.dumps(manifest, indent=2) + '\n')
    if args.pdf_site:
        local = {}
        for source in sorted((args.pdf_site / 'assets').glob('*.webp')):
            if re.search(r' [0-9]+\.', source.name):
                continue
            generate(source, 'assets/' + source.name, local)
        generate(args.pdf_site / 'assets/icon.png', 'assets/icon.png', local)
        inject_manifest(args.pdf_site / 'index.html', local, 'scripts/progressive-images.js?v=clear-1')
        (args.pdf_site / 'scripts').mkdir(exist_ok=True)
        shutil.copy2(public / 'scripts/progressive-images.js', args.pdf_site / 'scripts/progressive-images.js')
        print(f'PDF previews: {len(local)}')
    print(f'Site previews: {len(manifest)}; {sum(item["bytes"] for item in manifest.values())} preview bytes / {sum(item["nativeBytes"] for item in manifest.values())} native bytes')


if __name__ == '__main__':
    main()
