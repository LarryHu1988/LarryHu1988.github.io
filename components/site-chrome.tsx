'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useLanguage } from './language';

export function Arrow({ diagonal = false, className = '' }: { diagonal?: boolean; className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? 'M5 19 19 5M5 5h14v14' : 'M4 12h16m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function Mark() {
  return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 5C16 12 9 18 9 25a11 11 0 0 0 22 0c0-7-7-13-11-20Z" fill="currentColor"/><path d="M14 26c3-4 9 4 13-1M15 31c3-3 6 2 10-1" stroke="#f5f3ed" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}

export function SiteHeader() {
  const { traditional, toggle } = useLanguage();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const home = pathname === '/' ? '' : '/';
  const links = [
    { href: `${home}#about`, label: traditional ? '關於我' : '关于我' },
    { href: `${home}#apps`, label: traditional ? '數碼雨飯' : '数码雨饭' },
    { href: `${home}#poetry`, label: traditional ? '詩情雨意' : '诗情雨意' },
  ];
  return <header className="site-header">
    <div className="shell header-inner">
      <Link className="brand" href="/" aria-label={traditional ? 'Larry Studio · 滴水龍雨工作室首頁' : 'Larry Studio · 滴水龙雨工作室首页'} onClick={() => setMenuOpen(false)}><Mark /><span className="brand-copy"><span className="brand-name">Larry<span className="brand-light"> Studio</span><span className="brand-period">.</span></span><span className="brand-chinese">{traditional ? '滴水龍雨工作室' : '滴水龙雨工作室'}</span></span></Link>
      <nav className="desktop-nav" aria-label={traditional ? '主要導覽' : '主要导航'}>{links.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav>
      <div className="header-actions">
        <button className="language-button" onClick={toggle} aria-label={traditional ? '切换为简体中文' : '切換為繁體中文'}>{traditional ? '简' : '繁'}<span aria-hidden="true"> / {traditional ? '繁' : '简'}</span></button>
        <a className="github-link" href="https://github.com/LarryHu1988" target="_blank" rel="noreferrer">GitHub <Arrow diagonal /></a>
        <button className="menu-button" aria-expanded={menuOpen} aria-controls="mobile-nav" aria-label={menuOpen ? '关闭菜单' : '打开菜单'} onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button>
      </div>
    </div>
    <nav id="mobile-nav" className="mobile-nav" aria-label="移动导航" hidden={!menuOpen}>{links.map(link => <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}<Arrow /></a>)}</nav>
  </header>;
}

export function SiteFooter() {
  const { traditional } = useLanguage();
  return <footer className="site-footer shell">
    <div className="footer-top"><Link className="footer-signature" href="/">{traditional ? '滴水龍雨工作室' : '滴水龙雨工作室'}<span>Larry Studio</span></Link><p>{traditional ? '生活有跡，創作有聲。' : '生活有迹，创作有声。'}<br /><span>A little code. A little poetry.</span></p><a className="back-top" href="#main" aria-label="回到顶部"><Arrow /><span>BACK TO TOP</span></a></div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} Lawrence Hu</span><span>{traditional ? '寫於生活，做於熱愛。' : '写于生活，做于热爱。'}</span><a href="https://github.com/LarryHu1988" target="_blank" rel="noreferrer">GitHub <Arrow diagonal /></a></div>
  </footer>;
}
