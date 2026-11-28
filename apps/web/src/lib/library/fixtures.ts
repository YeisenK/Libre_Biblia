// Fixtures mínimos para pruebas (Vitest y Playwright): se generan en el momento, sin binarios en el repositorio.
import JSZip from 'jszip';

const PNG_1X1 = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));

export interface EpubOptions {
  title?: string;
  author?: string;
  language?: string;
  withCover?: boolean;
  /** Añade META-INF/encryption.xml con un cifrado que no es de tipografías (DRM) */
  drm?: boolean;
  chapters?: { title: string; body: string }[];
}

export async function makeEpub(o: EpubOptions = {}): Promise<Uint8Array> {
  const chapters = o.chapters ?? [
    { title: 'Capítulo uno', body: 'En el principio era el Verbo, y el Verbo estaba junto a Dios. Alabado sea el Señor.' },
    { title: 'Capítulo dos', body: 'Bienaventurados los pobres de espíritu, porque de ellos es el reino de los cielos.' },
  ];
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  if (o.drm) zip.file('META-INF/encryption.xml', '<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:enc="http://www.w3.org/2001/04/xmlenc#"><enc:EncryptedData><enc:EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes128-cbc"/><enc:CipherData><enc:CipherReference URI="OEBPS/ch1.xhtml"/></enc:CipherData></enc:EncryptedData></encryption>');
  const manifest = chapters.map((_, i) => `<item id="c${i}" href="ch${i + 1}.xhtml" media-type="application/xhtml+xml"/>`).join('');
  const spine = chapters.map((_, i) => `<itemref idref="c${i}"/>`).join('');
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf"><dc:identifier id="id">urn:uuid:1234</dc:identifier><dc:title>${o.title ?? 'Libro de prueba'}</dc:title>${o.author === '' ? '' : `<dc:creator>${o.author ?? 'Autora Ejemplar'}</dc:creator>`}<dc:language>${o.language ?? 'es'}</dc:language>${o.withCover ? '<meta name="cover" content="cover-img"/>' : ''}</metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>${o.withCover ? '<item id="cover-img" href="cover.png" media-type="image/png" properties="cover-image"/>' : ''}${manifest}</manifest><spine toc="ncx">${spine}</spine></package>`,
  );
  if (o.withCover) zip.file('OEBPS/cover.png', PNG_1X1);
  zip.file('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Índice</title></head><body><nav epub:type="toc"><ol>${chapters.map((c, i) => `<li><a href="ch${i + 1}.xhtml">${c.title}</a></li>`).join('')}</ol></nav></body></html>`);
  zip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="utf-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head/><docTitle><text>x</text></docTitle><navMap>${chapters.map((c, i) => `<navPoint id="n${i}" playOrder="${i + 1}"><navLabel><text>${c.title}</text></navLabel><content src="ch${i + 1}.xhtml"/></navPoint>`).join('')}</navMap></ncx>`);
  chapters.forEach((c, i) => zip.file(`OEBPS/ch${i + 1}.xhtml`, `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${c.title}</title></head><body><h1>${c.title}</h1><p>${c.body}</p></body></html>`));
  return zip.generateAsync({ type: 'uint8array' });
}

export interface PdfOptions {
  title?: string;
  author?: string;
  pages?: string[];
  /** Cifrado «de mentira»: añade /Encrypt al trailer */
  encrypted?: boolean;
}

/** PDF mínimo válido (Helvetica, una línea por página) con índice de marcadores y xref correcto. */
export function makePdf(o: PdfOptions = {}): Uint8Array {
  const pages = o.pages ?? ['Primera pagina del libro de prueba', 'Segunda pagina con la palabra gloria'];
  const n = pages.length;
  const objs: string[] = [];
  // 1 catálogo, 2 páginas, 3 fuente, 4 info, 5 outlines, 6 item de índice, luego (página, contenido) por página
  const pageObj = (i: number) => 7 + i * 2;
  objs[1] = '<< /Type /Catalog /Pages 2 0 R /Outlines 5 0 R >>';
  objs[2] = `<< /Type /Pages /Count ${n} /Kids [${pages.map((_, i) => `${pageObj(i)} 0 R`).join(' ')}] >>`;
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objs[4] = `<< /Title (${o.title ?? 'PDF de prueba'}) /Author (${o.author ?? 'Autor Ejemplar'}) >>`;
  objs[5] = '<< /Type /Outlines /First 6 0 R /Last 6 0 R /Count 1 >>';
  objs[6] = `<< /Title (Segunda parte) /Parent 5 0 R /Dest [${pageObj(Math.min(1, n - 1))} 0 R /Fit] >>`;
  pages.forEach((t, i) => {
    const stream = `BT /F1 24 Tf 72 700 Td (${t}) Tj ET`;
    objs[pageObj(i)] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageObj(i) + 1} 0 R >>`;
    objs[pageObj(i) + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = out.length;
    out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R /Info 4 0 R${o.encrypted ? ' /Encrypt << /Filter /Standard /V 1 /R 2 /O (aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa) /U (bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb) /P -4 >> /ID [(abcdefghijklmnop) (abcdefghijklmnop)]' : ''} >>\nstartxref\n${xref}\n%%EOF\n`;
  // PDFDocEncoding ≈ Latin-1: un byte por carácter (los desplazamientos del xref cuentan bytes).
  return Uint8Array.from(out, (c) => c.charCodeAt(0) & 255);
}

export const SAMPLE_MD = '# Meditaciones breves\n\nPrimer párrafo del texto con **negrita** y *cursiva*.\n\n## Segunda parte\n\nOtro párrafo sobre la gloria de Dios.\n\n- uno\n- dos\n';
export const SAMPLE_TXT = 'Camino de perfección\n\nEscrito para las hermanas.\n\nCAPÍTULO I\n\nEn el principio de la oración.\n\nCAPÍTULO II\n\nSobre la humildad y la gloria.\n';
export const SAMPLE_HTML = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Página de prueba</title><meta name="author" content="Ana Autora"><script>alert(1)</script></head><body><h1>Título</h1><p>Texto con <b>negrita</b>.</p></body></html>';
export const SAMPLE_FB2 = '<?xml version="1.0" encoding="utf-8"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0"><description><title-info><genre>religion</genre><author><first-name>Luis</first-name><last-name>de León</last-name></author><book-title>Los nombres de Cristo</book-title><lang>es</lang></title-info></description><body><section><title><p>Libro primero</p></title><p>Texto del libro.</p></section></body></FictionBook>';
