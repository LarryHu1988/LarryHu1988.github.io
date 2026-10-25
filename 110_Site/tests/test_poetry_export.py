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

    def test_daily_sync_adds_only_confirmed_prior_days_and_preserves_approved_pages(self):
        with tempfile.TemporaryDirectory() as temp:
            root, site = Path(temp) / 'source', Path(temp) / 'site'
            (site / 'content').mkdir(parents=True)
            approved = {'date': '2026-10-26', 'title': '已批准展示', 'author': '诗人'}
            (site / 'content/poetry-picture.json').write_text(json.dumps([approved]))
            proofs = []
            for day, state in [('2026-10-22', 'published'), ('2026-10-23', 'unknown'), ('2026-10-24', 'published'), ('2026-10-25', 'published'), ('2026-10-27', 'published')]:
                folder = root / '212_Publish' / day[:7] / day
                folder.mkdir(parents=True)
                (folder / '测试诗_诗人_公众号文章.html').write_text('<p data-role="poem">原诗</p><p data-role="analysis">解析</p><p data-role="editorial-lead">缘起</p>')
                Image.new('RGB', (9, 16), 'green').save(folder / '测试诗_诗人_诗歌插图.png')
                proofs.append({'date': day, 'title': '测试诗', 'author': '诗人', 'publicationState': state, 'basis': 'official-published-list', 'publicationDate': '2026-10-26' if day == '2026-10-22' else None})
            monitor = root / '213_Workspace/draft-monitor'
            monitor.mkdir(parents=True)
            (monitor / 'latest.json').write_text(json.dumps({'success': True, 'complete': True, 'items': proofs}))
            with patch.object(export, 'SITE', site), patch.object(export, 'CONFIG', Path(temp) / 'absent.json'), patch('sys.argv', ['sync', '--source', str(root), '--published-only', '--through', '2026-10-25']):
                export.main()
            items = json.loads((site / 'content/poetry-picture.json').read_text())
            self.assertEqual([item['date'] for item in items], ['2026-10-24', '2026-10-25', '2026-10-26'])
            self.assertEqual(items[-1], approved)
            self.assertNotIn('publicationState', items[0])
            self.assertNotIn('basis', items[0])

    def test_failed_latest_attempt_blocks_daily_export(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            monitor = root / '213_Workspace/draft-monitor'
            monitor.mkdir(parents=True)
            (monitor / 'latest.json').write_text(json.dumps({'success': True, 'complete': True, 'checkedAt': '2026-10-25T23:30:00+08:00', 'items': []}))
            (monitor / 'attempt.json').write_text(json.dumps({'success': False, 'checkedAt': '2026-10-26T08:30:00+08:00'}))
            with self.assertRaises(ValueError):
                export.publication_evidence(root)


if __name__ == '__main__':
    unittest.main()
