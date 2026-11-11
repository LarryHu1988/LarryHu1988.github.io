'use client';

import { useState } from 'react';
import apps from '@/content/icon-gallery.json';
import { useLanguage } from './language';

const series = [
  { id: 'glosspop', name: '晶彩', english: 'GlossPop' },
  { id: 'creampop', name: '奶糖', english: 'CreamPop' },
  { id: 'objectcraft', name: '匠物', english: 'ObjectCraft' },
] as const;

type Series = (typeof series)[number];
type IconApp = (typeof apps)[number];
type View = Series['id'] | 'compare';

function Preview({ app, collection, alt = '', eager = false }: {
  app: IconApp;
  collection: Series;
  alt?: string;
  eager?: boolean;
}) {
  return (
    <img
      src={`/icon-gallery/${collection.id}/${app.id}.webp`}
      alt={alt}
      width={288}
      height={288}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
    />
  );
}

export function IconGallery() {
  const { traditional } = useLanguage();
  const [view, setView] = useState<View>('glosspop');
  const activeSeries = series.find(collection => collection.id === view);
  const compareLabel = traditional ? '並排對比' : '并排对比';
  const appName = (app: IconApp) => traditional ? app.traditional : app.name;

  return (
    <main id="main" className="icon-exhibit shell">
      <section className="icon-intro" aria-labelledby="icon-title">
        <div className="icon-intro-copy">
          <p className="icon-kicker"><span /> ICON COLLECTION</p>
          <h1 id="icon-title">{traditional ? '雨藏萬象' : '雨藏万象'}</h1>
          <p className="icon-intro-description">
            {traditional ? '同一個應用，三種模樣。' : '同一个应用，三种模样。'}
          </p>
          <p className="icon-intro-count">
            {traditional ? '三套系列，每套 1000+ 款圖標' : '三套系列，每套 1000+ 款图标'}
          </p>
        </div>
        <figure className="icon-sample">
          <div className="icon-sample-art">
            {series.map(collection => (
              <div className="icon-sample-cell" data-series={collection.id} key={collection.id}>
                <Preview app={apps[0]} collection={collection} alt={`${collection.name}${appName(apps[0])}`} eager />
              </div>
            ))}
          </div>
          <figcaption>
            <span>{appName(apps[0])} <span lang="en">{apps[0].english}</span></span>
            <span>{series.map(collection => collection.name).join(' · ')}</span>
          </figcaption>
        </figure>
      </section>

      <section className="icon-gallery" aria-label={traditional ? '圖標預覽' : '图标预览'}>
        <div className="icon-toolbar">
          <div className="icon-views" role="group" aria-label={traditional ? '選擇預覽方式' : '选择预览方式'}>
            {series.map(collection => (
              <button type="button" key={collection.id} aria-pressed={view === collection.id} onClick={() => setView(collection.id)}>
                <span className="icon-series-dot" data-series={collection.id} aria-hidden="true" />
                {collection.name}
                <span className="icon-series-english" lang="en">{collection.english}</span>
              </button>
            ))}
            <button className="icon-compare-button" type="button" aria-pressed={view === 'compare'} onClick={() => setView('compare')}>
              <span className="icon-compare-symbol" aria-hidden="true"><i /><i /><i /></span>
              {compareLabel}
            </button>
          </div>
          <p className="icon-view-count" aria-live="polite">
            <span className="sr-only">{activeSeries?.name ?? compareLabel} · </span>
            {traditional ? `精選 ${apps.length} 個應用` : `精选 ${apps.length} 个应用`}
          </p>
        </div>

        {activeSeries ? (
          <ul className="icon-grid" aria-label={activeSeries.name}>
            {apps.map(app => (
              <li className="icon-card" data-series={activeSeries.id} key={app.id}>
                <Preview app={app} collection={activeSeries} />
                <span className="icon-app-label">{appName(app)}</span>
                {appName(app) !== app.english && <span className="icon-app-english" lang="en">{app.english}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <table className="icon-comparison" aria-label={compareLabel}>
            <thead>
              <tr>
                <th scope="col">{traditional ? '應用' : '应用'}</th>
                {series.map(collection => (
                  <th scope="col" key={collection.id}>
                    <span className="icon-series-dot" data-series={collection.id} aria-hidden="true" />
                    {collection.name} <span className="icon-series-english" lang="en">{collection.english}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apps.map(app => (
                <tr key={app.id}>
                  <th scope="row">
                    <span className="icon-app-label">{appName(app)}</span>
                    {appName(app) !== app.english && <span className="icon-app-english" lang="en">{app.english}</span>}
                  </th>
                  {series.map(collection => (
                    <td key={collection.id} data-series={collection.id}>
                      <Preview app={app} collection={collection} alt={`${collection.name}${appName(app)}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
