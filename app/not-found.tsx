import Link from 'next/link';

export default function NotFound() {
  return <main id="main" className="not-found shell"><p className="eyebrow">404 / A SMALL DETOUR</p><h1>这页，暂时留白。</h1><p>你要找的页面可能已经搬家。先回到首页，看看诗和作品。</p><Link className="button button-dark" href="/">回到首页 <span aria-hidden="true">↗</span></Link></main>;
}
