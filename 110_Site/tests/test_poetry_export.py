import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image

spec = importlib.util.spec_from_file_location('poetry_export', Path(__file__).parents[1] / 'tooling/sync-poetry-picture.py')
export = importlib.util.module_from_spec(spec)
spec.loader.exec_module(export)


class PoetryExportTests(unittest.TestCase):
    def test_original_lines_indentation_and_entities_survive(self):
        article = export.Article()
        article.feed('<p data-role="poem">　　第一行<br>第二行 &amp; 回声<br><br>另起一节</p>'
                     '<p data-role="analysis">解析里的“引文”。</p><p data-role="editorial-lead">刊发缘起。</p>')
        self.assertEqual(article.parts['poem'], ['　　第一行\n第二行 & 回声\n\n另起一节'])
        self.assertEqual(article.parts['analysis'], ['解析里的“引文”。'])

    def test_public_export_excludes_old_and_future_packages(self):
        with tempfile.TemporaryDirectory() as temp:
            root, site = Path(temp) / 'source', Path(temp) / 'site'
            (site / 'content').mkdir(parents=True)
            for day in ['2026-06-01', '2026-10-08', '2026-10-26']:
                folder = root / '213_Publish' / day[:7] / day
                folder.mkdir(parents=True)
                (folder / '测试诗_诗人_公众号文章.html').write_text('<p data-role="poem">原诗</p><p data-role="analysis">解析</p><p data-role="editorial-lead">缘起</p><script>private()</script>')
                Image.new('RGB', (9, 16), 'green').save(folder / '测试诗_诗人_诗歌插图.png')
            with patch.object(export, 'SITE', site), patch.object(export, 'CONFIG', Path(temp) / 'absent.json'), patch('sys.argv', ['sync', '--source', str(root), '--through', '2026-10-25']):
                export.main()
            items = json.loads((site / 'content/poetry-picture.json').read_text())
            self.assertEqual([item['date'] for item in items], ['2026-10-08'])
            self.assertEqual(set(items[0]), {'date', 'title', 'author', 'image', 'cover', 'width', 'height', 'poem', 'analysis', 'occasion'})
            self.assertEqual(sorted(p.name for p in (site / 'public/poetry-picture').iterdir()), ['2026-10-08-cover.webp', '2026-10-08.webp'])

    def test_missing_content_preserves_previous_export(self):
        with tempfile.TemporaryDirectory() as temp:
            root, site = Path(temp) / 'source', Path(temp) / 'site'
            (site / 'content').mkdir(parents=True)
            previous = site / 'content/poetry-picture.json'
            previous.write_text('["previous successful content"]')
            with patch.object(export, 'SITE', site), patch.object(export, 'CONFIG', Path(temp) / 'absent.json'), patch('sys.argv', ['sync', '--source', str(root)]):
                with self.assertRaises(ValueError):
                    export.main()
            self.assertEqual(previous.read_text(), '["previous successful content"]')


if __name__ == '__main__':
    unittest.main()
