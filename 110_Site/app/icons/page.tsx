import type { Metadata } from 'next';
import { IconGallery } from '@/components/icon-gallery';
import './icon-gallery.css';

export const metadata: Metadata = {
  title: '雨藏万象 · 图标展',
  description: '滴水龙雨的图标展。浏览晶彩、奶糖、匠物、小物、冰透和微景，看看同一个应用的六种模样。',
  alternates: { canonical: '/icons/' },
};

export default function IconsPage() {
  return <IconGallery />;
}
