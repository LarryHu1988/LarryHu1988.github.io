export type PhotoVariant = { src: string; width: number; height: number; bytes: number };
export type Photo = {
  id: string;
  title: string;
  width: number;
  height: number;
  original: PhotoVariant;
  variants: PhotoVariant[];
  capture?: { takenAt?: string; offset?: string; make?: string; model?: string; lens?: string; aperture?: number; exposureTime?: number; iso?: number; focalLength?: number };
};
