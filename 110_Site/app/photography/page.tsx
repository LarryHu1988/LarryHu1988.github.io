import type { Metadata } from 'next';
import album from '@/content/photography.json';
import { PhotoAlbum } from '@/components/photobook/photo-album';
import './photography.css';

export const metadata: Metadata = {
  title: '拾光听雨 · 个人摄影集',
  description: '拾光成册，听雨成诗。滴水龙雨的摄影与日常影像，在一本可以翻阅的相册里慢慢收藏。',
  alternates: { canonical: '/photography/' },
};

export default function PhotographyPage() {
  return <PhotoAlbum photos={album.photos} />;
}
