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
        variants = []
        for pixels in sorted({96, 192, 320, 480, 640, 880, 960, 1280, 1600, 1920, 2560, width}):
            if pixels > width:
                continue
            variant = ImageOps.exif_transpose(native).convert(image.mode)
            variant.thumbnail((pixels, round(height * pixels / width)), Image.Resampling.LANCZOS)
            lossless = width == height
            settings = f'display-2:{variant.width}x{variant.height}:q95:lossless={lossless}'
            digest = hashlib.sha256(original + settings.encode()).hexdigest()[:12]
            output = target.parent / f'{source.stem}.w{variant.width}.{digest}.webp'
            if not output.exists():
                variant.save(output, 'WEBP', quality=95, lossless=lossless, method=6,
                             **({'icc_profile': native.info['icc_profile']} if native.info.get('icc_profile') else {}))
            variants.append({'src': str(Path(public_path).parent / 'previews' / output.name),
                             'width': variant.width, 'height': variant.height, 'bytes': output.stat().st_size})
        manifest[public_path]['variants'] = variants
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


def inject_manifest(html, manifest, helper='/scripts/progressive-images.js?v=display-2'):
    block = '<!-- image-previews:start --><script id="image-previews" type="application/json">' + json.dumps(manifest, ensure_ascii=True, separators=(',', ':')) + '</script><link rel="modulepreload" href="' + helper + '"><!-- image-previews:end -->'
    text = html.read_text()
    text = text.replace('?v=clear-1', '?v=display-2')
    icon = manifest.get('assets/icon.webp') or manifest.get('assets/icon.png')
    if icon:
        favicon = next(variant for variant in icon['variants'] if variant['width'] == 192)
        text = re.sub(r'<link\b[^>]*\brel="icon"[^>]*>',
                      f'<link rel="icon" type="image/webp" sizes="192x192" href="{favicon["src"]}">', text)
    old = "image.href=previews[image.getAttribute('href').split('?')[0]]?.src||image.href;"
    new = "const candidates=previews[image.getAttribute('href').split('?')[0]]?.variants;if(candidates?.length){image.href=candidates[0].src;image.imageSrcset=candidates.map(v=>v.src+' '+v.width+'w').join(', ');image.imageSizes="
    if html.parent.name == 'simpleworth':
        sizes = '(max-width:480px) 210px, (max-width:760px) 235px, (max-width:1100px) 220px, 264px'
    elif html.parent.name == 'keepfit':
        sizes = '(max-width:700px) 220px, 248px'
    else:
        sizes = '(max-width:700px) 90vw, 640px'
    text = text.replace(old, new + json.dumps(sizes) + ';}')
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
            manifest[f'/{product}/{path}'] = {**info, 'src': f'/{product}/{info["src"]}',
                'variants': [{**variant, 'src': f'/{product}/{variant["src"]}'} for variant in info['variants']]}
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
        inject_manifest(args.pdf_site / 'index.html', local, 'scripts/progressive-images.js?v=display-2')
        (args.pdf_site / 'scripts').mkdir(exist_ok=True)
        shutil.copy2(public / 'scripts/progressive-images.js', args.pdf_site / 'scripts/progressive-images.js')
        print(f'PDF previews: {len(local)}')
    print(f'Site previews: {len(manifest)}; {sum(item["bytes"] for item in manifest.values())} preview bytes / {sum(item["nativeBytes"] for item in manifest.values())} native bytes')


if __name__ == '__main__':
    main()
