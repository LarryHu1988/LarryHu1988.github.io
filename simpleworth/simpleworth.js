import { loadProgressiveImage, previewFor } from "/scripts/progressive-images.js?v=clear-1";
(() => {
  const imagePreviews = JSON.parse(document.getElementById('image-previews')?.textContent || '{}');
  const revealed = new WeakSet();
  const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      revealed.add(entry.target);
      observer.unobserve(entry.target);
      setImage(entry.target, entry.target.dataset.source);
    });
  }, { rootMargin: '240px' });
  function setImage(node, source) {
    node.dataset.source = source;
    node.decoding = 'async';
    if (node.loading !== 'lazy' || revealed.has(node) || !observer) {
      node.loading = 'eager';
      loadProgressiveImage(node, source, previewFor(source, imagePreviews), { priority: node.fetchPriority });
    } else observer.observe(node);
  }
  const toggle = document.querySelector('.language-toggle');
  const tabs = [...document.querySelectorAll('[data-preview]')];
  const image = document.getElementById('preview-image');
  const title = document.getElementById('preview-title');
  const description = document.getElementById('preview-description');
  const symbol = document.getElementById('preview-symbol');
  const panel = document.getElementById('screen-panel');
  const previews = {
    '01-expenses': { zh: ['今天的收支，清楚收好。', '从分类到备注，留下刚刚好的细节。记录一笔，也理清一点。', '支出'], en: ['Keep today in view.', 'Categories, tags and notes make room for the details that matter. One small entry, a little more clarity.', 'Expenses'], icon: '−', color: 'orange' },
    '04-income': { zh: ['每一份努力，都有回响。', '按月份回看收入，用分类和标签整理来源，让积累清晰可见。', '收入'], en: ['Every effort adds up.', 'Look back at your income by month and organise its sources with categories and tags.', 'Income'], icon: '＋', color: 'green' },
    '05-savings': { zh: ['把小目标，存成小确幸。', '设定目标、记录存入。每一次小小的前进，都在进度里看得见。', '金库'], en: ['Small deposits. Real progress.', 'Set a savings goal and record each deposit. Watch the small steps add up.', 'Vault'], icon: '◎', color: 'blue' },
    '03-breakdown': { zh: ['你的习惯，有迹可循。', '看看钱花在哪个分类、哪个标签。轻点圆环，让记录与占比一起回应。', '统计'], en: ['See the patterns clearly.', 'Explore categories and tags. Tap the ring to connect each share with the entries behind it.', 'Statistics'], icon: '▥', color: 'pink' }
  };
  let language = document.documentElement.lang.startsWith('en') ? 'en' : 'zh';
  let active = '01-expenses';
  function renderPreview() {
    const p = previews[active], copy = p[language];
    image.dataset.screen = active;
    setImage(image, `assets/${language === 'en' ? 'en-US' : 'zh-Hans'}-${active}.webp?v=native-lossless`);
    image.alt = `SimpleWorth ${copy[2]}`;
    title.textContent = copy[0]; description.textContent = copy[1];
    symbol.textContent = p.icon; symbol.className = `feature-symbol ${p.color}`;
    tabs.forEach(tab => { const selected = tab.dataset.preview === active; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; if (selected) panel.setAttribute('aria-labelledby', tab.id); });
  }
  function setLanguage(value) {
    document.querySelectorAll('img[data-icon-progressive]').forEach(node => setImage(node, node.dataset.source));
    language = value;
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    document.querySelectorAll('[data-zh][data-en]').forEach(node => { node.textContent = node.dataset[language]; });
    document.querySelectorAll('img[data-screen]').forEach(node => {
      setImage(node, `assets/${language === 'en' ? 'en-US' : 'zh-Hans'}-${node.dataset.screen}.webp?v=native-lossless`);
      node.alt = language === 'en' ? `SimpleWorth ${node.dataset.screen === '02-overview' ? 'overview and monthly trends' : 'expense categories and entries'}` : node.dataset.screen === '02-overview' ? '统计页：收支概览与月度趋势' : '支出页：分类圆环与账目记录';
    });
    toggle.textContent = language === 'en' ? '中文' : 'EN';
    toggle.setAttribute('aria-label', language === 'en' ? '切换到中文' : 'Switch to English');
    document.querySelector('.brand').setAttribute('aria-label', language === 'en' ? 'SimpleWorth home' : 'SimpleWorth 首页');
    document.querySelector('.store-button').setAttribute('aria-label', language === 'en' ? 'Download SimpleWorth on the App Store' : '在 App Store 免费下载 SimpleWorth');
    document.title = language === 'en' ? 'SimpleWorth · Less clutter. More clarity.' : 'SimpleWorth 简值 · 记得简单，心里有数。';
    renderPreview();
  }
  toggle.addEventListener('click', () => { setLanguage(language === 'en' ? 'zh' : 'en'); try { localStorage.setItem('simpleworth-language', language); } catch {} });
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => { active = tab.dataset.preview; renderPreview(); });
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); active = tabs[next].dataset.preview; renderPreview(); tabs[next].focus(); }
    });
  });
  setLanguage(document.documentElement.dataset.productLanguage || 'zh');
})();
