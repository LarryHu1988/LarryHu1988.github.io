import type { MetadataRoute } from 'next';
import poems from '@/content/poems.json';
import dailyPoems from '@/content/poetry-picture.json';
export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/simpleworth/', '/keepfit/', '/PDFLibrarian/', '/poetry-picture/', ...dailyPoems.map(poem => `/poetry-picture/${poem.date}/`), ...poems.map(poem => `/poems/${poem.slug}/`)].map(path => ({ url: `https://larryhu.com${path}` }));
}
