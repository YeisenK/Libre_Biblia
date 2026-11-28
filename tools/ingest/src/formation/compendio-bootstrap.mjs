// Genera sources/formation/compendio.json: estructura del Compendio del CEC (598 preguntas) y, por cada pregunta,
// los números del Catecismo a los que remite (referencias cruzadas, no el texto de la pregunta ni de la respuesta).
// Fuente: https://www.vatican.va/archive/compendium_ccc/documents/archive_2005_compendium-ccc_sp.html (caché en raw/).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL_C = 'https://www.vatican.va/archive/compendium_ccc/documents/archive_2005_compendium-ccc_sp.html';
const cache = path.join(pkg, 'raw', 'compendio-sp.html');
if (!fs.existsSync(cache) || fs.statSync(cache).size < 100000) fs.writeFileSync(cache, Buffer.from(await (await fetch(URL_C)).arrayBuffer()));
const h = fs.readFileSync(cache, 'latin1');
const body = h.slice(h.indexOf('name="INTRODUCCI'));

// [nivel, rótulo, título, pregunta inicial]. Niveles: P parte, S sección, C capítulo, T tema.
const T = [
  ['P', 'Primera parte', 'La profesión de la fe', 1],
  ['S', 'Primera sección', '«Creo» - «Creemos»', 1],
  ['C', 'Capítulo primero', 'El hombre es «capaz» de Dios', 3],
  ['C', 'Capítulo segundo', 'Dios viene al encuentro del hombre', 6],
  ['T', '', 'La Revelación de Dios', 6],
  ['T', '', 'La transmisión de la divina Revelación', 11],
  ['T', '', 'La Sagrada Escritura', 18],
  ['C', 'Capítulo tercero', 'La respuesta del hombre a Dios', 25],
  ['T', '', 'Creo', 25],
  ['T', '', 'Creemos', 30],
  ['S', 'Segunda sección', 'La profesión de la fe cristiana', 33],
  ['C', 'Capítulo primero', 'Creo en Dios Padre', 33],
  ['T', '', 'Los símbolos de la fe', 33],
  ['T', '', '«Creo en Dios, Padre todopoderoso, creador del cielo y de la tierra»', 36],
  ['T', '', 'El cielo y la tierra', 59],
  ['T', '', 'El hombre', 66],
  ['T', '', 'La caída', 73],
  ['C', 'Capítulo segundo', 'Creo en Jesucristo, Hijo único de Dios', 79],
  ['T', '', 'Creo en Jesucristo, su único Hijo, nuestro Señor', 81],
  ['T', '', 'Jesucristo fue concebido por obra del Espíritu Santo y nació de santa María Virgen', 85],
  ['T', '', '«Jesucristo padeció bajo el poder de Poncio Pilato, fue crucificado, muerto y sepultado»', 112],
  ['T', '', 'Jesucristo descendió a los infiernos, al tercer día resucitó de entre los muertos', 125],
  ['T', '', '«Jesucristo subió a los cielos, y está sentado a la derecha de Dios, Padre todopoderoso»', 132],
  ['T', '', '«Desde allí ha de venir a juzgar a vivos y muertos»', 133],
  ['C', 'Capítulo tercero', 'Creo en el Espíritu Santo', 136],
  ['T', '', '«Creo en la Santa Iglesia Católica»: la Iglesia en el designio de Dios', 147],
  ['T', '', 'La Iglesia: Pueblo de Dios, Cuerpo de Cristo, Templo del Espíritu Santo', 153],
  ['T', '', 'La Iglesia es una, santa, católica y apostólica', 161],
  ['T', '', 'Los fieles: jerarquía, laicos, vida consagrada', 177],
  ['T', '', '«Creo en la comunión de los santos»', 194],
  ['T', '', 'María, Madre de Cristo, Madre de la Iglesia', 196],
  ['T', '', '«Creo en el perdón de los pecados»', 200],
  ['T', '', '«Creo en la resurrección de la carne»', 202],
  ['T', '', '«Creo en la vida eterna»', 207],
  ['T', '', '«Amén»', 217],
  ['P', 'Segunda parte', 'La celebración del misterio cristiano', 219],
  ['S', 'Primera sección', 'La economía sacramental', 219],
  ['C', 'Capítulo primero', 'El Misterio pascual en el tiempo de la Iglesia', 221],
  ['T', '', 'La Liturgia, obra de la Santísima Trinidad', 221],
  ['T', '', 'El Misterio pascual en los sacramentos de la Iglesia', 224],
  ['C', 'Capítulo segundo', 'La celebración sacramental del Misterio pascual', 233],
  ['T', '', 'Celebrar la Liturgia de la Iglesia: ¿quién celebra?', 233],
  ['T', '', 'Celebrar la Liturgia de la Iglesia: ¿cómo celebrar?', 236],
  ['T', '', 'Celebrar la Liturgia de la Iglesia: ¿cuándo celebrar?', 241],
  ['T', '', 'Celebrar la Liturgia de la Iglesia: ¿dónde celebrar?', 244],
  ['T', '', 'Diversidad litúrgica y unidad del misterio', 247],
  ['S', 'Segunda sección', 'Los siete sacramentos de la Iglesia', 251],
  ['C', 'Capítulo primero', 'Los sacramentos de la iniciación cristiana', 251],
  ['T', '', 'El sacramento del Bautismo', 252],
  ['T', '', 'El sacramento de la Confirmación', 265],
  ['T', '', 'El sacramento de la Eucaristía', 271],
  ['C', 'Capítulo segundo', 'Los sacramentos de curación', 296],
  ['T', '', 'El sacramento de la Penitencia y la Reconciliación', 296],
  ['T', '', 'El sacramento de la Unción de los enfermos', 313],
  ['C', 'Capítulo tercero', 'Los sacramentos al servicio de la comunión y de la misión', 321],
  ['T', '', 'El sacramento del Orden', 322],
  ['T', '', 'El sacramento del Matrimonio', 337],
  ['C', 'Capítulo cuarto', 'Otras celebraciones litúrgicas', 351],
  ['T', '', 'Los sacramentales', 351],
  ['T', '', 'Las exequias cristianas', 354],
  ['P', 'Tercera parte', 'La vida en Cristo', 357],
  ['S', 'Primera sección', 'La vocación del hombre: la vida en el Espíritu', 357],
  ['C', 'Capítulo primero', 'La dignidad de la persona humana', 359],
  ['T', '', 'La libertad del hombre', 363],
  ['T', '', 'La moralidad de las pasiones', 370],
  ['T', '', 'La conciencia moral', 372],
  ['T', '', 'Las virtudes', 377],
  ['T', '', 'El pecado', 391],
  ['C', 'Capítulo segundo', 'La comunidad humana', 401],
  ['T', '', 'La persona y la sociedad', 401],
  ['T', '', 'La participación en la vida social', 405],
  ['T', '', 'La justicia social', 411],
  ['C', 'Capítulo tercero', 'La salvación de Dios: la ley y la gracia', 415],
  ['T', '', 'La ley moral', 415],
  ['T', '', 'Gracia y justificación', 422],
  ['T', '', 'La Iglesia, madre y maestra', 429],
  ['S', 'Segunda sección', 'Los diez mandamientos', 434],
  ['C', 'Capítulo primero', '«Amarás al Señor tu Dios con todo tu corazón, con toda tu alma y con todas tus fuerzas»', 442],
  ['T', '', 'Primer mandamiento', 442],
  ['T', '', 'Segundo mandamiento', 447],
  ['T', '', 'Tercer mandamiento', 450],
  ['C', 'Capítulo segundo', '«Amarás a tu prójimo como a ti mismo»', 455],
  ['T', '', 'Cuarto mandamiento', 455],
  ['T', '', 'Quinto mandamiento', 466],
  ['T', '', 'Sexto mandamiento', 487],
  ['T', '', 'Séptimo mandamiento', 503],
  ['T', '', 'Octavo mandamiento', 521],
  ['T', '', 'Noveno mandamiento', 527],
  ['T', '', 'Décimo mandamiento', 531],
  ['P', 'Cuarta parte', 'La oración cristiana', 534],
  ['S', 'Primera sección', 'La oración en la vida cristiana', 534],
  ['C', 'Capítulo primero', 'La revelación de la oración', 535],
  ['T', '', 'La revelación de la oración en el Antiguo Testamento', 536],
  ['T', '', 'La oración plenamente revelada y realizada en Jesús', 541],
  ['T', '', 'La oración en el tiempo de la Iglesia', 548],
  ['C', 'Capítulo segundo', 'La tradición de la oración', 557],
  ['T', '', 'Fuentes de la oración', 558],
  ['T', '', 'El camino de la oración', 559],
  ['T', '', 'Maestros de oración', 564],
  ['C', 'Capítulo tercero', 'La vida de oración', 567],
  ['T', '', 'Las expresiones de la oración', 569],
  ['T', '', 'El combate de la oración', 572],
  ['S', 'Segunda sección', 'La oración del Señor: «Padre nuestro»', 578],
  ['T', '', '«Síntesis de todo el Evangelio»', 579],
  ['T', '', '«Padre nuestro que estás en el cielo»', 582],
  ['T', '', 'Las siete peticiones', 587],
];

