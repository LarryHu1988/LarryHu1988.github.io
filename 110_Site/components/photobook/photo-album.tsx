'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLanguage } from '../language';
import { Arrow } from '../site-chrome';
import type { Photo } from './types';
import { captureLabel } from './capture.mjs';

const volumeSize = 24;

function PhotoWatermark({ photo }: { photo: Photo }) {
  const label = captureLabel(photo.capture);
  return label ? <span className="photo-watermark" data-photo-watermark>{label}</span> : null;
}

function PhotoReader({ photos, volume }: { photos: Photo[]; volume: number }) {
  const { traditional } = useLanguage();
  const root = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState({ current: 0, total: 0 });
  const edition = photos.slice(volume * volumeSize, (volume + 1) * volumeSize);

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;
    setReady(false); setFailed(false);
    (async () => {
      const [{ createPhotoBook }, { bookPages }] = await Promise.all([import('./runtime.js'), import('./page-art.js')]);
      if (!active || !root.current) return;
      cleanup = await createPhotoBook(root.current, {
        id: `light-rain-${volume}`, title: 'LIGHT & RAIN', titleZh: '拾光听雨', mark: String(volume + 1), ratio: .75,
        pages: bookPages(photos.slice(volume * volumeSize, (volume + 1) * volumeSize)),
      }, (value: { current: number; total: number }) => {
        if (active) { setStatus(value); setReady(true); }
      }, () => { if (active) setFailed(true); });
      if (!active) cleanup?.();
    })().catch(() => { if (active) setFailed(true); });
    return () => { active = false; cleanup?.(); };
  }, [photos, volume, traditional]);

  const visible = edition.filter((_, index) => [status.current - 3, status.current - 2].includes(index));
  return <div className={`photo-reader ${ready ? 'is-ready' : ''} ${failed ? 'is-unavailable' : ''}`} ref={root}>
    <div className="reader-topline"><span>LIGHT & RAIN / VOL. {String(volume + 1).padStart(2, '0')}</span><span>{edition.length} PHOTOGRAPHS</span></div>
    <div className="photo-stage">
      <canvas tabIndex={0} aria-label={traditional ? '可翻頁相冊，使用左右方向鍵翻頁，Home 和 End 到封面封底' : '可翻页相册，使用左右方向键翻页，Home 和 End 到封面封底'} />
      {!ready && !failed && <div className="reader-cover-fallback" aria-hidden="true"><span>LIGHT & RAIN</span><strong>{traditional ? '拾光聽雨' : '拾光听雨'}</strong><small>{traditional ? '拾光成冊 聽雨成詩' : '拾光成册 听雨成诗'}</small></div>}
      {failed && <div className="reader-unavailable"><p>{traditional ? '這裡的光影，也可以平鋪著看。' : '这里的光影，也可以平铺着看。'}</p><a className="text-link" href="#photo-contact-sheet">{traditional ? '查看下方照片' : '查看下方照片'}<Arrow /></a></div>}
      <div data-library hidden />
      <div data-loading className="reader-loading" role="status"><span className="small-dot" /><span data-loading-copy>{traditional ? '正在準備相冊' : '正在准备相册'}</span></div>
    </div>
    <div className="reader-bottomline">
      <p>{traditional ? '輕觸頁邊，或左右拖動翻頁。' : '轻触页边，或左右拖动翻页。'}</p>
      <div className="reader-controls"><button type="button" data-previous aria-label={traditional ? '上一頁' : '上一页'} disabled={!ready || status.current <= 0}><span className="reverse-arrow"><Arrow /></span></button><span data-page-state aria-live="polite">{traditional ? '封面' : '封面'}</span><button type="button" data-next aria-label={traditional ? '下一頁' : '下一页'} disabled={!ready || status.current >= status.total}><Arrow /></button></div>
    </div>
    <div className="reader-originals">{visible.map(photo => <a key={photo.id} href={photo.original.src} target="_blank" rel="noreferrer">{photo.title} · {traditional ? '查看原圖' : '查看原图'}<Arrow diagonal /></a>)}</div>
    <noscript><p className="reader-noscript">相册翻页需要 JavaScript，下方照片和原图仍可直接查看。</p></noscript>
  </div>;
}

