import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import issues from '@/content/poetry-picture.json';
import { Arrow } from '@/components/site-chrome';
import { DeferredImage } from '@/components/deferred-image';

export const dynamicParams = false;
export function generateStaticParams() { return issues.map(issue => ({ date: issue.date })); }
export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params, issue = issues.find(item => item.date === date);
  if (!issue) return {};
  return { title: `${issue.title} · ${issue.author}`, description: issue.occasion.join(''), alternates: { canonical: `/poetry-picture/${date}/` }, openGraph: { title: `${issue.title} · ${issue.author}`, description: issue.occasion.join(''), url: `/poetry-picture/${date}/`, type: 'article', images: [{ url: issue.image, width: issue.width, height: issue.height }] } };
}

export default async function DailyPoetry({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const index = issues.findIndex(item => item.date === date);
  if (index < 0) notFound();
  const issue = issues[index], previous = issues[index - 1], next = issues[index + 1];
  return <main id="main" className="daily-poetry shell">
    <Link href={`/poetry-picture/?day=${issue.date}`} className="reading-back text-link"><span className="reverse-arrow"><Arrow /></span>返回封面流</Link>
    <article>
      <header className="daily-heading"><p className="eyebrow">POETRY–PICTURE <span>/</span><time dateTime={date}>{date.replaceAll('-', ' · ')}</time></p><h1>{issue.title}</h1><p>{issue.author}</p></header>
      <div className="daily-layout">
        {/* Reading and opening the illustration retain the unchanged native original. */}
        <figure className="daily-illustration"><a href={issue.cover} target="_blank" rel="noreferrer" aria-label={`${issue.title}，查看原尺寸插图`}><DeferredImage src={issue.cover} alt={`《${issue.title}》诗意插图`} width={issue.width} height={issue.height} original eager fetchPriority="high" /></a><figcaption>一首诗，一幅画。<span>POETRY–PICTURE</span></figcaption></figure>
        <div className="daily-text"><section className="daily-poem" aria-label="诗歌原文">{issue.poem.map((stanza, i) => <p key={i}>{stanza}</p>)}</section>
          <section className="daily-analysis" aria-labelledby="analysis-title"><h2 id="analysis-title">读诗<span>READING THE POEM</span></h2>{issue.analysis.map((paragraph, i) => <p key={i}>{paragraph}</p>)}</section>
          <aside className="daily-occasion" aria-labelledby="occasion-title"><h2 id="occasion-title">刊发缘起</h2>{issue.occasion.map((paragraph, i) => <p key={i}>{paragraph}</p>)}</aside>
        </div>
      </div>
    </article>
    <nav className="daily-next" aria-label="每日诗歌导航">{previous ? <Link href={`/poetry-picture/${previous.date}/`}><small>前一日 / {previous.date.slice(5)}</small><span>← {previous.title}</span></Link> : <span />}{next ? <Link href={`/poetry-picture/${next.date}/`}><small>后一日 / {next.date.slice(5)}</small><span>{next.title} →</span></Link> : <Link href="/poetry-picture/"><small>POETRY–PICTURE</small><span>回到诗集 →</span></Link>}</nav>
  </main>;
}
