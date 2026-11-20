import { describe, expect, it } from 'vitest';
import { escapeHtml, findPhraseRanges, matchesExact, normalize, snippetForPhrase, snippetForTerms } from './text';

describe('texto de búsqueda', () => {
  it('normaliza tildes y mayúsculas', () => {
    expect(normalize('Ángel Ñandú')).toBe('angel nandu');
  });
  it('escapa HTML antes de resaltar (la etiqueta sale como texto)', () => {
    const html = snippetForTerms('a <script>x</script> amor', ['amor']);
    expect(html).toBe('a &lt;script&gt;x&lt;/script&gt; <mark>amor</mark>');
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });
  it('resalta ignorando tildes y conserva el texto original', () => {
    expect(snippetForTerms('El Señor es mi pastor', ['senor'])).toBe('El <mark>Señor</mark> es mi pastor');
  });
  it('frase exacta: orden, tildes y puntuación flexibles; palabras sueltas no bastan', () => {
    expect(matchesExact('Dios es amor, y quien permanece', 'Dios es amor')).toBe(true);
    expect(matchesExact('Dios, es   AMOR', 'dios es amor')).toBe(true);
    expect(matchesExact('amor es Dios', 'Dios es amor')).toBe(false);
    expect(matchesExact('Dios no es el amor', 'Dios es amor')).toBe(false);
    expect(findPhraseRanges('x Dios es amor y Dios es amor', 'dios es amor')).toHaveLength(2);
  });
  it('snippet de frase marca la frase completa y recorta textos largos', () => {
    expect(snippetForPhrase('Dios es amor', 'dios es amor')).toBe('<mark>Dios es amor</mark>');
    const long = 'palabra '.repeat(80) + 'clave final ' + 'otra '.repeat(80);
    const s = snippetForPhrase(long, 'clave final');
    expect(s).toContain('<mark>clave final</mark>');
    expect(s.length).toBeLessThan(400);
    expect(s.startsWith('…')).toBe(true);
  });
});
