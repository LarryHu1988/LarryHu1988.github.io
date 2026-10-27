'use client';

import { useEffect, useEffectEvent, type ImgHTMLAttributes } from 'react';
import { useNearViewport } from './use-near-viewport';
import manifest from '@/content/image-previews.json';
import { loadProgressiveImage, previewFor } from '../public/scripts/progressive-images.js';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height' | 'loading' | 'onLoad' | 'onError'> & {
  src: string;
  alt: string;
  width: number;
  height: number;
  rootMargin?: string;
  eager?: boolean;
  earlyPreview?: boolean;
  onReady?: (url: string, stage: string) => void;
  onFailure?: () => void;
};

export function DeferredImage({ src, width, height, rootMargin, eager = false, earlyPreview = true, onReady, onFailure, ...props }: Props) {
  const { ref, near } = useNearViewport<HTMLImageElement>(rootMargin);
  const preview = previewFor(src, manifest, width <= 96);
  const placeholder = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"/>`)}`;
  const reportReady = useEffectEvent((url: string, stage: string) => onReady?.(url, stage));
  const reportFailure = useEffectEvent(() => onFailure?.());
  const priority = props.fetchPriority;
  useEffect(() => {
    if ((!near && !eager) || !ref.current) return;
    return loadProgressiveImage(ref.current, src, preview, {
      priority, onReady: (url: string, stage: string) => reportReady(url, stage), onError: () => reportFailure(),
    });
  }, [src, preview, near, eager, priority]);
  return <img {...props} ref={ref} src={earlyPreview || near || eager ? preview : placeholder} width={width} height={height}
    loading={eager ? 'eager' : 'lazy'} decoding="async" data-deferred-src={src}
    data-original-src={src} data-preview-src={preview} />;
}
