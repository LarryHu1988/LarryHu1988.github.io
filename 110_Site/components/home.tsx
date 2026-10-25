'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { apps } from '@/content/apps';
import poems from '@/content/poems.json';
import { useLanguage } from './language';
import { Arrow } from './site-chrome';
import { PoetryFlow, type PoetrySleeve } from './poetry-flow';

function RainStudy() {
  return <div className="rain-study" aria-label="抽象雨滴与水面涟漪插画" role="img">
    <div className="study-grid" />
    <svg className="rain-drawing" viewBox="0 0 480 480" fill="none" aria-hidden="true">
      <defs><linearGradient id="drop" x1="170" y1="90" x2="310" y2="320" gradientUnits="userSpaceOnUse"><stop stopColor="#6e9c8d"/><stop offset="1" stopColor="#234f43"/></linearGradient><linearGradient id="reflection" x1="240" y1="340" x2="240" y2="430" gradientUnits="userSpaceOnUse"><stop stopColor="#285a49" stopOpacity=".14"/><stop offset="1" stopColor="#285a49" stopOpacity="0"/></linearGradient></defs>
      <g className="ripples" stroke="#527a68" strokeWidth=".8"><ellipse cx="240" cy="347" rx="175" ry="57" opacity=".2"/><ellipse cx="240" cy="347" rx="144" ry="45" opacity=".3"/><ellipse cx="240" cy="347" rx="110" ry="32" opacity=".4"/><ellipse cx="240" cy="347" rx="73" ry="20" opacity=".5"/><ellipse cx="240" cy="347" rx="34" ry="9" opacity=".6"/></g>
      <path d="M240 342c-15 25-46 40-46 58 0 25 92 25 92 0 0-18-31-33-46-58Z" fill="url(#reflection)"/>
      <g className="floating-drop"><path d="M240 83c-23 46-95 104-95 163a95 95 0 0 0 190 0c0-59-72-117-95-163Z" fill="url(#drop)"/><path d="M170 244c0-43 39-82 62-119" stroke="#c4d3b8" strokeWidth="1" opacity=".7"/><path d="M165 274c31-27 109 34 154-8M175 294c38-22 92 19 131-7M195 314c31-11 56 7 91-9" stroke="#e4e8d4" strokeWidth="1.1" opacity=".8"/><path d="M243 105c15 28 37 52 54 80" stroke="#afc8ae" strokeWidth=".7" opacity=".45"/></g>
      <path d="M67 145h14m-7-7v14M379 275h14m-7-7v14" stroke="#7e8f7b" strokeWidth="1"/><circle cx="371" cy="125" r="9" fill="#b75b3e"/><path d="M352 125h-35m54 19v31" stroke="#b75b3e" strokeWidth=".8" opacity=".6"/><path d="M240 60v-16m0 337v44" stroke="#7e8f7b" strokeWidth=".7" strokeDasharray="3 5"/>
    </svg>
    <div className="study-caption"><span>一滴水，一个小小的世界。</span><span className="study-stamp">龙雨</span></div>
  </div>;
}

function SectionHeading({ id, number, english, title, detail }: { id: string; number: string; english: string; title: string; detail: string }) {
  return <div className="section-heading"><div><p className="eyebrow"><span>{number}</span> / {english}</p><h2 id={id}>{title}<span className="heading-dot">.</span></h2></div><p className="section-detail">{detail}</p></div>;
}

