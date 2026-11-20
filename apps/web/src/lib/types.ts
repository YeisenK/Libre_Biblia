import type { PackSource } from '@bc/shared';

export interface Verse {
  verse: number;
  text: string;
}

/** Versión bíblica = paquete `bible` instalado. */
export interface BibleVersion {
  packId: string;
  code: string;
  name: string;
  language: string;
  edition: string | null;
  versification: string;
  completeness: 'complete' | 'partial';
  source: PackSource;
  /** OSIS de los libros presentes */
  books: string[];
}

export interface BookInfo {
  osis: string;
  order: number;
  testament: 'OT' | 'NT';
  deuterocanonical: boolean;
  name: string;
  abbr: string;
  chapters: number;
}

export interface ChapterRef {
  book: string;
  chapter: number;
}

export interface ChapterData {
  version: string;
  book: string;
  chapter: number;
  verses: Verse[];
  prev: ChapterRef | null;
  next: ChapterRef | null;
}

export interface ParallelData {
  book: string;
  chapter: number;
  versions: string[];
  rows: { verse: number; texts: Record<string, string | null> }[];
}
