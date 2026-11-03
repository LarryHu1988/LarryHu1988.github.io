import type { Photo } from './types';

type Page = { kind: string; photo?: Photo };
type Book = { id: string; title: string; titleZh: string; mark: string; ratio: number; pages: Page[] };
type Status = { current: number; total: number };

/** Local boundary for the JS reader; the upstream modifier package ships non-strict TS sources as types. */
export function createPhotoBook(root: HTMLElement, book: Book, onStatus: (status: Status) => void, onError: (error: Error) => void): Promise<() => void>;
