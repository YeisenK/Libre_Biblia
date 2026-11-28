// Genera sources/formation/ccc-structure.json a partir del índice oficial de vatican.va/archive/catechism_sp
// (estructura, títulos y rangos de números; NO se guarda el texto) y de los números de las páginas (para validar rangos
// y extraer las referencias bíblicas más citadas en cada tramo). Uso: node src/formation/ccc-bootstrap.mjs
// Las páginas se cachean en raw/ccc-sp (fuera del repositorio).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.join(here, '..', '..');
const RAW = path.join(pkg, 'raw', 'ccc-sp');
const BASE = 'https://www.vatican.va/archive/catechism_sp/';
fs.mkdirSync(RAW, { recursive: true });

// [nivel, rótulo, título, desde, hasta, archivo]. Nivel: P parte, S sección, C capítulo, A artículo, Q párrafo.
const T = [
  ['P', 'Prólogo', 'Prólogo', 1, 25, 'prologue_sp.html'],
  ['P', 'Primera parte', 'La profesión de la fe', 0, 0, ''],
  ['S', 'Primera sección', '«Creo» - «Creemos»', 26, 26, 'p1s1c1_sp.html'],
  ['C', 'Capítulo primero', 'El hombre es «capaz» de Dios', 27, 49, 'p1s1c1_sp.html'],
  ['C', 'Capítulo segundo', 'Dios al encuentro del hombre', 50, 50, 'p1s1c2a1_sp.html'],
  ['A', 'Artículo 1', 'La Revelación de Dios', 51, 73, 'p1s1c2a1_sp.html'],
  ['A', 'Artículo 2', 'La transmisión de la Revelación divina', 74, 100, 'p1s1c2a2_sp.html'],
  ['A', 'Artículo 3', 'La Sagrada Escritura', 101, 141, 'p1s1c2a3_sp.html'],
  ['C', 'Capítulo tercero', 'La respuesta del hombre a Dios', 142, 143, 'p1s1c3a1_sp.html'],
  ['A', 'Artículo 1', 'Creo', 144, 165, 'p1s1c3a1_sp.html'],
  ['A', 'Artículo 2', 'Creemos', 166, 184, 'p1s1c3a2_sp.html'],
  ['S', 'Segunda sección', 'La profesión de la fe cristiana (los Símbolos de la fe)', 185, 197, 'p1s2_sp.html'],
  ['C', 'Capítulo primero', 'Creo en Dios Padre', 198, 198, 'p1s2c1p1_sp.html'],
  ['A', 'Artículo 1', '«Creo en Dios, Padre todopoderoso, creador del cielo y de la tierra»', 0, 0, ''],
  ['Q', 'Párrafo 1', 'Creo en Dios', 199, 231, 'p1s2c1p1_sp.html'],
  ['Q', 'Párrafo 2', 'El Padre', 232, 267, 'p1s2c1p2_sp.html'],
  ['Q', 'Párrafo 3', 'El Todopoderoso', 268, 278, 'p1s2c1p3_sp.html'],
  ['Q', 'Párrafo 4', 'El Creador', 279, 324, 'p1s2c1p4_sp.html'],
  ['Q', 'Párrafo 5', 'El cielo y la tierra', 325, 354, 'p1s2c1p5_sp.html'],
  ['Q', 'Párrafo 6', 'El hombre', 355, 384, 'p1s2c1p6_sp.html'],
  ['Q', 'Párrafo 7', 'La caída', 385, 421, 'p1s2c1p7_sp.html'],
  ['C', 'Capítulo segundo', 'Creo en Jesucristo, Hijo único de Dios', 422, 429, 'p1s2c2_sp.html'],
  ['A', 'Artículo 2', '«Y en Jesucristo, su único Hijo, Nuestro Señor»', 430, 455, 'p1s2c2a2_sp.html'],
  ['A', 'Artículo 3', '«Jesucristo fue concebido por obra y gracia del Espíritu Santo y nació de Santa María Virgen»', 0, 0, ''],
  ['Q', 'Párrafo 1', 'El Hijo de Dios se hizo hombre', 456, 483, 'p1s2a3p1_sp.html'],
  ['Q', 'Párrafo 2', '«…Concebido por obra y gracia del Espíritu Santo, nació de Santa María Virgen»', 484, 511, 'p1s2a3p2_sp.html'],
  ['Q', 'Párrafo 3', 'Los misterios de la vida de Cristo', 512, 570, 'p122a3p3_sp.html'],
  ['A', 'Artículo 4', '«Jesucristo padeció bajo Poncio Pilato, fue crucificado, muerto y sepultado»', 0, 0, ''],
  ['Q', 'Párrafo 1', 'Jesús e Israel', 571, 594, 'p122a4p1_sp.html'],
  ['Q', 'Párrafo 2', 'Jesús murió crucificado', 595, 623, 'p122a4p2_sp.html'],
  ['Q', 'Párrafo 3', 'Jesucristo fue sepultado', 624, 630, 'p122a4p3_sp.html'],
  ['A', 'Artículo 5', '«Jesucristo descendió a los infiernos, al tercer día resucitó de entre los muertos»', 0, 0, ''],
  ['Q', 'Párrafo 1', 'Cristo descendió a los infiernos', 631, 637, 'p122a5p1_sp.html'],
  ['Q', 'Párrafo 2', 'Al tercer día resucitó de entre los muertos', 638, 658, 'p122a5p2_sp.html'],
  ['A', 'Artículo 6', '«Jesucristo subió a los cielos, y está sentado a la derecha de Dios, Padre Todopoderoso»', 659, 667, 'p1s2c2a6_sp.html'],
  ['A', 'Artículo 7', '«Desde allí ha de venir a juzgar a vivos y a muertos»', 668, 682, 'p1s2c2a7_sp.html'],
  ['C', 'Capítulo tercero', 'Creo en el Espíritu Santo', 683, 686, 'p1s2c3_sp.html'],
  ['A', 'Artículo 8', '«Creo en el Espíritu Santo»', 687, 747, 'p1s2c3a8_sp.html'],
  ['A', 'Artículo 9', '«Creo en la Santa Iglesia Católica»', 748, 750, 'p1s2c3a9_sp.html'],
  ['Q', 'Párrafo 1', 'La Iglesia en el designio de Dios', 751, 780, 'p123a9p1_sp.html'],
  ['Q', 'Párrafo 2', 'La Iglesia, Pueblo de Dios, Cuerpo de Cristo, Templo del Espíritu Santo', 781, 810, 'p123a9p2_sp.html'],
  ['Q', 'Párrafo 3', 'La Iglesia es una, santa, católica y apostólica', 811, 870, 'p123a9p3_sp.html'],
  ['Q', 'Párrafo 4', 'Los fieles de Cristo: jerarquía, laicos, vida consagrada', 871, 945, 'p123a9p4_sp.html'],
  ['Q', 'Párrafo 5', 'La comunión de los santos', 946, 962, 'p123a9p5_sp.html'],
  ['Q', 'Párrafo 6', 'María, Madre de Cristo, Madre de la Iglesia', 963, 975, 'p123a9p6_sp.html'],
  ['A', 'Artículo 10', '«Creo en el perdón de los pecados»', 976, 987, 'p123a10_sp.html'],
  ['A', 'Artículo 11', '«Creo en la resurrección de la carne»', 988, 1019, 'p123a11_sp.html'],
  ['A', 'Artículo 12', '«Creo en la vida eterna»', 1020, 1065, 'p123a12_sp.html'],
  ['P', 'Segunda parte', 'La celebración del misterio cristiano', 1066, 1075, 'p2_sp.html'],
  ['S', 'Primera sección', 'La economía sacramental', 1076, 1076, 'p2s1_sp.html'],
  ['C', 'Capítulo primero', 'El misterio pascual en el tiempo de la Iglesia', 0, 0, ''],
  ['A', 'Artículo 1', 'La liturgia, obra de la Santísima Trinidad', 1077, 1112, 'p2s1c1a1_sp.html'],
  ['A', 'Artículo 2', 'El misterio pascual en los sacramentos de la Iglesia', 1113, 1134, 'p2s1c1a2_sp.html'],
  ['C', 'Capítulo segundo', 'La celebración sacramental del misterio pascual', 1135, 1135, 'p2s1c2_sp.html'],
  ['A', 'Artículo 1', 'Celebrar la Liturgia de la Iglesia', 1136, 1199, 'p2s1c2a1_sp.html'],
  ['A', 'Artículo 2', 'Diversidad litúrgica y unidad del misterio', 1200, 1209, 'p2s1c2a2_sp.html'],
  ['S', 'Segunda sección', '«Los siete sacramentos de la Iglesia»', 1210, 1211, 'p2s2_sp.html'],
  ['C', 'Capítulo primero', 'Los sacramentos de la iniciación cristiana', 1212, 1212, 'p2s2c1_sp.html'],
  ['A', 'Artículo 1', 'El sacramento del Bautismo', 1213, 1284, 'p2s2c1a1_sp.html'],
  ['A', 'Artículo 2', 'El sacramento de la Confirmación', 1285, 1321, 'p2s2c1a2_sp.html'],
  ['A', 'Artículo 3', 'El sacramento de la Eucaristía', 1322, 1419, 'p2s2c1a3_sp.html'],
  ['C', 'Capítulo segundo', 'Los sacramentos de curación', 1420, 1421, 'p2s2c2_sp.html'],
  ['A', 'Artículo 4', 'El sacramento de la Penitencia y de la Reconciliación', 1422, 1498, 'p2s2c2a4_sp.html'],
  ['A', 'Artículo 5', 'La Unción de los enfermos', 1499, 1532, 'p2s2c2a5_sp.html'],
  ['C', 'Capítulo tercero', 'Los sacramentos al servicio de la comunidad', 1533, 1535, 'p2s2c3_sp.html'],
  ['A', 'Artículo 6', 'El sacramento del Orden', 1536, 1600, 'p2s2c3a6_sp.html'],
  ['A', 'Artículo 7', 'El sacramento del Matrimonio', 1601, 1666, 'p2s2c3a7_sp.html'],
  ['C', 'Capítulo cuarto', 'Otras celebraciones litúrgicas', 0, 0, ''],
  ['A', 'Artículo 1', 'Los sacramentales', 1667, 1679, 'p2s2c4a1_sp.html'],
  ['A', 'Artículo 2', 'Las exequias cristianas', 1680, 1690, 'p2s2c4a2_sp.html'],
  ['P', 'Tercera parte', 'La vida en Cristo', 1691, 1698, 'p3_sp.html'],
  ['S', 'Primera sección', 'La vocación del hombre: la vida en el Espíritu', 1699, 1699, 'p3s1_sp.html'],
  ['C', 'Capítulo primero', 'La dignidad de la persona humana', 1700, 1700, 'p3s1c1_sp.html'],
  ['A', 'Artículo 1', 'El hombre, imagen de Dios', 1701, 1715, 'p3s1c1a1_sp.html'],
  ['A', 'Artículo 2', 'Nuestra vocación a la bienaventuranza', 1716, 1729, 'p3s1c1a2_sp.html'],
  ['A', 'Artículo 3', 'La libertad del hombre', 1730, 1748, 'p3s1c1a3_sp.html'],
  ['A', 'Artículo 4', 'La moralidad de los actos humanos', 1749, 1761, 'p3s1c1a4_sp.html'],
  ['A', 'Artículo 5', 'La moralidad de las pasiones', 1762, 1775, 'p3s1c1a5_sp.html'],
  ['A', 'Artículo 6', 'La conciencia moral', 1776, 1802, 'p3s1c1a6_sp.html'],
  ['A', 'Artículo 7', 'Las virtudes', 1803, 1845, 'p3s1c1a7_sp.html'],
  ['A', 'Artículo 8', 'El pecado', 1846, 1876, 'p3s1c1a8_sp.html'],
  ['C', 'Capítulo segundo', 'La comunidad humana', 1877, 1877, 'p3s1c2_sp.html'],
  ['A', 'Artículo 1', 'La persona y la sociedad', 1878, 1896, 'p3s1c2a1_sp.html'],
  ['A', 'Artículo 2', 'La participación en la vida social', 1897, 1927, 'p3s1c2a2_sp.html'],
  ['A', 'Artículo 3', 'La justicia social', 1928, 1948, 'p3s1c2a3_sp.html'],
  ['C', 'Capítulo tercero', 'La salvación de Dios: la ley y la gracia', 1949, 1949, 'p3s1c3_sp.html'],
  ['A', 'Artículo 1', 'La ley moral', 1950, 1986, 'p3s1c3a1_sp.html'],
  ['A', 'Artículo 2', 'Gracia y justificación', 1987, 2029, 'p3s1c3a2_sp.html'],
  ['A', 'Artículo 3', 'La Iglesia, madre y maestra', 2030, 2051, 'p3s1c3a3_sp.html'],
  ['S', 'Segunda sección', 'Los diez mandamientos', 2052, 2082, 'p3s2_sp.html'],
  ['C', 'Capítulo primero', '«Amarás al Señor tu Dios con todo tu corazón, con toda tu alma y con todas tus fuerzas»', 2083, 2083, 'p3s2c1_sp.html'],
  ['A', 'Artículo 1', 'El primer mandamiento', 2084, 2141, 'p3s2c1a1_sp.html'],
  ['A', 'Artículo 2', 'El segundo mandamiento', 2142, 2167, 'p3s2c1a2_sp.html'],
  ['A', 'Artículo 3', 'El tercer mandamiento', 2168, 2195, 'p3s2c1a3_sp.html'],
  ['C', 'Capítulo segundo', '«Amarás a tu prójimo como a ti mismo»', 2196, 2196, 'p3s2c2_sp.html'],
  ['A', 'Artículo 4', 'El cuarto mandamiento', 2197, 2257, 'p3s2c2a4_sp.html'],
  ['A', 'Artículo 5', 'El quinto mandamiento', 2258, 2330, 'p3s2c2a5_sp.html'],
  ['A', 'Artículo 6', 'El sexto mandamiento', 2331, 2400, 'p3s2c2a6_sp.html'],
  ['A', 'Artículo 7', 'El séptimo mandamiento', 2401, 2463, 'p3s2c2a7_sp.html'],
  ['A', 'Artículo 8', 'El octavo mandamiento', 2464, 2513, 'p3s2c2a8_sp.html'],
  ['A', 'Artículo 9', 'El noveno mandamiento', 2514, 2533, 'p3s2c2a9_sp.html'],
  ['A', 'Artículo 10', 'El décimo mandamiento', 2534, 2557, 'p3s2c2a0_sp.html'],
  ['P', 'Cuarta parte', 'La oración cristiana', 2558, 2565, 'p4s1_sp.html'],
  ['S', 'Primera sección', 'La oración en la vida cristiana', 0, 0, ''],
  ['C', 'Capítulo primero', 'La revelación de la oración', 2566, 2567, 'p4s1c1_sp.html'],
  ['A', 'Artículo 1', 'En el Antiguo Testamento', 2568, 2597, 'p4s1c1a1_sp.html'],
  ['A', 'Artículo 2', 'En la plenitud de los tiempos', 2598, 2622, 'p4s1c1a2_sp.html'],
  ['A', 'Artículo 3', 'En el tiempo de la Iglesia', 2623, 2649, 'p4s1c1a3_sp.html'],
  ['C', 'Capítulo segundo', 'La tradición de la oración', 2650, 2651, 'p4s1c2_sp.html'],
  ['A', 'Artículo 1', 'Fuentes de la oración', 2652, 2662, 'p4s1c2a1_sp.html'],
  ['A', 'Artículo 2', 'El camino de la oración', 2663, 2682, 'p4s1c2a2_sp.html'],
  ['A', 'Artículo 3', 'Maestros de oración', 2683, 2696, 'p4s1c2a3_sp.html'],
  ['C', 'Capítulo tercero', 'La vida de oración', 2697, 2699, 'p4s1c3_sp.html'],
  ['A', 'Artículo 1', 'Expresiones de la oración', 2700, 2724, 'p4s1c3a1_sp.html'],
  ['A', 'Artículo 2', 'El combate de la oración', 2725, 2758, 'p4s1c3a2_sp.html'],
  ['S', 'Segunda sección', 'La oración del Señor: «Padre nuestro»', 2759, 2760, 'p4s2_sp.html'],
  ['A', 'Artículo 1', '«Resumen de todo el Evangelio»', 2761, 2776, 'p4s2a1_sp.html'],
  ['A', 'Artículo 2', '«Padre nuestro que estás en el cielo»', 2777, 2802, 'p4s2a2_sp.html'],
  ['A', 'Artículo 3', 'Las siete peticiones', 2803, 2865, 'p4s2a3_sp.html'],
];

