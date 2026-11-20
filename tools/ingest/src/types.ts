export interface SourceSpec {
  code: string;
  key: string;
  name: string;
  language: string;
  edition: string;
  format: 'usfm' | 'sword-ztext';
  files: string[];
  license: string;
  licenseUrl: string;
  provenanceUrl: string;
  versification: string;
  tsConfig: string;
  completeness: 'complete' | 'partial';
  notes?: string;
}

/** Formato canónico intermedio: { libro OSIS: { capítulo: [[versículo, texto], ...] } } */
export type VerseTuple = [number, string];
export interface CanonicalBible {
  code: string;
  books: Record<string, Record<string, VerseTuple[]>>;
}

export interface DownloadManifest {
  code: string;
  files: { name: string; url: string; sha256: string; bytes: number; retrievedAt: string }[];
}