export function Home({ dailyPoems }: { dailyPoems: PoetrySleeve[] }) {
  const { traditional: t } = useLanguage();
  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.1 });
    document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
    document.documentElement.classList.add('motion-ready');
    return () => { observer.disconnect(); document.documentElement.classList.remove('motion-ready'); };
  }, []);

  return <main id="main">
    <section className="hero shell" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow hero-eyebrow"><span className="status-dot" />{t ? '上海 · 滴水湖' : '上海 · 滴水湖'}<span className="eyebrow-rule" /> A PERSONAL SPACE</p>
        <h1 id="hero-title">{t ? '寫代碼，' : '写代码，'}<br />{t ? '也寫' : '也写'}<em>{t ? '小詩。' : '小诗。'}</em></h1>
        <p className="hero-introduction">{t ? '你好，我是滴水龍雨。' : '你好，我是滴水龙雨。'}<br /><span>{t ? '半導體工程師，獨立開發者，也寫一點詩。' : '半导体工程师，独立开发者，也写一点诗。'}</span></p>
        <div className="hero-links"><a className="button button-dark" href="#apps">{t ? '看看我的作品' : '看看我的作品'}<Arrow /></a><a className="text-link" href="#poetry">{t ? '讀一首小詩' : '读一首小诗'}<Arrow diagonal /></a></div>
        <p className="hero-footnote">ENGINEERING BY DAY. CREATING ALONG THE WAY.</p>
      </div>
      <RainStudy />
      <div className="hero-bottom"><span>LIFE, IN MY OWN WORDS & WORKS.</span><a href="#about">SCROLL TO EXPLORE <span>↓</span></a></div>
    </section>

    <section id="about" className="about-section shell section-space" aria-labelledby="about-title" data-reveal>
      <div className="about-label"><p className="eyebrow">01 / THE PERSON BEHIND</p><h2 id="about-title">{t ? '滴水龍雨' : '滴水龙雨'}<span className="heading-dot">.</span></h2><p className="about-name">Lawrence Hu<span> / Larry</span></p><div className="about-seal" aria-hidden="true">{t ? '生於滴水沿' : '生于滴水沿'}<br />{t ? '現居滴水湖' : '现居滴水湖'}</div></div>
      <div className="bio-chinese"><p>{t ? '生於滴水沿，現居滴水湖。' : '生于滴水沿，现居滴水湖。'}<br />{t ? '生肖屬龍，生時逢雨。' : '生肖属龙，生时逢雨。'}</p><p>{t ? '半導體行業從業十二年，' : '半导体行业从业十二年，'}<br />{t ? '從產品工程到工藝整合。' : '从产品工程到工艺整合。'}</p><p>{t ? '追梅西，忠巴薩，念科比。' : '追梅西，忠巴萨，念科比。'}<br />{t ? '看讀庫，讀新詩，寫小詩。' : '看读库，读新诗，写小诗。'}<br />{t ? '踢實況，打黑猴，碼 APP。' : '踢实况，打黑猴，码 APP。'}</p></div>
      <div className="bio-english" lang="en"><p>12 years in semiconductors,<br /><span className="engineering-line">from product engineering to process integration.</span></p><p>Messi follower, Barça culer, Kobe in memory.<br />A Duku reader and Chinese poetry enthusiast.<br />A gamer of eFootball and Black Myth.<br />An independent app developer.</p></div>
    </section>

    <section id="apps" className="apps-section section-space" aria-labelledby="apps-title">
      <div className="shell">
        <div data-reveal><SectionHeading id="apps-title" number="02" english="THINGS I BUILD" title={t ? '數碼雨飯' : '数码雨饭'} detail={t ? '從自己的日常出發，做一點有用的東西。' : '从自己的日常出发，做一点有用的东西。'} /></div>
        <div className="apps-grid">{apps.map(app => <article className={`app-card ${app.id}`} key={app.id} data-reveal>
          <a className="app-visual" href={app.home} aria-label={`${app.name} ${t ? '產品主頁' : '产品主页'}`}>
            <div className="app-visual-top"><span>{app.category}</span><span>{app.number}</span></div>
            <div className="visual-orbit" aria-hidden="true" />
            <div className={app.id === 'pdflibrarian' ? 'mac-preview' : 'phone-preview'}>{app.id === 'pdflibrarian' && <div className="mac-titlebar"><i /><i /><i /><span>PDF Librarian</span></div>}<img src={app.screen} alt={app.screenAlt} width={app.id === 'pdflibrarian' ? 1120 : 720} height={app.id === 'pdflibrarian' ? 760 : 1564} loading="lazy" /></div>
            <span className="visual-open"><Arrow diagonal /></span>
          </a>
          <div className="app-information"><div className="app-title-row"><img className="app-icon" src={app.icon} alt="" width="48" height="48" loading="lazy" /><div><h3><a href={app.home}>{app.name}{app.chinese && <small>{t ? app.traditional : app.chinese}</small>}</a></h3><span className="app-platform">{app.platform}</span></div></div>
            <h4>{t ? app.taglineHant : app.tagline}</h4><p className="app-description">{t ? app.descriptionHant : app.description}</p>
            <ul className="app-tags" aria-label="主要功能">{(t ? app.featuresHant : app.features).map(feature => <li key={feature}>{feature}</li>)}</ul>
            <div className="app-primary-links"><a href={app.home}>{t ? '探索這個 App' : '探索这个 App'}<Arrow /></a><a className="store-link" href={app.store} target="_blank" rel="noreferrer" aria-label={`${app.name} App Store`}>App Store <Arrow diagonal /></a></div>
            <div className="app-secondary-links"><a href={app.support}>{t ? '技術支持' : '技术支持'}</a><span>·</span><a href={app.privacy}>{t ? '隱私政策' : '隐私政策'}</a></div>
          </div>
        </article>)}</div>
        <p className="apps-note"><span className="small-dot" />{t ? '三個小作品，認真對待每一個日常。' : '三个小作品，认真对待每一个日常。'}<span className="apps-note-en">SMALL APPS. THOUGHTFULLY MADE.</span></p>
      </div>
    </section>

    <section id="poetry" className="poetry-section section-space" aria-labelledby="poetry-title">
      <div className="shell"><div data-reveal><SectionHeading id="poetry-title" number="03" english="WORDS I KEEP" title={t ? '詩情雨意' : '诗情雨意'} detail={t ? '有些話，留給詩來說。' : '有些话，留给诗来说。'} /></div>
        <div className="poem-grid">{poems.map((poem, i) => <Link className={`poem-card poem-${i}`} href={`/poems/${poem.slug}/`} key={poem.slug} data-reveal>
          <div className="poem-card-top"><span>POEM / 00{i + 1}</span><span>{poem.author}</span></div>
          <div className="poem-art" aria-hidden="true">{i === 0 ? <><span className="hill hill-back" /><span className="hill hill-front" /><span className="poem-sun" /></> : <><span className="stage-frame stage-1" /><span className="stage-frame stage-2" /><span className="stage-frame stage-3" /><span className="stage-circle" /></>}</div>
          <div className="poem-card-copy"><p className="poem-year">{i === 0 ? '丁酉年 · 正月初三' : '2013 · 08 · 05'}</p><h3>{poem.title}</h3><p className="poem-excerpt">{i === 0 ? <>我们甚至没有血缘关系<br />却又不知何故<br />在正月的日子里<br />我回忆起了他</> : <>这是一个无尽的舞台<br />所有人都在刻意不刻意地表演</>}</p></div>
          <div className="poem-card-bottom"><span>{t ? '讀完整首詩' : '读完整首诗'}</span><span className="poem-arrow"><Arrow /></span></div>
        </Link>)}</div>
        <div className="poetry-end" data-reveal><span className="end-flower" aria-hidden="true">✳</span><p>{t ? '日子慢慢過，文字慢慢寫。' : '日子慢慢过，文字慢慢写。'}</p><span>TO BE CONTINUED</span></div>
      </div>
    </section>
    <section id="poetry-picture" className="picture-section section-space" aria-labelledby="picture-title">
      <div className="shell"><SectionHeading id="picture-title" number="04" english="A POEM FOR EVERY DAY" title={t ? '詩情畫意' : '诗情画意'} detail={t ? '從一幅畫，走進一首詩。' : '从一幅画，走进一首诗。'} />
        <PoetryFlow issues={dailyPoems} />
        <div className="picture-collection-link"><span>{t ? '每天一首，慢慢收藏。' : '每天一首，慢慢收藏。'}</span><Link className="text-link" href="/poetry-picture/">{t ? '翻閱整本詩集' : '翻阅整本诗集'}<Arrow /></Link></div>
      </div>
    </section>
  </main>;
}
