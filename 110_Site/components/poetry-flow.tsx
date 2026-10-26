'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLanguage } from './language';
import { Arrow } from './site-chrome';
import { useNearViewport } from './use-near-viewport';

export type PoetrySleeve = { date: string; title: string; author: string; cover: string };

export function PoetryFlow({ issues, headingLevel = 3 }: { issues: PoetrySleeve[]; headingLevel?: 2 | 3 }) {
  const { traditional: t } = useLanguage();
  const [active, setActive] = useState(issues.length - 1);
  const [selectionReady, setSelectionReady] = useState(false);
  const { ref, near } = useNearViewport<HTMLDivElement>('400px');
  const [requested, setRequested] = useState<ReadonlySet<string>>(() => new Set());
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(() => new Set());
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
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
    setSelectionReady(true);
  }, [issues]);

  useEffect(() => {
    if (!near || !selectionReady || !issue) return;
    // Let the selected cover finish before fetching the other visible sleeves.
    const radius = loaded.has(issue.cover) || failed.has(issue.cover) ? 4 : 0;
    const covers = issues.slice(Math.max(0, active - radius), active + radius + 1).map(item => item.cover);
    setRequested(previous => covers.every(cover => previous.has(cover)) ? previous : new Set([...previous, ...covers]));
  }, [near, selectionReady, active, issue, issues, loaded, failed]);

  if (!issue) return null;
  return <div ref={ref} className="poetry-player" role="region" aria-roledescription="轮播图" aria-label="诗情画意封面流">
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
          <span className="album-art">{requested.has(item.cover) && <img src={item.cover} alt="" width="940" height="1672" loading="eager" decoding="async" fetchPriority={offset === 0 ? 'high' : 'low'} draggable={false}
            onLoad={() => setLoaded(previous => previous.has(item.cover) ? previous : new Set([...previous, item.cover]))}
            onError={() => setFailed(previous => previous.has(item.cover) ? previous : new Set([...previous, item.cover]))} />}
            <span className="album-label" aria-hidden="true"><strong>{item.title}</strong><small>{item.author}</small></span>
          </span>
          <span className="album-reflection" aria-hidden="true" style={{ backgroundImage: loaded.has(item.cover) ? `url("${item.cover}")` : undefined }} />
        </button>;
      })}
    </div>
    <div className="flow-caption" aria-live="polite" aria-atomic="true">
      <p className="flow-date">{issue.date.replaceAll('-', ' · ')}</p>
      <Heading>{issue.title}</Heading><p className="flow-author">{issue.author}</p>
      <Link className="flow-read" href={`/poetry-picture/${issue.date}/`} prefetch={false}>{t ? '打開這首詩' : '打开这首诗'}<Arrow /></Link>
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
