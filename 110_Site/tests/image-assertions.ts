import { expect, type Locator } from '@playwright/test';

export async function expectDisplay(image: Locator) {
  await expect(image).toHaveAttribute('data-image-stage', 'display');
  await expect(image).toHaveAttribute('src', /\/previews\/.*\.w\d+\./);
  await expect.poll(() => image.evaluate((node: HTMLImageElement) =>
    node.dataset.imageStage === 'display' && node.naturalWidth >= Number(node.dataset.requiredWidth) && node.naturalWidth === Number(node.dataset.displayWidth),
  )).toBe(true);
}
