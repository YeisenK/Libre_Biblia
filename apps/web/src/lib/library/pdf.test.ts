// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makePdf } from './fixtures';
import { detectFormat } from './detect';
import { pdfMetadata } from './pdf';

describe('PDF', () => {
  it('extrae título, autor y número de páginas; reconoce el formato', async () => {
    const bytes = makePdf({ title: 'Imitación de Cristo', author: 'Kempis' });
    expect(detectFormat(bytes, 'x.pdf')).toEqual({ format: 'pdf' });
    expect(await pdfMetadata(bytes, 'x.pdf')).toMatchObject({ title: 'Imitación de Cristo', author: 'Kempis', pages: 2 });
  });
  it('sin metadatos usa el nombre de archivo; PDF dañado se rechaza', async () => {
    expect((await pdfMetadata(makePdf({ title: '' }), 'mi_pdf.pdf')).title).toBe('mi pdf');
    await expect(pdfMetadata(new TextEncoder().encode('%PDF-1.4\nbasura'), 'x.pdf')).rejects.toMatchObject({ code: 'corrupt' });
  });
});
