import json
import unittest
from pathlib import Path

from PIL import Image, ImageChops, ImageOps, ImageStat

ROOT = Path(__file__).resolve().parents[2]


class ImageVariantsTest(unittest.TestCase):
    def test_variants_preserve_the_entire_frame_aspect_ratio_and_color_profile(self):
        manifest = json.loads((ROOT / '110_Site/content/image-previews.json').read_text())
        for source, info in manifest.items():
            base = ROOT / ('111_Products' if source.startswith(('/simpleworth/', '/keepfit/')) else '110_Site/public')
            with Image.open(base / source.lstrip('/')) as original:
                whole = ImageOps.exif_transpose(original).convert('RGBA')
                for variant in info['variants']:
                    with self.subTest(source=source, width=variant['width']), Image.open(base / variant['src'].lstrip('/')) as actual:
                        self.assertEqual(actual.size, (variant['width'], variant['height']))
                        self.assertLessEqual(actual.width, whole.width)
                        self.assertLessEqual(actual.height, whole.height)
                        self.assertLessEqual(abs(actual.height - whole.height * actual.width / whole.width), 1)
                        self.assertEqual(actual.info.get('icc_profile'), original.info.get('icc_profile'))
                        # Compare against the whole frame, not a center crop or a filled canvas.
                        expected = whole.resize(actual.size, Image.Resampling.LANCZOS)
                        for background in ['white', '#172e25']:
                            # Ignore invisible RGB values, but verify alpha edges on both light and dark surfaces.
                            expected_surface = Image.new('RGBA', actual.size, background)
                            actual_surface = expected_surface.copy()
                            expected_surface.alpha_composite(expected)
                            actual_surface.alpha_composite(actual.convert('RGBA'))
                            difference = ImageStat.Stat(ImageChops.difference(expected_surface.convert('RGB'), actual_surface.convert('RGB')))
                            self.assertLess(max(difference.mean), 10, 'The derivative must retain the entire original composition')


if __name__ == '__main__':
    unittest.main()
