import { captureLabel } from './capture.mjs';

export function displayVariant(photo, width) {
  return [...photo.variants, photo.original].sort((a, b) => a.width - b.width).find(item => item.width >= width) || photo.original;
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('A photograph could not be loaded'));
    image.src = source;
  });
}

export async function renderPhotoPage(page, width, ratio, traditional) {
  const text = traditional ? '拾光聽雨拾光成冊聽雨成詩把尋常留在光裡等待下一個瞬間' : '拾光听雨拾光成册听雨成诗把寻常留在光里等待下一个瞬间';
  await document.fonts.load('500 24px "Studio Serif"', text + (page.photo?.title || ''));
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width); canvas.height = Math.round(width / ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  const w = canvas.width, h = canvas.height;
  const cover = page.kind === 'cover' || page.kind === 'back';
  ctx.fillStyle = cover ? '#284a3d' : '#f5f2e9'; ctx.fillRect(0, 0, w, h);
  function write(words, y, size, serif = false, color = cover ? '#e7dfc5' : '#4d6053') {
    ctx.fillStyle = color; ctx.textAlign = 'center';
    ctx.font = `${serif ? 500 : 400} ${w * size}px "Studio ${serif ? 'Serif' : 'Wordmark'}"`;
    ctx.fillText(words, w / 2, h * y);
  }
  if (cover) {
    ctx.fillStyle = '#1e3d32'; ctx.fillRect(0, 0, w * .04, h);
    // A quiet, deterministic cloth weave; no generated or borrowed sample photographs.
    ctx.fillStyle = '#ffffff06';
    const step = Math.max(3, w / 180);
    for (let x = 0; x < w; x += step) ctx.fillRect(x, 0, 1, h);
    for (let y = 0; y < h; y += step) ctx.fillRect(0, y, w, 1);
    ctx.strokeStyle = '#d5cba766'; ctx.lineWidth = Math.max(1, w * .001);
    ctx.strokeRect(w * .1, h * .07, w * .8, h * .86);
    write('LIGHT & RAIN', .23, .034);
    write(traditional ? '拾光聽雨' : '拾光听雨', .44, .12, true);
    write(traditional ? '拾光成冊 聽雨成詩' : '拾光成册 听雨成诗', .54, .035, true);
    write(page.kind === 'back' ? 'UNTIL THE NEXT MOMENT.' : 'PHOTOGRAPHS BY LARRY', .83, .025);
  } else if (page.kind === 'photo') {
    const photo = page.photo;
    const scale = Math.min(w * .86 / photo.width, h * .77 / photo.height);
    const dw = photo.width * scale, dh = photo.height * scale;
    const image = await loadImage(displayVariant(photo, dw).src);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    // Contain the whole photograph. Never crop, stretch or split it across a gutter.
    ctx.drawImage(image, (w - dw) / 2, h * .47 - dh / 2, dw, dh);
    const label = captureLabel(photo.capture);
    if (label) {
      const density = window.devicePixelRatio || 1;
      let size = Math.min(8 * density, dh * .25);
      ctx.font = `400 ${size}px "Studio Sans", sans-serif`;
      size *= Math.min(1, dw * .9 / Math.max(1, ctx.measureText(label).width));
      ctx.font = `400 ${size}px "Studio Sans", sans-serif`;
      const padding = Math.min(6 * density, dw * .025, dh * .1);
      const right = (w + dw) / 2 - padding;
      const bottom = h * .47 + dh / 2 - padding;
      const textWidth = ctx.measureText(label).width;
      ctx.save();
      ctx.beginPath(); ctx.rect((w - dw) / 2, h * .47 - dh / 2, dw, dh); ctx.clip();
      ctx.fillStyle = '#14291f66';
      ctx.fillRect(right - textWidth - padding, bottom - size - padding, textWidth + padding * 2, size + padding * 2);
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#fffffff0'; ctx.shadowColor = '#102519'; ctx.shadowBlur = size * .25;
      ctx.fillText(label, right, bottom);
      ctx.restore();
    }
    write(photo.title, .93, .027, true);
  } else {
    write('A PERSONAL PHOTOBOOK', .27, .028);
    write(traditional ? '把尋常 留在光裡' : '把寻常 留在光里', .46, .075, true);
    write(page.kind === 'empty' ? (traditional ? '等待下一個瞬間' : '等待下一个瞬间') : 'LARRY STUDIO', .58, .03, true);
    write('LIGHT / LIFE / LITTLE THINGS', .79, .022);
  }
  return canvas;
}

export function bookPages(photos) {
  const pages = [{ kind: 'cover' }, { kind: 'intro' }, ...photos.map(photo => ({ kind: 'photo', photo }))];
  if (pages.length % 2 === 0) pages.push({ kind: 'empty' });
  pages.push({ kind: 'back' });
  return pages;
}
