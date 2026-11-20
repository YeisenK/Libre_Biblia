import Dexie, { type Table } from 'dexie';
import type { Authority, CatalogEntry, PackSource } from '@bc/shared';
import type { UserSettings } from './settings';
import type { ChapterIndex } from './chapters';

export interface InstalledPack {
  id: string;
  kind: 'bible' | 'document';
  version: string;
  title: string;
  description?: string;
  language: string;
  bytes: number;
  sha256: string;
  authority: Authority;
  collection?: string;
  source: PackSource;
  /** Código de versión (solo biblias) */
  code?: string;
  catalogUrl: string | null;
  installedAt: string;
  entry: CatalogEntry;
}
export interface BibleMetaRow {
  packId: string;
  code: string;
  name: string;
  language: string;
  edition: string | null;
  versification: string;
  completeness: 'complete' | 'partial';
  source: PackSource;
  index: ChapterIndex;
}
export interface VerseRow {
  packId: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}
export interface DocumentRow {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  genre: string;
  authority: Authority;
  language: string;
  author?: { name: string; born?: string; died?: string };
  region?: string;
  country?: string;
  period?: string;
  edition?: string;
  collection?: string;
  textFormat?: 'plain' | 'markdown';
  source: PackSource;
  sectionCount: number;
}
export interface SectionRow {
  docId: string;
  path: string;
  order: number;
  depth: number;
  title?: string;
  text: string;
}
export interface SearchIndexRow {
  packId: string;
  version: string;
  json: string;
  builtAt: string;
}
export interface BookmarkRow {
  id: string;
  version: string | null;
  book: string;
  chapter: number;
  verse: number | null;
  label: string | null;
  createdAt: string;
}
export interface HistoryRow {
  id?: number;
  version: string;
  book: string;
  chapter: number;
  readAt: string;
}
export interface PositionRow {
  id: 'main';
  version: string;
  book: string;
  chapter: number;
  verse: number | null;
  updatedAt: string;
}
export interface SettingsRow {
  key: 'main';
  value: UserSettings;
}
export interface RepositoryRow {
  url: string;
  name?: string;
  addedAt: string;
  builtin: boolean;
}

export class AppDb extends Dexie {
  installedPacks!: Table<InstalledPack, string>;
  bibleMeta!: Table<BibleMetaRow, string>;
  bibleVerses!: Table<VerseRow>;
  documents!: Table<DocumentRow, string>;
  documentSections!: Table<SectionRow>;
  searchIndexes!: Table<SearchIndexRow, string>;
  bookmarks!: Table<BookmarkRow, string>;
  history!: Table<HistoryRow, number>;
  readingPosition!: Table<PositionRow, string>;
  settings!: Table<SettingsRow, string>;
  repositories!: Table<RepositoryRow, string>;

  constructor(name = 'bc-local') {
    super(name);
    this.version(1).stores({
      installedPacks: 'id, kind, code',
      bibleMeta: 'packId, code',
      bibleVerses: '[packId+book+chapter+verse], [packId+book+chapter], packId',
      documents: 'id',
      documentSections: '[docId+path], docId, [docId+order]',
      searchIndexes: 'packId',
      bookmarks: 'id, createdAt',
      history: '++id, readAt',
      readingPosition: 'id',
      settings: 'key',
      repositories: 'url',
    });
  }
}

let db: AppDb | null = null;
export const getDb = () => (db ??= new AppDb());