const LV = { P: 0, S: 1, C: 2, A: 3, Q: 4 };
const ent = { nbsp: ' ', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', ntilde: 'ñ', Ntilde: 'Ñ', laquo: '«', raquo: '»', quot: '"', amp: '&', iquest: '¿', iexcl: '¡', uuml: 'ü' };
const dec = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&(\w+);/g, (m, n) => ent[n] ?? m);

async function page(file) {
  const p = path.join(RAW, file);
  if (!fs.existsSync(p) || fs.statSync(p).size < 3000) {
    const r = await fetch(BASE + file);
    if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
    fs.writeFileSync(p, Buffer.from(await r.arrayBuffer()));
  }
  return fs.readFileSync(p, 'latin1');
}

const BOOKS = /^(Gn|Ex|Lv|Nm|Dt|Jos|Jc|Rt|1 S|2 S|1 R|2 R|1 Cro|2 Cro|Esd|Neh|Tb|Jdt|Est|1 M|2 M|Jb|Sal|Pr|Qo|Ct|Sb|Si|Is|Jr|Lm|Ba|Ez|Dn|Os|Jl|Am|Ab|Jon|Mi|Na|Ha|So|Sof|Ag|Za|Ml|Mt|Mc|Lc|Jn|Hch|Rm|1 Co|2 Co|Ga|Ef|Flp|Col|1 Ts|2 Ts|1 Tm|2 Tm|Tt|Flm|Hb|St|1 P|2 P|1 Jn|2 Jn|3 Jn|Jds|Ap)$/;

