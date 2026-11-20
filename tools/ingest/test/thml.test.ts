import { describe, expect, it } from 'vitest';
import { cleanThml, decodeEntities } from '../src/thml';
import { lzssDecode } from '../src/sword';

describe('cleanThml', () => {
  it('quita etiquetas conservando el contenido', () => {
    expect(cleanThml('uno <i>dos</i> <scripRef passage="X">tres</scripRef>')).toBe('uno dos tres');
  });
  it('elimina <note> con su contenido y convierte <br/> en espacio', () => {
    expect(cleanThml('a<note>nota ficticia</note>b<br/>c')).toBe('ab c');
  });
  it('decodifica entidades', () => {
    expect(decodeEntities('&lt;x&gt; &amp; &#65; &#x42; &nbsp;&desconocida;')).toBe('<x> & A B  &desconocida;');
  });
  it('normaliza NFC y espacios', () => {
    expect(cleanThml(' é  \n x ')).toBe('é x');
  });
});

describe('lzssDecode', () => {
  it('literales y referencia al anillo inicial de espacios', () => {
    // dos literales "ab" y una coincidencia hacia el inicio del texto (pos 4078, 3 bytes): solapa y repite "aba"
    const src = Uint8Array.from([0x03, 0x61, 0x62, 0xee, 0xf0]);
    expect(lzssDecode(src, 5).toString('latin1')).toBe('ababa');
  });
});
