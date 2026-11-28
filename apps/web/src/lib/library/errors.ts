export type ImportErrorCode = 'empty' | 'too-large' | 'unsupported' | 'drm' | 'corrupt' | 'no-space';

/** Error de importación con mensaje claro para el usuario. */
export class ImportError extends Error {
  constructor(public code: ImportErrorCode, message: string) {
    super(message);
    this.name = 'ImportError';
  }
}
