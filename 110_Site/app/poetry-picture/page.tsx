import type { Metadata } from 'next';
import Link from 'next/link';
import issues from '@/content/poetry-picture.json';
import { PoetryFlow } from '@/components/poetry-flow';
import { DeferredImage } from '@/components/deferred-image';

export const metadata: Metadata = {
  title: '诗情画意 · 每天一首诗',
  description: '把日子翻成一张张诗的封面。从一幅画，走进一首诗，再读一段解析与刊发缘起。',
  alternates: { canonical: '/poetry-picture/' },
};

export default function PoetryPicturePage() {
  return <main id="main" className="poetry-collection shell">
    <header className="collection-heading"><p className="eyebrow">POETRY–PICTURE / 每天一首诗</p><h1>诗情画意<span className="heading-dot">.</span></h1><p>把日子，翻成一张张诗的封面。</p></header>
    <PoetryFlow headingLevel={2} eager issues={issues.map(({ date, title, author, cover }) => ({ date, title, author, cover }))} />
    <section className="poetry-tracklist" aria-labelledby="tracklist-title">
      <div className="tracklist-heading"><h2 id="tracklist-title">每一日，都有诗。</h2><span>THE COLLECTION</span></div>
      {issues.map((item, index) => <Link key={item.date} href={`/poetry-picture/${item.date}/`} prefetch={false}><span className="track-number">{String(index + 1).padStart(2, '0')}</span><DeferredImage src={item.cover} width={48} height={48} alt="" rootMargin="120px" /><span className="track-name">{item.title}<small>{item.author}</small></span><time dateTime={item.date}>{item.date.slice(5).replace('-', '.')}</time><span aria-hidden="true">↗</span></Link>)}
    </section>
  </main>;
}
