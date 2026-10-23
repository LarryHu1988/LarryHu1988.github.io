import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import poems from '@/content/poems.json';
import { Arrow } from '@/components/site-chrome';

export function generateStaticParams() { return poems.map(poem => ({ slug: poem.slug })); }
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const poem = poems.find(poem => poem.slug === slug);
  if (!poem) return {};
  return { title: poem.title, description: poem.quotes[0], alternates: { canonical: `/poems/${slug}/` }, openGraph: { title: `${poem.title} · 龙雨`, description: poem.quotes[0], url: `/poems/${slug}/`, type: 'article' } };
}

export default async function PoemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const index = poems.findIndex(poem => poem.slug === slug);
  if (index === -1) notFound();
  const poem = poems[index];
  const next = poems[(index + 1) % poems.length];
  return <main id="main" className="reading-page shell">
    <Link className="reading-back text-link" href="/#poetry"><span className="reverse-arrow"><Arrow /></span> 返回诗情雨意</Link>
    <article className="reading-article">
      <header className="reading-header"><p className="eyebrow">WORDS I KEEP / 00{index + 1}</p><h1>{poem.title}</h1><p className="reading-meta"><span>{poem.author}</span><span>{poem.writtenAt}</span></p></header>
      <div className="poem-full">{poem.content.split('\n\n').map((stanza, i) => <p key={i}>{stanza}</p>)}</div>
      <div className="reading-end" role="separator" aria-label="诗歌结束"><span /><span className="end-flower" aria-hidden="true">✳</span><span /></div>
    </article>
    <Link className="next-poem" href={`/poems/${next.slug}/`}><span><small>再读一首 / NEXT POEM</small><strong>{next.title}</strong></span><Arrow /></Link>
  </main>;
}