/** Referencias bíblicas «Libro cap, v» del texto, en orden de aparición, por número de párrafo. */
function refsByParagraph(html) {
  const parts = html.split(/<b>\s*(\d{1,4})\s*<\/b>/);
  const out = new Map();
  for (let i = 1; i < parts.length; i += 2) {
    const n = +parts[i];
    const txt = dec(parts[i + 1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
    const refs = [];
    for (const m of txt.matchAll(/(?<![\p{L}\d])((?:[123] )?[A-ZÁÉÍÓÚ][a-záéíóú]{1,3})\s?(\d{1,3})\s?,\s?(\d{1,3})(?:\s?-\s?\d{1,3})?/gu)) {
      if (BOOKS.test(m[1])) refs.push(`${m[1]} ${m[2]},${m[3]}`);
    }
    out.set(n, refs);
  }
  return out;
}

const nodes = [];
const stack = [];
let n0 = 0;
const cache = new Map();
for (const [lv, label, title, from, to, file] of T) {
  const level = LV[lv];
  while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
  const parent = stack[stack.length - 1]?.node;
  const ord = { primera: 1, primero: 1, segunda: 2, segundo: 2, tercera: 3, tercero: 3, cuarta: 4, cuarto: 4 };
  const w = label.toLowerCase().split(' ');
  const k = label === 'Prólogo' ? 'prologo' : /\d+$/.test(label) ? label.match(/\d+$/)[0] : String(w.map((x) => ord[x]).find(Boolean));
  const id = k === 'prologo' ? 'prologo' : `${parent ? parent.id + '-' : ''}${lv.toLowerCase()}${k}`;
  const node = { id, level: lv, label, title, ...(from ? { from, to, file } : {}), children: [] };
  if (parent) parent.children.push(node); else nodes.push(node);
  node._l = level;
  stack.push({ id, level, node });
  if (file) {
    if (!cache.has(file)) cache.set(file, await page(file));
    const html = cache.get(file);
    const perPar = refsByParagraph(html);
    const nums = [...perPar.keys()].filter((x) => x >= 1 && x <= 2865);
    if (!nums.some((x) => x >= from && x <= to) && from === to) { /* un solo párrafo: no verificable por <b> */ }
    else if (!nums.includes(from) && !(from === to)) console.warn(`aviso: ${file}: el párrafo ${from} no aparece como <b>n</b>`);
    if (from !== to && !nums.includes(to)) console.warn(`aviso: ${file}: el párrafo ${to} no aparece como <b>n</b>`);
    const freq = new Map();
    let order = 0;
    for (const [n, refs] of perPar) if (n >= from && n <= to) for (const r of refs) { const f = freq.get(r) ?? { c: 0, o: order++ }; f.c++; freq.set(r, f); }
    node.bible = [...freq.entries()].sort((a, b) => b[1].c - a[1].c || a[1].o - b[1].o).slice(0, 3).map(([r]) => r);
  }
}

// Contigüidad 1..2865
const flat = [];
const walk = (ns) => ns.forEach((n) => { if (n.from) flat.push(n); walk(n.children); });
walk(nodes);
flat.sort((a, b) => a.from - b.from);
let prev = 0;
for (const n of flat) { if (n.from !== prev + 1) throw new Error(`Hueco o solape antes de ${n.id}: ${prev + 1} → ${n.from}`); prev = n.to; }
if (prev !== 2865) throw new Error(`Termina en ${prev}`);
const strip = (n) => { delete n._l; n.children.forEach(strip); if (!n.children.length) delete n.children; };
nodes.forEach(strip);
const dest = path.join(pkg, 'sources', 'formation', 'ccc-structure.json');
fs.writeFileSync(dest, JSON.stringify({ source: BASE + 'index_sp.html', retrievedAt: '2026-11-26', nodes }, null, 1) + '\n');
console.log('OK', flat.length, 'tramos →', dest);
