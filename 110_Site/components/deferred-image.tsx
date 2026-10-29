'use client';

import { useEffect, useEffectEvent, type ImgHTMLAttributes } from 'react';
import { useNearViewport } from './use-near-viewport';
import manifest from '@/content/image-previews.json';
import { loadDisplayImage, loadProgressiveImage, previewFor, responsiveFor } from '../public/scripts/progressive-images.js';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height' | 'loading' | 'onLoad' | 'onError'> & {
  src: string;
  alt: string;
  width: number;
  height: number;
  rootMargin?: string;
  eager?: boolean;
  earlyPreview?: boolean;
  original?: boolean;
  onReady?: (url: string, stage: string) => void;
  onFailure?: () => void;
};

export function DeferredImage({ src, width, height, rootMargin, eager = false, earlyPreview = false, original = false, sizes = 'auto, 100vw', onReady, onFailure, ...props }: Props) {
  const { ref, near } = useNearViewport<HTMLImageElement>(rootMargin);
  const preview = previewFor(src, manifest, width <= 96);
  const sources: Pick<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes'> = original ? { src: preview } : responsiveFor(src, manifest, sizes);
  const placeholder = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"/>`)}`;
  const reportReady = useEffectEvent((url: string, stage: string) => onReady?.(url, stage));
  const reportFailure = useEffectEvent(() => onFailure?.());
  const priority = props.fetchPriority;
  useEffect(() => {
    if ((!near && !eager) || !ref.current) return;
    const options = {
      priority, onReady: (url: string, stage: string) => reportReady(url, stage), onError: () => reportFailure(),
    };
    return original ? loadProgressiveImage(ref.current, src, preview, options) : loadDisplayImage(ref.current, src, manifest, options);
  }, [src, preview, near, eager, priority, original]);
  const early = earlyPreview || eager;
  return <><img {...props} ref={ref} src={early ? sources.src : placeholder} srcSet={early ? sources.srcSet : undefined} sizes={early ? sources.sizes : undefined} width={width} height={height} data-responsive-managed="true"
    loading={eager ? 'eager' : 'lazy'} decoding="async" data-deferred-src={src}
    data-original-src={src} data-preview-src={preview} /><noscript><img {...props} src={src} width={width} height={height} loading={eager ? 'eager' : 'lazy'} decoding="async" /></noscript></>;
}
