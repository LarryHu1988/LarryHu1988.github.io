"""Export reading content only from completed Poetry-Picture daily packages."""
import argparse
from datetime import datetime, timedelta
from html.parser import HTMLParser
import json
from pathlib import Path
from zoneinfo import ZoneInfo

from PIL import Image, ImageOps

SITE = Path(__file__).resolve().parents[1]
CONFIG = SITE.parent / '113_Local' / 'config' / 'poetry-picture.json'
START = '2026-10-08'
PUBLISHED_BASES = {'official-published-list', 'completed-scheduled-today-absent-from-full-draft-box', 'completed-scheduled-past-absent-from-full-draft-box'}


def publication_evidence(root):
    for workspace in ['213_Workspace', '214_Workspace', '218_Workspace']:
        folder = root / workspace / 'draft-monitor'
        latest = folder / 'latest.json'
        if not latest.is_file():
            continue
        monitor = json.loads(latest.read_text())
        if monitor.get('success') is not True or monitor.get('complete') is not True:
            raise ValueError('Publication verification is incomplete; website content was preserved.')
        attempt_path = folder / 'attempt.json'
        if attempt_path.is_file():
            attempt = json.loads(attempt_path.read_text())
            if attempt.get('success') is False and attempt.get('checkedAt', '') >= monitor.get('checkedAt', ''):
                raise ValueError('The latest publication check failed; website content was preserved.')
        return {(r['date'], r['title'], r['author']): r for r in monitor.get('items', [])
                if r.get('publicationState') == 'published' and r.get('basis') in PUBLISHED_BASES}
    raise ValueError('No successful publication verification found; website content was preserved.')


class Article(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = {'poem': [], 'analysis': [], 'editorial-lead': []}
        self.role = None
        self.buffer = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'p' and attrs.get('data-role') in self.parts:
            self.role = attrs['data-role']
            self.buffer = []
        elif tag == 'br' and self.role:
            self.buffer.append('\n')

    def handle_endtag(self, tag):
        if tag == 'p' and self.role:
            self.parts[self.role].append(''.join(self.buffer).strip('\r\n'))
            self.role = None

    def handle_data(self, text):
        if self.role:
            self.buffer.append(text)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path)
    parser.add_argument('--through')
    parser.add_argument('--published-only', action='store_true', help='Incrementally sync verified publications through yesterday; preserve existing approved pages.')
    args = parser.parse_args()
    today = datetime.now(ZoneInfo('Asia/Shanghai')).date()
    args.through = args.through or (today - timedelta(days=1) if args.published_only else today).isoformat()
    datetime.strptime(args.through, '%Y-%m-%d')
    config = json.loads(CONFIG.read_text()) if CONFIG.exists() else {}
    root = args.source or (Path(config['source']) if config.get('source') else None)
    if not root:
        parser.error('Pass --source or configure source in the ignored local configuration.')
    verified = publication_evidence(root) if args.published_only else None
    destination = SITE / 'content' / 'poetry-picture.json'
    existing = json.loads(destination.read_text()) if args.published_only and destination.is_file() else []
    items_by_day = {item['date']: item for item in existing}
    # Only current issue packages are inspected; never scan the historical archive.
    packages = {}
    for name in ['219_Publish', '213_Publish', '212_Publish']:
        base = root / name
        for article in base.glob('*/*/*_公众号文章.html'):
            day = article.parent.name
            if START <= day <= args.through and len(day) == 10:
                packages[day] = article
        for article in base.glob('*/*_公众号文章.html'):
            day = article.parent.name
            if START <= day <= args.through and len(day) == 10:
                packages.setdefault(day, article)
    if not packages:
        raise ValueError('No daily reading packages found; existing website content was preserved.')
    target = SITE / 'public' / 'poetry-picture'
    target.mkdir(parents=True, exist_ok=True)
    for day, article in sorted(packages.items()):
        stem = article.name.removesuffix('_公众号文章.html')
        title, author = stem.rsplit('_', 1)
        if verified is not None:
            proof = verified.get((day, title, author))
            if not proof:
                continue
            publication_day = next((proof[key] for key in ['officialPublicationDate', 'actualPublicationDate', 'publicationDate', 'inferredPublicationDate'] if proof.get(key)), None)
            if publication_day and publication_day[:10] > args.through:
                continue
        illustration = article.with_name(stem + '_诗歌插图.png')
        if not illustration.is_file():
            raise ValueError(f'Missing illustration for {day}')
        parsed = Article()
        parsed.feed(article.read_text())
        if not all(parsed.parts.values()):
            raise ValueError(f'Incomplete reading content for {day}')
        with Image.open(illustration) as original:
            image = ImageOps.exif_transpose(original).convert('RGB')
            width, height = image.size
            full = target / f'{day}.webp'
            # Covers and reading images both retain the native, lossless source.
            if not full.exists() or not (target / f'{day}-cover.webp').exists() or illustration.stat().st_mtime > full.stat().st_mtime:
                profile = {'icc_profile': original.info['icc_profile']} if original.info.get('icc_profile') else {}
                image.save(full, 'WEBP', lossless=True, exact=True, method=6, **profile)
                image.save(target / f'{day}-cover.webp', 'WEBP', lossless=True, exact=True, method=6, **profile)
        items_by_day[day] = {
            'date': day, 'title': title, 'author': author,
            'image': f'/poetry-picture/{day}.webp',
            'cover': f'/poetry-picture/{day}-cover.webp?v=native-lossless',
            'width': width, 'height': height,
            'poem': parsed.parts['poem'], 'analysis': parsed.parts['analysis'],
            'occasion': parsed.parts['editorial-lead'],
        }
    # Explicit allowlist above: no draft IDs, statuses, evidence, credentials or local paths.
    items = [items_by_day[day] for day in sorted(items_by_day)]
    if not items:
        print(json.dumps({'issues': 0, 'changed': False, 'added': 0}))
        return
    content = json.dumps(items, ensure_ascii=False, indent=2) + '\n'
    changed = not destination.is_file() or destination.read_text() != content
    if changed:
        destination.write_text(content)
    print(json.dumps({'issues': len(items), 'first': items[0]['date'], 'last': items[-1]['date'], 'changed': changed, 'added': len(set(items_by_day) - {i['date'] for i in existing})}, ensure_ascii=False))


if __name__ == '__main__':
    main()