// Preguntas y sus remisiones al Catecismo.
const questions = [];
for (const m of body.matchAll(/<b>\s*(\d{1,3})\.\s[\s\S]{0,400}?<\/b>(?:\s|<br\s*\/?>)*(?:<\/p>)?\s*(?:<p[^>]*>)?\s*([\s\S]{0,200}?)(?:<\/p>|<blockquote)/g)) {
  const n = +m[1];
  if (n < 1 || n > 598) continue;
  const ref = m[2].replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
  const ok = /^[\s\d.\-–,;y]+$/.test(ref) && /\d/.test(ref);
  const ranges = ok ? [...ref.matchAll(/(\d{1,4})(?:\s*[-–]\s*(\d{1,4}))?/g)].map((x) => (x[2] ? [+x[1], +x[2]] : [+x[1], +x[1]])) : [];
  if (ranges.some(([a, b]) => a < 1 || b > 2865 || b < a)) throw new Error(`pregunta ${n}: rango CEC fuera de 1-2865 (${ref.trim()})`);
  if (!questions.some((q) => q.n === n)) questions.push({ n, ccc: ranges });
}
questions.sort((a, b) => a.n - b.n);

const LAST = 598;
const nodes = [];
const stack = [];
const ord = { primera: 1, primero: 1, segunda: 2, segundo: 2, tercera: 3, tercero: 3, cuarta: 4, cuarto: 4 };
const flat = [];
T.forEach(([lv, label, title, from], i) => {
  const lvn = { P: 0, S: 1, C: 2, T: 3 }[lv];
  while (stack.length && stack[stack.length - 1].lvn >= lvn) stack.pop();
  const parent = stack[stack.length - 1]?.node;
  const k = lv === 'T' ? `t${from}` : `${lv.toLowerCase()}${label.toLowerCase().split(' ').map((x) => ord[x]).find(Boolean)}`;
  const node = { id: `${parent ? parent.id + '-' : 'cp-'}${k}`, level: lv, label, title, from, to: from, children: [] };
  (parent ? parent.children : nodes).push(node);
  stack.push({ lvn, node });
  flat.push(node);
});
// 'to' = hasta antes del siguiente nodo de igual o menor nivel (o tema/capítulo posterior)
const setTo = (list, limit) => list.forEach((n, i) => {
  const next = list[i + 1]?.from ?? limit + 1;
  n.to = next - 1;
  setTo(n.children, n.to);
  if (!n.children.length) delete n.children;
});
setTo(nodes, LAST);
// Preguntas de apertura de capítulos/secciones con subtemas: el tramo propio es el que precede al primer hijo.
const dest = path.join(pkg, 'sources', 'formation', 'compendio.json');
fs.writeFileSync(dest, JSON.stringify({ source: URL_C, retrievedAt: '2026-11-26', total: LAST, nodes, questions }, null, 1) + '\n');
console.log('preguntas:', questions.length, 'con remisiones:', questions.filter((q) => q.ccc.length).length, '→', dest);
