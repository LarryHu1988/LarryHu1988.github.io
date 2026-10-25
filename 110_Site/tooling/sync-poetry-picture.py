"""Export reading content only from completed Poetry-Picture daily packages."""
import argparse
from datetime import datetime
from html.parser import HTMLParser
import json
from pathlib import Path
from zoneinfo import ZoneInfo

from PIL import Image, ImageOps

SITE = Path(__file__).resolve().parents[1]
CONFIG = SITE.parent / '115_Local' / 'poetry-picture.json'
START = '2026-10-08'


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
    parser.add_argument('--through', default=datetime.now(ZoneInfo('Asia/Shanghai')).date().isoformat())
    args = parser.parse_args()
    datetime.strptime(args.through, '%Y-%m-%d')
    config = json.loads(CONFIG.read_text()) if CONFIG.exists() else {}
    root = args.source or (Path(config['source']) if config.get('source') else None)
    if not root:
        parser.error('Pass --source or configure source in the ignored local configuration.')
    # Only current issue packages are inspected; never scan the historical archive.
    packages = {}
    for name in ['219_Publish', '213_Publish']:
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
    items = []
    for day, article in sorted(packages.items()):
        stem = article.name.removesuffix('_公众号文章.html')
        title, author = stem.rsplit('_', 1)
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
            # Retain native resolution and lossless pixels for the reading view.
            if not full.exists() or not (target / f'{day}-cover.webp').exists() or illustration.stat().st_mtime > full.stat().st_mtime:
                image.save(full, 'WEBP', lossless=True, method=6)
                sleeve = image.copy()
                sleeve.thumbnail((1200, 1600))
                sleeve.save(target / f'{day}-cover.webp', 'WEBP', quality=95, method=6)
        items.append({
            'date': day, 'title': title, 'author': author,
            'image': f'/poetry-picture/{day}.webp',
            'cover': f'/poetry-picture/{day}-cover.webp',
            'width': width, 'height': height,
            'poem': parsed.parts['poem'], 'analysis': parsed.parts['analysis'],
            'occasion': parsed.parts['editorial-lead'],
        })
    # Explicit allowlist above: no draft IDs, statuses, evidence, credentials or local paths.
    destination = SITE / 'content' / 'poetry-picture.json'
    destination.write_text(json.dumps(items, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'issues': len(items), 'first': items[0]['date'], 'last': items[-1]['date']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
