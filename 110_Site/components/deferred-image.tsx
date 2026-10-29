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
  original?: boolean;
  onReady?: (url: string, stage: string) => void;
  onFailure?: () => void;
};

export function DeferredImage({ src, width, height, rootMargin, eager = false, original = false, sizes = 'auto, 100vw', onReady, onFailure, ...props }: Props) {
  const { ref, near } = useNearViewport<HTMLImageElement>(rootMargin);
  const preview = previewFor(src, manifest, width <= 96);
  const sources: Pick<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes'> = original ? { src: preview } : responsiveFor(src, manifest, sizes);
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
  // Real HTML image sources must work even if hydration or enhancement scripts fail.
  return <><img {...props} ref={ref} src={sources.src} srcSet={sources.srcSet} sizes={sources.sizes} width={width} height={height} data-responsive-managed="true"
    loading={eager ? 'eager' : 'lazy'} decoding="async" data-deferred-src={src}
    data-original-src={src} data-preview-src={preview} /><noscript><img {...props} src={src} width={width} height={height} loading={eager ? 'eager' : 'lazy'} decoding="async" /></noscript></>;
}
