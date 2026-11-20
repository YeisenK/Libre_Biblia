/** Limpiador de ThML/HTML de módulos SWORD: devuelve solo texto plano normalizado (NFC). */

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, e: string) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : whole;
    }
    return NAMED[e.toLowerCase()] ?? whole;
  });
}

export function cleanThml(raw: string): string {
  let s = raw
    // contenido que no es texto del versículo
    .replace(/<note\b[^>]*>[\s\S]*?<\/note>/gi, '')
    .replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, '')
    // saltos -> espacio
    .replace(/<\s*(?:br|p|div)\b[^>]*\/?>/gi, ' ')
    // resto de etiquetas (scripRef, i, b, span, sync, etc.): se conserva el contenido
    .replace(/<[^>]*>/g, '');
  s = decodeEntities(s);
  // caracteres de control salvo espacios normales
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  return s.replace(/\s+/g, ' ').trim().normalize('NFC');
}
