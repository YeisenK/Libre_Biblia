/** Contratos de API compartidos entre apps/api y apps/web. */

export type ContentAuthority =
  | 'scripture'
  | 'magisterium'
  | 'patristic'
  | 'theological-opinion'
  | 'academic-hypothesis'
  | 'personal';

export interface SourceDto {
  id: string;
  name: string;
  license: string;
  licenseUrl: string | null;
  provenanceUrl: string | null;
  retrievedAt: string | null;
  notes: string | null;
}

export interface BibleVersionDto {
  code: string;
  name: string;
  language: string;
  edition: string | null;
  versification: string;
  /** OSIS de los libros disponibles en esta versión */
  books: string[];
  completeness: 'complete' | 'partial';
  source: SourceDto;
}

export interface BookDto {
  osis: string;
  order: number;
  testament: 'OT' | 'NT';
  deuterocanonical: boolean;
  name: string;
  abbr: string;
  chapters: number;
}

export interface VerseDto {
  verse: number;
  text: string;
}

export interface ChapterDto {
  version: string;
  book: string;
  chapter: number;
  verses: VerseDto[];
  prev: { book: string; chapter: number } | null;
  next: { book: string; chapter: number } | null;
}

export interface ParallelChapterDto {
  book: string;
  chapter: number;
  versions: string[];
  /** Filas alineadas por número de versículo */
  rows: { verse: number; texts: Record<string, string | null> }[];
}

export interface SearchHitDto {
  version: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  /** Fragmento con <mark> ya escapado del lado servidor */
  snippet: string;
}

export interface SearchResultDto {
  query: string;
  total: number;
  byBook: { book: string; count: number }[];
  hits: SearchHitDto[];
  page: number;
  pageSize: number;
}

export interface BookmarkDto {
  id: string;
  version: string | null;
  book: string;
  chapter: number;
  verse: number | null;
  label: string | null;
  createdAt: string;
}

export interface ReadingPositionDto {
  version: string;
  book: string;
  chapter: number;
  verse: number | null;
  updatedAt: string;
}

export interface UserDto {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
}

export interface AuthResponseDto {
  accessToken: string;
  user: UserDto;
}
