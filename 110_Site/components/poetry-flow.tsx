'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLanguage } from './language';
import { Arrow } from './site-chrome';

export type PoetrySleeve = { date: string; title: string; author: string; cover: string };

export function PoetryFlow({ issues, headingLevel = 3 }: { issues: PoetrySleeve[]; headingLevel?: 2 | 3 }) {
  const { traditional: t } = useLanguage();
  const [active, setActive] = useState(issues.length - 1);
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const latestWheel = useRef(0);
  const issue = issues[active];
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const move = (step: number) => setActive(value => Math.max(0, Math.min(issues.length - 1, value + step)));

  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get('day');
    const index = issues.findIndex(item => item.date === selected);
    if (index >= 0) setActive(index);
  }, [issues]);

  if (!issue) return null;
  return <div className="poetry-player" role="region" aria-roledescription="轮播图" aria-label="诗情画意封面流">
    <div className="flow-topline"><span>POETRY, IN PICTURES</span><span>VOL. 01 <i /> 2026</span></div>
    <div className="cover-flow" role="group" aria-label="左右滑动选择诗歌" tabIndex={0}
      onKeyDown={event => {
        if (event.target instanceof HTMLInputElement) return;
        if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
        if (event.key === 'Home') { event.preventDefault(); setActive(0); }
        if (event.key === 'End') { event.preventDefault(); setActive(issues.length - 1); }
      }}
      onPointerDown={event => { start.current = { x: event.clientX, y: event.clientY }; dragged.current = false; }}
      onPointerUp={event => {
        if (!start.current) return;
        const x = event.clientX - start.current.x, y = event.clientY - start.current.y;
        if (Math.abs(x) > 35 && Math.abs(x) > Math.abs(y)) { dragged.current = true; move(x < 0 ? 1 : -1); }
        start.current = null;
      }}
      onPointerCancel={() => { start.current = null; }}
      onWheel={event => {
        if (Math.abs(event.deltaX) < 12 || Math.abs(event.deltaX) < Math.abs(event.deltaY)) return;
        if (Date.now() - latestWheel.current > 220) { move(event.deltaX > 0 ? 1 : -1); latestWheel.current = Date.now(); }
      }}>
      <div className="flow-horizon" aria-hidden="true" />
      {issues.map((item, index) => {
        const offset = index - active, distance = Math.abs(offset), side = Math.sign(offset);
        const style = { '--offset': offset, '--side': side, '--distance': distance, zIndex: 20 - distance, visibility: distance > 4 ? 'hidden' : 'visible' } as CSSProperties;
        return <button type="button" key={item.date} className={`album-sleeve ${offset === 0 ? 'is-active' : ''}`} style={style}
          aria-label={`${item.title}，${item.author}，${item.date}${offset === 0 ? '，阅读全文' : ''}`}
          aria-current={offset === 0 ? 'true' : undefined} tabIndex={offset === 0 ? 0 : -1}
          onClick={event => {
            if (dragged.current) { event.preventDefault(); dragged.current = false; return; }
            if (offset === 0) window.location.assign(`/poetry-picture/${item.date}/`);
            else setActive(index);
          }}>
          <span className="album-art"><img src={item.cover} alt="" width="940" height="1672" loading={distance <= 2 ? 'eager' : 'lazy'} draggable={false} />
            <span className="album-label" aria-hidden="true"><strong>{item.title}</strong><small>{item.author}</small></span>
          </span>
          <span className="album-reflection" aria-hidden="true" style={{ backgroundImage: `url("${item.cover}")` }} />
        </button>;
      })}
    </div>
    <div className="flow-caption" aria-live="polite" aria-atomic="true">
      <p className="flow-date">{issue.date.replaceAll('-', ' · ')}</p>
      <Heading>{issue.title}</Heading><p className="flow-author">{issue.author}</p>
      <Link className="flow-read" href={`/poetry-picture/${issue.date}/`}>{t ? '打開這首詩' : '打开这首诗'}<Arrow /></Link>
    </div>
    <div className="flow-controls">
      <button type="button" aria-label="上一首诗" disabled={active === 0} onClick={() => move(-1)}><span className="reverse-arrow"><Arrow /></span></button>
      <label className="flow-seek"><span className="sr-only">选择每日诗歌</span><input type="range" min="0" max={issues.length - 1} value={active} aria-valuetext={`${issue.date} ${issue.title}`} onChange={event => setActive(Number(event.target.value))} /></label>
      <button type="button" aria-label="下一首诗" disabled={active === issues.length - 1} onClick={() => move(1)}><Arrow /></button>
      <span className="flow-count">{String(active + 1).padStart(2, '0')} <span>/ {String(issues.length).padStart(2, '0')}</span></span>
    </div>
    <p className="flow-hint">{t ? '左右滑動封面，點開一首詩。' : '左右滑动封面，点开一首诗。'}</p>
  </div>;
}
