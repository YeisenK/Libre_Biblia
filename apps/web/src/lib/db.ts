import Dexie, { type Table } from 'dexie';
import type { Authority, CatalogEntry, DailyEntry, MysterySet, PackSource, PrayerMoment, PrayersPack, SaintsPack } from '@bc/shared';
import type { UserSettings } from './settings';
import type { ChapterIndex } from './chapters';

export interface InstalledPack {
  id: string;
  kind: 'bible' | 'document' | 'daily' | 'prayers' | 'audio' | 'saints' | 'hours' | 'formation';
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
  translationStatus?: 'final' | 'draft';
  ecclesiasticalApproval?: boolean;
  notice?: string;
  /** Solo paquetes de versículo diario */
  status?: 'draft' | 'reviewed';
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
  translationStatus?: 'final' | 'draft';
  ecclesiasticalApproval?: boolean;
  notice?: string;
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
/** Entrada del ciclo temático instalada: una fila por paquete y día `MM-DD`. */
export interface DailyEntryRow extends DailyEntry {
  packId: string;
}
export interface DailyMetaRow {
  packId: string;
  title: string;
  description?: string;
  language: string;
  status: 'draft' | 'reviewed';
  count: number;
  source: PackSource;
}
/** Versículo del día guardado como favorito (clave: fecha civil `YYYY-MM-DD`). */
export interface DailyFavoriteRow {
  date: string;
  ref: string;
  title: string;
  packId: string | null;
  savedAt: string;
}
/** Días del versículo ya vistos (historial permanente, sin límite). */
export interface DailyHistoryRow {
  date: string;
  ref: string;
  title: string;
  packId: string | null;
  seenAt: string;
}
/** Paquete de oraciones instalado: se guarda entero (es pequeño) y se carga en memoria. */
export interface PrayerPackRow {
  id: string;
  pack: PrayersPack;
}
/** Clip de audio de oración (de un paquete `audio`). */
export interface AudioClipRow {
  packId: string;
  key: string;
  voice: string;
  mime: string;
  seconds: number;
  blob: Blob;
}
export interface AudioPackRow {
  packId: string;
  forPack: string;
  voice: { id: string; label: string; description?: string };
  title: string;
  clips: number;
  source: PackSource;
}

// ── Vida de oración (datos personales, incluidos en la copia de seguridad) ──

/** Elemento de rutina: "prayer:<id>", "novena:<id>", "rosary", "gospel", "verse" */
export type RoutineItemKey = string;
export interface RoutineRow {
  id: string;
  title: string;
  moment: PrayerMoment;
  items: RoutineItemKey[];
  /** Recordatorio local */
  /** `message`: texto propio del aviso; si falta, se usa uno de los mensajes de Lux (rotan cada día). */
  reminder: { enabled: boolean; time: string; days: number[]; message?: string } | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}
/** Elemento marcado como hecho un día concreto. Clave: `${date}|${routineId}|${item}` */
export interface RoutineLogRow {
  key: string;
  date: string; // YYYY-MM-DD local
  routineId: string;
  item: RoutineItemKey;
  doneAt: string;
}
export interface PrayerFavoriteRow {
  /** "prayer:<id>" | "novena:<id>" | "mystery:<set>-<n>" */
  key: string;
  title: string;
  savedAt: string;
}
/** Progreso de una novena (una fila por novena; al reiniciarla se sobrescribe). */
export interface NovenaProgressRow {
  novenaId: string;
  startedAt: string; // ISO
  /** Días completados: número de día → fecha local YYYY-MM-DD */
  done: Record<number, string>;
  intention?: string;
  completedAt: string | null;
  updatedAt: string;
}
/** Rosario en curso o terminado. */
export interface RosarySessionRow {
  id: string;
  set: MysterySet;
  mode: 'digital' | 'physical';
  /** Índice del paso actual en el recorrido generado */
  step: number;
  /** Firma de las opciones con que se generó el recorrido (para no desalinear al reanudar) */
  optionsKey: string;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  intention?: string;
}
/** Oración leída o rezada (para «recientes» y estadísticas). */
export interface PrayerHistoryRow {
  id?: number;
  key: string; // "prayer:<id>", "novena:<id>:<day>", "rosary:<set>"
  title: string;
  at: string;
}

// ── Lux v0.5: biblioteca personal, colecciones y diario (esquema v4, docs/PLAN_LUX.md) ──

/** Libro importado por el usuario (EPUB, PDF, TXT, Markdown…). El archivo va en `bookFiles`. */
export interface ImportedBookRow {
  id: string; // "user:<uuid>"
  format: 'epub' | 'pdf' | 'txt' | 'md' | 'html' | 'fb2' | 'other';
  title: string;
  author?: string;
  language?: string;
  description?: string;
  coverBlob?: Blob;
  bytes: number;
  fileName: string;
  addedAt: string;
  updatedAt: string;
  /** Última posición: CFI (EPUB), página (PDF) o desplazamiento (texto) */
  position?: string;
  progress?: number; // 0..1
}
export interface BookFileRow {
  bookId: string;
  blob: Blob;
}
/** Marcador, subrayado o nota en un libro importado o un documento del catálogo. */
export interface AnnotationRow {
  id: string;
  /** "user:<uuid>" (importado) o id de paquete `doc.*` */
  bookId: string;
  kind: 'bookmark' | 'highlight' | 'note';
  /** Localizador: CFI, "p:<n>", "s:<path>:<offset>" */
  locator: string;
  text?: string;
  note?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}
/** Colección personal genérica (oraciones, obras de arte, libros, santos…). */
export interface UserCollectionRow {
  id: string;
  kind: 'prayers' | 'art' | 'books' | 'saints' | 'mixed';
  title: string;
  /** Claves estables: "prayer:<id>", "novena:<id>", "art:<id>", "book:<id>", "saint:<id>"… */
  items: string[];
  createdAt: string;
  updatedAt: string;
}
/** Entrada del diario espiritual (privada, local). */
export interface DiaryEntryRow {
  id: string;
  date: string; // YYYY-MM-DD local
  kind: 'reflection' | 'purpose' | 'intention' | 'gratitude' | 'quote' | 'reading' | 'retreat' | 'note';
  title?: string;
  text: string;
  /** Referencias opcionales: "bible:<ref>", "saint:<id>", "prayer:<id>"… */
  refs?: string[];
  /** Solo para intenciones de oración: estado opcional, sin puntuación. */
  status?: 'encomendada' | 'atendida';
  createdAt: string;
  updatedAt: string;
}
/** Favorito genérico de contenido de Lux (santos, obras de arte, documentos, piezas musicales…). */
export interface LuxFavoriteRow {
  key: string; // "saint:<id>", "art:<id>", "music:<id>", "doc:<id>", "ccc:<n>"…
  title: string;
  savedAt: string;
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
  dailyEntries!: Table<DailyEntryRow>;
  dailyMeta!: Table<DailyMetaRow, string>;
  dailyFavorites!: Table<DailyFavoriteRow, string>;
  dailyHistory!: Table<DailyHistoryRow, string>;
  prayerPacks!: Table<PrayerPackRow, string>;
  audioPacks!: Table<AudioPackRow, string>;
  audioClips!: Table<AudioClipRow>;
  routines!: Table<RoutineRow, string>;
  routineLog!: Table<RoutineLogRow, string>;
  prayerFavorites!: Table<PrayerFavoriteRow, string>;
  novenaProgress!: Table<NovenaProgressRow, string>;
  rosarySessions!: Table<RosarySessionRow, string>;
  prayerHistory!: Table<PrayerHistoryRow, number>;
  importedBooks!: Table<ImportedBookRow, string>;
  bookFiles!: Table<BookFileRow, string>;
  annotations!: Table<AnnotationRow, string>;
  userCollections!: Table<UserCollectionRow, string>;
  diaryEntries!: Table<DiaryEntryRow, string>;
  luxFavorites!: Table<LuxFavoriteRow, string>;
  saintPacks!: Table<{ id: string; pack: SaintsPack }, string>;

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
    this.version(2).stores({
      dailyEntries: '[packId+date], packId, date',
      dailyMeta: 'packId',
      dailyFavorites: 'date, savedAt',
      dailyHistory: 'date, seenAt',
    });
    this.version(3).stores({
      prayerPacks: 'id',
      audioPacks: 'packId, forPack',
      audioClips: '[packId+key], packId, key',
      routines: 'id, order, moment',
      routineLog: 'key, date, routineId',
      prayerFavorites: 'key, savedAt',
      novenaProgress: 'novenaId, updatedAt',
      rosarySessions: 'id, updatedAt, completedAt',
      prayerHistory: '++id, at, key',
    });
    // v4 (Lux 0.5): biblioteca personal, anotaciones, colecciones, diario y favoritos generales.
    this.version(4).stores({
      importedBooks: 'id, format, addedAt, updatedAt',
      bookFiles: 'bookId',
      annotations: 'id, bookId, [bookId+kind], updatedAt',
      userCollections: 'id, kind, updatedAt',
      diaryEntries: 'id, date, kind, updatedAt',
      luxFavorites: 'key, savedAt',
      saintPacks: 'id',
    });
  }
}

let db: AppDb | null = null;
export const getDb = () => (db ??= new AppDb());
