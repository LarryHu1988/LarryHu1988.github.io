export type PhotoVariant = { src: string; width: number; height: number; bytes: number };
export type Photo = {
  id: string;
  title: string;
  width: number;
  height: number;
  original: PhotoVariant;
  variants: PhotoVariant[];
};
