"""Create smaller native-resolution derivatives without changing pixels or color profiles."""
from pathlib import Path
import struct
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCES = [
    ROOT / '111_Products/simpleworth/assets/icon.png',
    ROOT / '111_Products/keepfit/assets/icon.png',
    ROOT / '110_Site/public/images/pdf-workspace-1.5.0.png',
]


def png_chunks(data):
    offset = 8
    while offset < len(data):
        size = struct.unpack_from('>I', data, offset)[0] + 12
        yield data[offset + 4:offset + 8], data[offset:offset + size]
        offset += size


def preserve_png_colors(source, target):
    # Browsers may prefer cICP over ICC; Pillow does not expose every PNG color chunk.
    colors = {b'cICP', b'gAMA', b'cHRM', b'sRGB', b'sBIT'}
    encoded = target.read_bytes()
    present = {kind for kind, _ in png_chunks(encoded)}
    missing = b''.join(chunk for kind, chunk in png_chunks(source.read_bytes()) if kind in colors and kind not in present)
    if missing:
        result = encoded[:8]
        for kind, chunk in png_chunks(encoded):
            if kind == b'IDAT' and missing:
                result += missing
                missing = b''
            result += chunk
        target.write_bytes(result)


for source in SOURCES:
    assert source.read_bytes()[24] == 8, 'Keep higher-bit-depth PNG sources in their original format'
    target = source.with_name(source.stem + '.optimized.png') if source.stem == 'pdf-workspace-1.5.0' else source.with_suffix('.webp')
    with Image.open(source) as original:
        image = original.convert('RGBA')
        profile = original.info.get('icc_profile')
        options = {'icc_profile': profile} if profile else {}
        if target.suffix == '.png':
            if original.info.get('dpi'):
                options['dpi'] = original.info['dpi']
            if original.info.get('exif'):
                options['exif'] = original.info['exif']
            image.save(target, 'PNG', optimize=True, compress_level=9, **options)
            preserve_png_colors(source, target)
        else:
            image.save(target, 'WEBP', lossless=True, exact=True, quality=100, method=6, **options)
        with Image.open(target) as result:
            assert result.size == original.size
            assert result.convert('RGBA').tobytes() == image.tobytes(), source
            assert result.info.get('icc_profile') == profile, source
    print(f'{source.relative_to(ROOT)}: {source.stat().st_size} -> {target.stat().st_size} bytes; pixels/profile unchanged')
