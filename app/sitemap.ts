import type { MetadataRoute } from 'next';
import poems from '@/content/poems.json';
export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/simpleworth/', '/keepfit/', '/PDFLibrarian/', ...poems.map(poem => `/poems/${poem.slug}/`)].map(path => ({ url: `https://larryhu.com${path}` }));
}
