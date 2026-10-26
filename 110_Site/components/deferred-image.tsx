'use client';

import type { ImgHTMLAttributes } from 'react';
import { useNearViewport } from './use-near-viewport';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height' | 'loading'> & {
  src: string;
  alt: string;
  width: number;
  height: number;
  rootMargin?: string;
};

export function DeferredImage({ src, width, height, rootMargin, ...props }: Props) {
  const { ref, near } = useNearViewport<HTMLImageElement>(rootMargin);
  // Reserve the original aspect ratio without downloading any offscreen pixels.
  const placeholder = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"/>`)}`;
  return <img {...props} ref={ref} src={near ? src : placeholder} width={width} height={height}
    loading={near ? 'eager' : 'lazy'} decoding="async" data-deferred-src={src} />;
}