export function PhotoAlbum({ photos }: { photos: Photo[] }) {
  const { traditional: t } = useLanguage();
  const [volume, setVolume] = useState(0);
  const [selected, setSelected] = useState<Photo | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const volumes = Math.max(1, Math.ceil(photos.length / volumeSize));
  useEffect(() => {
    const element = dialog.current;
    if (selected) element?.showModal();
    else element?.close();
  }, [selected]);

  return <main id="main" className="photography-page shell">
    <Link className="reading-back" href="/#photos"><span className="reverse-arrow"><Arrow /></span>{t ? '回到工作室' : '回到工作室'}</Link>
    <header className="photography-heading"><p className="eyebrow">PHOTOGRAPHS & EVERYDAY LIFE</p><h1>{t ? '拾光聽雨' : '拾光听雨'}<span className="heading-dot">.</span></h1><p>{t ? '拾光成冊 聽雨成詩' : '拾光成册 听雨成诗'}</p></header>
    {volumes > 1 && <label className="photo-volume">{t ? '選一本相冊' : '选一本相册'}<select value={volume} onChange={event => setVolume(Number(event.target.value))}>{Array.from({ length: volumes }, (_, index) => <option key={index} value={index}>VOL. {String(index + 1).padStart(2, '0')} / {index * volumeSize + 1}–{Math.min(photos.length, (index + 1) * volumeSize)}</option>)}</select></label>}
    <PhotoReader key={`${volume}-${t ? 'hant' : 'hans'}`} photos={photos} volume={volume} />
    <section id="photo-contact-sheet" className="photo-contact-sheet" aria-labelledby="photo-sheet-title">
      <div className="photo-sheet-heading"><h2 id="photo-sheet-title">{t ? '日常的切片' : '日常的切片'}</h2><span>{String(photos.length).padStart(3, '0')} / COLLECTED MOMENTS</span></div>
      {photos.length ? <div className="photo-grid">{photos.map(photo => <a key={photo.id} href={photo.original.src} target="_blank" rel="noreferrer" onClick={event => { event.preventDefault(); setSelected(photo); }} aria-label={`${photo.title}，${t ? '查看高清原圖' : '查看高清原图'}`}><figure><div className="photo-image-frame"><img src={(photo.variants[0] || photo.original).src} srcSet={[...photo.variants, photo.original].map(v => `${v.src} ${v.width}w`).join(', ')} sizes="(max-width:600px) calc(100vw - 48px), (max-width:1000px) calc((100vw - 72px) / 2), 360px" width={photo.width} height={photo.height} loading="lazy" decoding="async" alt={photo.title} /><PhotoWatermark photo={photo} /></div><figcaption><span>{photo.title}</span><Arrow diagonal /></figcaption></figure></a>)}</div> : <div className="photo-empty"><span aria-hidden="true">[ 00 ]</span><p>{t ? '相冊已打開，等待下一個瞬間。' : '相册已打开，等待下一个瞬间。'}</p><small>{t ? '路過的風景，身邊的日常。' : '路过的风景，身边的日常。'}</small></div>}
    </section>
    <p className="photo-colophon">{t ? '光影有時，日常有聲。' : '光影有时，日常有声。'}<span>LARRY STUDIO · LIGHT & RAIN</span></p>
    <details className="photo-credits"><summary>{t ? '相冊製作鳴謝' : '相册制作鸣谢'}</summary><p>3D Book 2 · <a href="https://github.com/HaichaoLihc/create-photo-flipbook-ui" target="_blank" rel="noreferrer">Haichao Li</a> / <a href="/licenses/photo-flipbook-MIT.txt">MIT</a>. Quick FlipBook / <a href="/licenses/quick-flipbook-BSD.txt">BSD</a>. Three.js / <a href="/licenses/three-MIT.txt">MIT</a>. <a href="/licenses/three-modifiers-NOTICE.txt">three.modifiers</a>.</p></details>
    <dialog className="photo-lightbox" ref={dialog} aria-label={t ? '高清照片' : '高清照片'} onCancel={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) setSelected(null); }}>
      <button type="button" className="photo-lightbox-close" onClick={() => setSelected(null)} aria-label={t ? '關閉照片' : '关闭照片'}>×</button>
      {selected && <><div className="photo-lightbox-stage"><div className="photo-lightbox-frame" style={{ '--photo-ratio': selected.width / selected.height } as CSSProperties}><img src={selected.original.src} width={selected.width} height={selected.height} alt={selected.title} /><PhotoWatermark photo={selected} /></div></div><div className="photo-lightbox-info"><span>{selected.title} / {selected.width} × {selected.height}</span><a href={selected.original.src} target="_blank" rel="noreferrer">{t ? '打開全尺寸原圖' : '打开全尺寸原图'}<Arrow diagonal /></a></div></>}
    </dialog>
  </main>;
}
