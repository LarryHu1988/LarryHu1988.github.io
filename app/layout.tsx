import type { Metadata } from 'next';
import { LanguageProvider } from '@/components/language';
import { SiteHeader, SiteFooter } from '@/components/site-chrome';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://larryhu.com'),
  title: { default: '滴水龙雨工作室 · Larry Studio', template: '%s · 滴水龙雨工作室' },
  description: '生于滴水沿，现居滴水湖。Lawrence Hu 的个人网站，记录诗歌与独立开发的 App：SimpleWorth、KeepFit 和 PDF Librarian。',
  alternates: { canonical: '/' },
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: '滴水龙雨工作室 · Larry Studio',
    description: '写代码，也写小诗。一个半导体工程师的个人创作空间。',
    locale: 'zh_CN',
    type: 'website',
    images: [{ url: '/social.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/dm-sans.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/noto-serif-sc.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <meta name="theme-color" content="#f5f3ed" />
      </head>
      <body>
        <LanguageProvider>
          <a className="skip-link" href="#main">跳至主要内容</a>
          <SiteHeader />
          {children}
          <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}
