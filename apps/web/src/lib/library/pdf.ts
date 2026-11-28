import { baseName } from './detect';
import { ImportError } from './errors';
import type { BookMeta } from './metadata';

/** Versión de pdf.js (fijada en package.json). El worker se copia a `public/` (scripts/copy-pdf-worker.mjs). */
export const PDF_WORKER_URL = '/pdf.worker.min.js';

type Pdfjs = typeof import('pdfjs-dist');
let lib: Promise<Pdfjs> | null = null;

/** Carga perezosa de pdf.js (build «legacy», compatible con WebView de Android antiguos). */
export function loadPdfjs(): Promise<Pdfjs> {
  return (lib ??= import('pdfjs-dist/legacy/build/pdf.mjs').then((m) => {
    // En el navegador/Android: worker propio servido desde el mismo origen (export estático). En Node (pruebas) pdf.js usa su worker simulado.
    if (typeof window !== 'undefined' && typeof document !== 'undefined' && !m.GlobalWorkerOptions.workerSrc) m.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
    return m as unknown as Pdfjs;
  }));
}

export async function openPdf(data: Uint8Array | ArrayBuffer) {
  const pdfjs = await loadPdfjs();
  const copy = data instanceof Uint8Array ? data.slice() : new Uint8Array(data.slice(0));
  try {
    return await pdfjs.getDocument({ data: copy, isEvalSupported: false }).promise;
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === 'PasswordException') throw new ImportError('drm', 'El PDF está protegido con contraseña o cifrado y no se puede abrir.');
    throw new ImportError('corrupt', 'El PDF está dañado y no se puede leer.');
  }
}

/** Metadatos del PDF (info/XMP) y primera página como portada (si hay canvas). */
export async function pdfMetadata(data: Uint8Array | ArrayBuffer, fileName: string): Promise<BookMeta & { pages: number }> {
  const doc = await openPdf(data);
  try {
    if (doc.numPages < 1) throw new ImportError('corrupt', 'El PDF no tiene páginas.');
    const md = await doc.getMetadata().catch(() => null);
    const info = (md?.info ?? {}) as Record<string, unknown>;
    const xmp = md?.metadata as { get(k: string): string | undefined } | null | undefined;
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim() : undefined);
    const title = str(info.Title) ?? str(xmp?.get('dc:title')) ?? baseName(fileName);
    const author = str(info.Author) ?? str(xmp?.get('dc:creator'));
    const language = str(info.Language) ?? str(xmp?.get('dc:language'));
    let cover: Blob | undefined;
    if (typeof document !== 'undefined') cover = await renderPdfPage(doc, 1, 320).catch(() => undefined);
    return { title, author, language, cover, pages: doc.numPages };
  } finally {
    void doc.destroy();
  }
}

/** Dibuja una página en un canvas del ancho dado y la devuelve como JPEG. */
export async function renderPdfPage(doc: Awaited<ReturnType<typeof openPdf>>, pageNumber: number, width: number): Promise<Blob | undefined> {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: width / base.width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return new Promise((res) => canvas.toBlob((b) => res(b ?? undefined), 'image/jpeg', 0.8));
}
