/** Preparación del texto que se lee: Markdown de las oraciones → texto limpio para md2audio. */

/**
 * Quita el Markdown y deja texto plano para la voz.
 * «V.» / «R.» (versículo y respuesta) no se leen como letras: se eliminan y cada intervención queda en su párrafo,
 * de modo que la pausa entre párrafos hace de turno de palabra.
 */
export function limpiarMarkdown(md: string): string {
  const lineas = md
    .replace(/\r\n?/g, '\n')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map((l) =>
      l
        .replace(/^\s{0,3}#{1,6}\s+/, '') // encabezados
        .replace(/^\s*>\s?/, '') // citas
        .replace(/^\s*[-*+]\s+/, '') // viñetas
        .replace(/^\s*\d+[.)]\s+/, '') // listas numeradas
        .replace(/^\s*(?:\*{1,2}|_{1,2})?[VR]\.(?:\*{1,2}|_{1,2})?\s+/, '') // «V. » «R. »
        .replace(/^\s*[—–]\s*/, '') // las rayas inician diálogo en Juglar
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // enlaces
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        .replace(/`/g, '')
        .replace(/@/g, '')
        .replace(/[ \t]+/g, ' ')
        .trim(),
    );
  // Las líneas sueltas de un mismo párrafo (versos) se unen; las separadas por línea en blanco quedan en párrafos.
  const parrafos: string[] = [];
  let actual: string[] = [];
  for (const l of lineas) {
    if (l === '') {
      if (actual.length) parrafos.push(actual.join(' '));
      actual = [];
    } else actual.push(l);
  }
  if (actual.length) parrafos.push(actual.join(' '));
  return parrafos.join('\n\n').trim();
}

const ORDINAL = ['', 'Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto'];
const ADJETIVO: Record<string, string> = { joyful: 'gozoso', luminous: 'luminoso', sorrowful: 'doloroso', glorious: 'glorioso' };

/** «Primer misterio gozoso: la Encarnación del Hijo de Dios.» */
export function anuncioMisterio(set: string, n: number, title: string): string {
  const t = title.trim().replace(/^(El|La|Los|Las)\s/, (a) => a.toLowerCase());
  return `${ORDINAL[n] ?? `Misterio ${n}`} misterio ${ADJETIVO[set] ?? set}: ${t}.`;
}

/** Texto de un pasaje a partir de los versículos de la Biblia (sin números ni notas). */
export function textoVersiculos(versos: string[]): string {
  return versos.map((v) => v.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ');
}
