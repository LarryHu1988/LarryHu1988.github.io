# Daily Poetry-Picture reading collection

The public collection lives at `/poetry-picture/`; each day has a permanent reading URL. The homepage links to it and includes the same portrait Cover Flow. The two personal poems remain separate.

Daily publishing uses `npm run sync:poetry -- --published-only` after a successful publication check. It imports only verified published issues through the previous Beijing day, also catching older confirmed issues that have not yet reached the website. It preserves already approved public pages, including the initial collection. Failed verification stops the daily export without replacing the previous content. Publication status and evidence remain local.

Run `npm run sync:poetry -- --source /path/to/PoetryPicture` for an explicitly approved manual import of completed article packages from `212_Publish/YYYY-MM/YYYY-MM-DD/` (older `213_Publish` and `219_Publish` layouts are also supported). The manual cutoff is the current Beijing date; `--through YYYY-MM-DD` sets a deliberate cutoff. A local source can be configured in the ignored `113_Local/config/poetry-picture.json` with a `source` field. Do not commit that machine-specific configuration.

The importer reads only the poem, analysis and editorial-lead paragraphs from the WeChat article. It preserves original lines, stanza spacing, punctuation and indentation. It exports an explicit public-content allowlist; it never copies dashboard data, production state, draft IDs, raw HTML, scripts or credentials. Historical packages before 2026-10-08 and future daily packages are excluded. No WeChat API calls or content changes are performed.

Reading images are lossless WebP at their delivered native resolution. The portrait sleeves show the complete composition with `object-fit: contain`; their smaller image variants are derived directly from the original. No upscaling or square crop is used.

After importing, run `python3 tooling/generate-image-previews.py` with Pillow available, then the normal website build and checks. The generator preserves native originals, creates high-quality previews, and fingerprints their URLs to avoid stale cached previews. Commit the new content, preview manifest and images, and publish with the existing GitHub Pages deployment tool. Importing alone does not publish or establish WeChat publication status.

The existing local heartbeat runs at 08:30 and 23:30 Asia/Shanghai. The morning run synchronizes the prior day's newly confirmed publications; the evening run retains the dashboard inspection and retries any pending website synchronization. Publish only when reader content or its images changed. After deployment, confirm Pages completed and read back the changed public URLs.

Importer checks: `python3 -m unittest discover -s tests -p 'test_poetry_export.py'`.
