'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Language = 'zh-Hans' | 'zh-Hant';
const LanguageContext = createContext({ traditional: false, toggle: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('zh-Hans');
  useEffect(() => {
    try {
      if (localStorage.getItem('larry-site-lang') === 'zh-Hant') setLanguage('zh-Hant');
    } catch { /* Storage is optional. */ }
  }, []);

  function toggle() {
    const next = language === 'zh-Hans' ? 'zh-Hant' : 'zh-Hans';
    setLanguage(next);
    try { localStorage.setItem('larry-site-lang', next); } catch { /* Storage is optional. */ }
  }

  useEffect(() => {
    document.documentElement.lang = language === 'zh-Hant' ? 'zh-Hant' : 'zh-CN';
  }, [language]);

  return <LanguageContext value={{ traditional: language === 'zh-Hant', toggle }}>{children}</LanguageContext>;
}

export function useLanguage() { return useContext(LanguageContext); }
