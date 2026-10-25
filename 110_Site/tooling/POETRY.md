# Daily Poetry-Picture reading collection

The public collection lives at `/poetry-picture/`; each day has a permanent reading URL. The homepage links to it and includes the same portrait Cover Flow. The two personal poems remain separate.

Run `npm run sync:poetry -- --source /path/to/PoetryPicture` to import completed article packages from `213_Publish/YYYY-MM/YYYY-MM-DD/` (older `219_Publish` layouts are also supported). The default cutoff is the current Beijing date; `--through YYYY-MM-DD` sets a deliberate cutoff. A local source can be configured in the ignored `115_Local/poetry-picture.json` with a `source` field. Do not commit that machine-specific configuration.

The importer reads only the poem, analysis and editorial-lead paragraphs from the WeChat article. It preserves original lines, stanza spacing, punctuation and indentation. It exports an explicit public-content allowlist; it never copies dashboard data, production state, draft IDs, raw HTML, scripts or credentials. Historical packages before 2026-10-08 and future daily packages are excluded. No WeChat API calls or content changes are performed.

Reading images are lossless WebP at their delivered native resolution. The portrait sleeves show the complete composition with `object-fit: contain`; their smaller image variants are derived directly from the original. No upscaling or square crop is used.

After importing, run the normal website build and checks, commit the new content and images, and publish with the existing GitHub Pages deployment tool. Importing alone does not publish or establish WeChat publication status.

Importer checks: `python3 -m unittest discover -s tests -p 'test_poetry_export.py'`.
