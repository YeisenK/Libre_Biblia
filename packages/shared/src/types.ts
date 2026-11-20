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

export type SearchMode = 'words' | 'exact' | 'fuzzy';

export interface SearchResultDto {
  query: string;
  mode: SearchMode;
  /** Si la consulta es una referencia ("Jn 3,16"), se devuelve resuelta y hits vacío */
  reference: import('./reference').BibleRef | null;
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
  /** Solo para clientes nativos (cabecera `X-Client: native`); la web usa cookie httpOnly */
  refreshToken?: string;
}

export interface UserSettingsDto {
  theme: 'light' | 'dark' | 'sepia' | 'system';
  fontScale: number;
  lineHeight: number;
  margin: 'narrow' | 'normal' | 'wide';
  readingMode: 'chapter' | 'verse' | 'continuous';
  defaultVersion: string | null;
  parallelVersions: string[];
}

export interface PassageDto {
  version: string;
  reference: import('./reference').BibleRef;
  display: string;
  verses: { chapter: number; verse: number; text: string }[];
}

/**
 * Exportación completa de una versión para lectura sin conexión.
 * chapters[osis][capítulo] = [[versículo, texto], ...]
 */
export interface OfflineBibleDto {
  version: BibleVersionDto;
  generatedAt: string;
  chapters: Record<string, Record<string, [number, string][]>>;
}
