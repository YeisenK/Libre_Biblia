// Arte sacro de dominio público (Wikimedia Commons). Ver docs/DISENO_V2.md («Arte»).
// El bloque entre los marcadores GENERADO lo escribe `node tools/art/fetch-art.mjs`; no editar a mano.

export interface Art {
  src: string;
  title: string;
  artist: string;
  year?: string;
  sourceUrl: string;
  license: string;
  /** object-position CSS, p. ej. '50% 30%' */
  focus?: string;
}

interface ArtEntry extends Art {
  keys: string[];
}

// <GENERADO>
const ENTRIES: ArtEntry[] = [];
// </GENERADO>

const BY_KEY = new Map<string, Art>();
for (const { keys, ...art } of ENTRIES) for (const k of keys) BY_KEY.set(k, art);

/** Clave de grupo cuando una novena no tiene imagen propia. */
function novenaGroup(id: string): string {
  if (/^(san|santa)-/.test(id)) return 'category:santos';
  if (id.startsWith('virgen-')) return 'category:virgen-maria';
  return 'category:novenas';
}

export function artFor(key: string): Art | null {
  const direct = BY_KEY.get(key);
  if (direct) return direct;
  const mystery = /^mystery:([a-z]+)-\d+$/.exec(key);
  if (mystery) return BY_KEY.get(`set:${mystery[1]}`) ?? null;
  if (key.startsWith('novena:')) {
    return BY_KEY.get(novenaGroup(key.slice('novena:'.length))) ?? BY_KEY.get('home:default') ?? null;
  }
  return null;
}

/** Créditos sin duplicados (una entrada por cuadro), para «Fuentes y licencias». */
export const ART_CREDITS: Art[] = ENTRIES.map(({ keys: _keys, ...art }) => art);
