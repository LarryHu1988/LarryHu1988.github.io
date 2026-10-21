(() => {
  const strings = {
    'zh-Hans': ['1.0.1 更新日志', '1.0.1（4）正在准备审核，尚未正式发布。App Store 当前版本为 1.0。', '在 App Store 查看简值'],
    'zh-Hant': ['1.0.1 更新日誌', '1.0.1（4）正在準備審核，尚未正式發佈。App Store 目前版本為 1.0。', '在 App Store 查看簡值'],
    'en-US': ['1.0.1 Release Notes', 'Version 1.0.1 (4) is being prepared for review and is not live yet. Version 1.0 remains available on the App Store.', 'View SimpleWorth on the App Store'],
    ja: ['1.0.1 更新履歴', '1.0.1（4）は審査に向けて準備中で、まだ公開されていません。App Store では現在 1.0 を配信しています。', 'App Store で SimpleWorth を見る']
  };
  const select = document.getElementById('language');
  let notes;
  function render(locale) {
    document.documentElement.lang = locale;
    select.value = locale;
    const [title, status, store] = strings[locale];
    document.title = `SimpleWorth · ${title}`;
    document.getElementById('title').textContent = title;
    document.getElementById('status').textContent = status;
    document.getElementById('store').textContent = store;
    const paragraphs = notes[locale].split('\n\n');
    document.getElementById('introduction').textContent = paragraphs[0];
    document.getElementById('closing').textContent = paragraphs.at(-1);
    document.getElementById('changes').replaceChildren(...paragraphs.slice(1, -1).join('\n').split('\n').filter(Boolean).map(text => {
      const li = document.createElement('li');
      li.textContent = text.replace(/^- /, '');
      return li;
    }));
  }
  select.addEventListener('change', () => {
    if (!notes) return;
    render(select.value);
    const url = new URL(location.href);
    url.searchParams.set('lang', select.value);
    history.replaceState(null, '', url);
  });
  fetch('notes.json').then(response => {
    if (!response.ok) throw new Error('Release notes unavailable');
    return response.json();
  }).then(value => {
    notes = value;
    const requested = new URL(location.href).searchParams.get('lang');
    const preferred = navigator.language.toLowerCase();
    const fallback = preferred.startsWith('ja') ? 'ja' : /zh-(tw|hk|hant)/.test(preferred) ? 'zh-Hant' : preferred.startsWith('zh') ? 'zh-Hans' : 'en-US';
    render(Object.hasOwn(strings, requested) ? requested : fallback);
  }).catch(() => {
    document.getElementById('status').textContent = '更新日志暂时无法加载。Release notes are temporarily unavailable.';
  });
})();
