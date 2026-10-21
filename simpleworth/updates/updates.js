(() => {
  const strings = {
    'zh-Hans': ['1.0.1 更新日志', '1.0.1（4）已提交 Apple 审核，尚未正式发布。App Store 当前版本为 1.0，审核通过后手动发布更新。', '在 App Store 查看简值'],
    'zh-Hant': ['1.0.1 更新日誌', '1.0.1（4）已提交 Apple 審核，尚未正式發佈。App Store 目前版本為 1.0，審核通過後手動發佈更新。', '在 App Store 查看簡值'],
    'en-US': ['1.0.1 Release Notes', 'Version 1.0.1 (4) has been submitted for App Review and is not live yet. Version 1.0 remains available on the App Store. This update will be released manually after approval.', 'View SimpleWorth on the App Store'],
    ja: ['1.0.1 更新履歴', '1.0.1（4）は Apple に審査を提出済みで、まだ公開されていません。App Store では現在 1.0 を配信しています。承認後に手動でアップデートを公開します。', 'App Store で SimpleWorth を見る']
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
