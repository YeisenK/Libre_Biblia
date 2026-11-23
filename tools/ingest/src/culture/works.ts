/**
 * Obras de cultura hispánica a ingestar desde es.wikisource.org.
 * Las ediciones se han verificado en las páginas/índices de Wikisource (revids en los paquetes).
 */
import type { WorkSpec } from './build';

const C_EPICA = 'Cultura hispánica › Épica medieval';
const C_ROMANCERO = 'Cultura hispánica › Romancero';
const C_POESIA = 'Cultura hispánica › Poesía hispanoamericana';
const C_NARRATIVA = 'Cultura hispánica › Narrativa y crónica hispanoamericana';
void C_EPICA;

const rom = (title: string, page = `Romance ${title}`) => ({ title: title[0]!.toUpperCase() + title.slice(1), page });

/** Romances anónimos con texto en Wikisource (se excluyen los de autor conocido, p. ej. Quevedo, y los recogidos por Menéndez Pidal). */
const ROMANCES = [
  { title: 'Romance de la doncella guerrera', page: 'Romance de la doncella guerrera' },
  { title: 'Romance de la pérdida de Alhama', page: 'Romance de la pérdida de Alhama' },
  { title: 'Abenámar y el rey don Juan', page: 'Romance de Abenámar' },
  { title: 'Romance del Cid Ruy Díaz', page: 'Romance del Cid Ruy Díaz' },
  { title: 'Juramento que tomó el Cid al rey don Alfonso', page: 'Romance del juramento que tomó el Cid al rey don Alfonso' },
  { title: 'Romance de don Rodrigo de Lara', page: 'Romance de don Rodrigo de Lara' },
  { title: 'Romance del reto a los zamoranos', page: 'Romance del reto a los zamoranos' },
  { title: 'Romance del rey don Sancho', page: 'Romance del rey don Sancho' },
  { title: 'Romance de Jimena Gómez', page: 'Romance de Jimena Gómez' },
  { title: 'Romance de doña Urraca', page: 'Romance de doña Vrraca' },
  { title: 'Romance de Gerineldo', page: 'Romance de Gerineldo' },
  { title: 'Romance del conde Claros de Montalván', page: 'Romance del conde Claros de Montalván' },
  { title: 'Fontefrida', page: 'Romance de Fontefrida' },
  { title: 'Romance de Rosafresca', page: 'Romance de Rosafresca' },
  { title: 'Romance de Álora la bien cercada', page: 'Romance de Álora la bien cercada' },
  { title: 'Romance del rey moro que perdió Valencia', page: 'Romance del rey moro que perdió Valencia' },
  { title: 'Romance de Valdovinos', page: 'Romance de Valdovinos' },
  { title: 'Romance del conde Guarinos', page: 'Romance del conde Guarinos' },
  { title: 'El infante vengador', page: 'Romance del infante vengador' },
  { title: 'Romance de la infantina', page: 'Romance de la infantina' },
  { title: 'Romance del conde Lombardo', page: 'Romance del conde Lombardo' },
  { title: 'Romance del cerco de Baza', page: 'Romance del cerco de Baza' },
  { title: 'Romance de doña Alda', page: 'Romance de doña Alda' },
  { title: 'Romance del conde Alemán', page: 'Romance del conde Alemán' },
  { title: 'Romance del moro Calaínos', page: 'Romance del moro Calaínos' },
  { title: 'Romance de la loba parda', page: 'Romance de la loba parda' },
  { title: 'Romance del conde Grimaltos y su hijo', page: 'Romance del conde Grimaltos y su hijo' },
  { title: 'El veneno de Moriana', page: 'Romance del Veneno de Moriana' },
  { title: 'Romance del cautivo', page: 'Romance del cautivo' },
  { title: 'Romance del amor más poderoso que la muerte', page: 'Romance del amor más poderoso que la muerte' },
  { title: 'Romance del moro de Antequera', page: 'Romance del moro de Antequera' },
];
void rom;

const SOR_JUANA = [
  ['Redondillas («Hombres necios que acusáis»)', 'Redondillas'],
  ['A su retrato («Este que ves, engaño colorido»)', 'Soneto CXLV - A su retrato'],
  ['A una rosa', 'A una Rosa'],
  ['Detente, sombra de mi bien esquivo', 'Detente sombra'],
  ['Verde embeleso de la vida humana', 'Verde embeleso'],
  ['Esta tarde, mi bien', 'Esta tarde, mi bien'],
  ['En perseguirme, Mundo, ¿qué interesas?', 'Insinua su aversion a los vicios'],
  ['Feliciano me adora y le aborrezco', 'Feliciano me adora y le aborrezco'],
  ['Al que ingrato me deja, busco amante', 'Al que ingrato me deja, busco amante'],
  ['Ante la ausencia', 'Ante la ausencia'],
  ['Amor inoportuno', 'Amor inoportuno'],
  ['Cogióme sin prevención', 'Cogióme sin prevención'],
  ['Día de Comunión', 'Día de Comunión'],
  ['Letras para cantar', 'Letras para cantar'],
  ['Nacimiento de Cristo', 'Nacimiento de Cristo'],
  ['Oración traducida del latín', 'Oración traducida'],
  ['Sentimientos de ausente', 'Sentimientos de ausente'],
  ['Teme que su afecto parezca gratitud', 'Teme que su afecto'],
  ['Excusándose de un silencio', 'Excusándose'],
  ['Expresa los efectos del amor divino', 'Expresa los efectos'],
  ['Envía una rosa a la virreina', 'Envía una rosa a la virreina'],
  ['Finjamos que soy feliz', 'Finjamos que soy feliz'],
  ['Pues estoy condenada', 'Pues estoy condenada'],
  ['Ya que para despedirme', 'Ya que para despedirme'],
  ['Dime vencedor rapaz', 'Dime vencedor rapaz'],
  ['Este amoroso tormento', 'Este amoroso tormento'],
  ['Estos versos, lector mío', 'Estos versos, lector mío'],
  ['De amor y de discreción', 'De amor y de discreción'],
].map(([title, page]) => ({ title: title!, page: page! }));

export const WORKS: WorkSpec[] = [
  {
    slug: 'romancero-viejo', title: 'Romancero viejo', subtitle: 'Romances tradicionales anónimos', genre: 'romance',
    description: 'Selección de romances anónimos del Romancero viejo (doncella guerrera, Alhama, romances del Cid y otros).',
    language: 'es', region: 'España', country: 'España', period: 'Siglos XIV–XVI', collection: C_ROMANCERO, authority: 'literary',
    author: { name: 'Anónimo' },
    edition: 'Versiones modernizadas transcritas en Wikisource; las páginas no declaran edición base (pendiente de verificar)',
    mainPage: 'El romancero viejo', parts: [{ kind: 'pages', titles: ROMANCES, verse: true }],
    extraNotes: 'Cada romance es una página de Wikisource con su propio historial; revisar la edición base antes de redistribuir.',
  },
  {
    slug: 'versos-sencillos', title: 'Versos sencillos', genre: 'poem', language: 'es',
    author: { name: 'José Martí', born: '1853', died: '1895' }, region: 'Hispanoamérica', country: 'Cuba', period: '1891',
    collection: C_POESIA, authority: 'literary',
    edition: 'Transcripción de Wikisource (la página indica como fuente prevista la «Colección de libros cubanos», 1927); primera edición 1891',
    mainPage: 'Versos sencillos',
    parts: [{ kind: 'prefix', prefix: 'Versos sencillos/', first: ['Prólogo'], verse: true }],
  },
  {
    slug: 'azul', title: 'Azul...', genre: 'poem', language: 'es',
    author: { name: 'Rubén Darío', born: '1867', died: '1916' }, region: 'Hispanoamérica', country: 'Nicaragua', period: '1888',
    collection: C_POESIA, authority: 'literary',
    edition: 'Obras completas de Rubén Darío, vol. IV: Azul..., Mundo Latino, Madrid, 1917 (escaneo de Internet Archive, ortografía original)',
    mainPage: 'Azul...',
    parts: [{ kind: 'djvu', index: 'Azul....djvu', from: 9, to: 224, leadTitle: undefined, dropTitles: ['INDICE'], keepLevel: 2 }],
    extraNotes: 'Páginas en blanco (139, 179, 227) no existen en Wikisource y no contienen texto.',
  },
  {
    slug: 'poesias-sor-juana', title: 'Poemas de sor Juana Inés de la Cruz', subtitle: 'Selección de poemas transcritos en Wikisource', genre: 'poem',
    language: 'es', author: { name: 'Sor Juana Inés de la Cruz', born: '1651', died: '1695' }, region: 'Hispanoamérica', country: 'México',
    period: 'Siglo XVII', collection: C_POESIA, authority: 'literary',
    edition: 'Transcripciones modernizadas de Wikisource; las páginas no declaran edición base. «Primero sueño» no se incluye (edición moderna de Antonio Alatorre)',
    mainPage: 'Autor:Sor Juana Inés de la Cruz', parts: [{ kind: 'pages', titles: SOR_JUANA, verse: true }],
  },
  {
    slug: 'tradiciones-peruanas-primera-serie', title: 'Tradiciones peruanas (primera serie)', genre: 'narrative', language: 'es',
    author: { name: 'Ricardo Palma', born: '1833', died: '1919' }, region: 'Hispanoamérica', country: 'Perú', period: '1872',
    collection: C_NARRATIVA, authority: 'literary',
    edition: 'Tradiciones peruanas, Tomo I, Barcelona, Montaner y Simón, 1893 (escaneo; ortografía modernizada en la transcripción)',
    mainPage: 'Tradiciones peruanas - Primera serie',
    parts: [{ kind: 'djvu-titles', index: 'Tradiciones peruanas - Tomo I (1893).pdf', from: 33, to: 122, titlesPage: 31 }],
  },
  {
    slug: 'martin-fierro', title: 'Martín Fierro', subtitle: 'El gaucho Martín Fierro y La vuelta de Martín Fierro', genre: 'epic', language: 'es',
    author: { name: 'José Hernández', born: '1834', died: '1886' }, region: 'Hispanoamérica', country: 'Argentina', period: '1872–1879',
    collection: C_POESIA, authority: 'literary',
    edition: 'El gaucho Martín Fierro: ed. de 1894 (escaneo de la Univ. of Illinois, ortografía original); La vuelta de Martín Fierro: 2.ª ed., Pablo E. Coni, 1879',
    mainPage: 'El Gaucho Martín Fierro (1894)',
    parts: [
      { kind: 'group', title: 'El gaucho Martín Fierro', parts: [{ kind: 'prefix', prefix: 'El Gaucho Martín Fierro (1894)/', first: ['Prólogo de 1872'], exclude: ['Ilustraciones', 'Advertencia editorial'], titlePrefix: 'Canto ', titleMap: { 'Prólogo de 1872': 'Carta a D. José Zoilo Miguens' }, verse: true }] },
      { kind: 'group', title: 'La vuelta de Martín Fierro', parts: [{ kind: 'prefix', prefix: 'La vuelta de Martín Fierro (1879)/', first: ['0'], titlePrefix: 'Canto ', titleMap: { '0': 'Cuatro palabras de conversación con los lectores' }, verse: true }] },
    ],
  },
  {
    slug: 'comentarios-reales', title: 'Comentarios reales de los incas', subtitle: 'Selección de capítulos transcritos', genre: 'chronicle', language: 'es',
    author: { name: 'Inca Garcilaso de la Vega', born: '1539', died: '1616' }, region: 'Hispanoamérica', country: 'Perú', period: '1609',
    collection: C_NARRATIVA, authority: 'literary',
    edition: 'Transcripción modernizada de Wikisource; solo los capítulos transcritos (no toda la obra); la página no declara edición base',
    mainPage: 'Comentarios reales (Primera parte)',
    parts: [
      { kind: 'group', title: 'Primera parte', parts: [{ kind: 'prefix', prefix: 'Comentarios reales (Primera parte)/', first: ['Proemio'], titlePrefix: 'Capítulo ' }] },
    ],
  },
];

const C_ESPIRITUAL = 'Espiritualidad clásica';
const pages = (l: [string, string][]) => l.map(([title, page]) => ({ title, page }));

export const WORKS_SPIRITUAL: WorkSpec[] = [
  {
    slug: 'confesiones-agustin', title: 'Confessiones', subtitle: 'Confesiones de san Agustín (texto latino)', genre: 'autobiography', language: 'la',
    author: { name: 'Agustín de Hipona', born: '354', died: '430' }, region: 'África romana', country: 'Argelia', period: 'c. 397–401',
    collection: C_ESPIRITUAL, authority: 'patristic', wikiLang: 'la',
    edition: 'Patrologia Latina, t. 32, ed. J.-P. Migne, París, 1841 (codificación TEI del Corpus Corporum, Univ. de Zúrich, vía Wikisource en latín). Texto original latino: no se halló traducción española antigua con traductor de dominio público verificado',
    mainPage: 'Confessiones (ed. Migne)',
    parts: [{ kind: 'prefix', prefix: 'Confessiones (ed. Migne)/', exclude: ['adm'], titlePrefix: 'Liber ' }],
    extraNotes: 'Se omite la «admonitio» editorial de Migne. Los números de capítulo del texto se conservan como líneas.',
  },
  {
    slug: 'libro-de-la-vida-teresa', title: 'Libro de la vida', subtitle: 'Santa Teresa de Jesús (capítulos transcritos)', genre: 'autobiography', language: 'es',
    author: { name: 'Teresa de Jesús', born: '1515', died: '1582' }, region: 'España', country: 'España', period: '1562–1565',
    collection: C_ESPIRITUAL, authority: 'spiritual_classic',
    edition: 'Su vida, Espasa-Calpe (Colección Universal n.º 1003-1005), Madrid, 1927 (escaneo de la BDCYL; ortografía modernizada; editor no consignado en el índice de Wikisource). Solo los capítulos transcritos',
    mainPage: 'Su vida (Santa Teresa de Jesús)',
    parts: [{ kind: 'prefix', prefix: 'Su vida (Santa Teresa de Jesús)/' }],
    extraNotes: 'Pendiente verificar el editor de la edición de 1927 y el estado de derechos; los capítulos no transcritos del tomo II no existen en Wikisource.',
  },
  {
    slug: 'poesias-santa-teresa', title: 'Poesías de santa Teresa de Jesús', genre: 'poem', language: 'es',
    author: { name: 'Teresa de Jesús', born: '1515', died: '1582' }, region: 'España', country: 'España', period: 'Siglo XVI',
    collection: C_ESPIRITUAL, authority: 'spiritual_classic', edition: 'Transcripciones de Wikisource; las páginas no declaran edición base',
    mainPage: 'Teresa de Jesús',
    parts: [{ kind: 'pages', verse: true, titles: pages([['Nada te turbe', 'Nada te turbe'], ['Si el amor que me tenéis', 'Si el amor que me tenéis'], ['Vivo sin vivir en mí', 'Vivo sin vivir en mí'], ['Vuestra soy, para vos nací', 'Vuestra soy, para vos nací'], ['Yo toda me entregué y di', 'Yo toda me entregué y dí']]) }],
    extraNotes: 'Las páginas inexistentes (p. ej. «Soneto sin nombre») no se incluyen.',
  },
  {
    slug: 'poesias-san-juan-de-la-cruz', title: 'Poesías de san Juan de la Cruz', subtitle: 'Cántico espiritual, Noche oscura, Llama de amor viva y otros poemas', genre: 'poem', language: 'es',
    author: { name: 'Juan de la Cruz', born: '1542', died: '1591' }, region: 'España', country: 'España', period: 'Siglo XVI',
    collection: C_ESPIRITUAL, authority: 'spiritual_classic', edition: 'Transcripciones de Wikisource; las páginas no declaran edición base. Solo los poemas: los tratados en prosa no están transcritos en Wikisource',
    mainPage: 'Autor:Juan de la Cruz',
    parts: [{ kind: 'pages', verse: true, titles: pages([
      ['Cántico espiritual', 'Cántico espiritual'], ['Noche oscura', 'Noche oscura'], ['Llama de amor viva', 'Llama de amor viva'],
      ['Coplas hechas sobre un éxtasis de harta contemplación', 'Coplas hechas sobre un éxtasis de harta contemplación'],
      ['Coplas del alma que pena por ver a Dios', 'Coplas del alma que pena por ver a Dios'], ['Otras del mismo a lo divino', 'Otras del mismo a lo divino'],
      ['Glosa', 'Glosa (San Juan de la Cruz)'], ['Glosa a lo divino', 'Glosa a lo divino'],
      ['Cantar del alma que se huelga de conocer a Dios por fe', 'Cantar del alma que se huelga de conocer a Dios por fe'],
      ['Otras canciones a lo divino', 'Otras canciones a lo divino'], ['Romance sobre el Evangelio «In principio erat Verbum»', 'Romance sobre el Evangelio'],
      ['Super flumina Babylonis', 'Super flumina Babylonis'],
    ]) }],
  },
  {
    slug: 'imitacion-de-cristo', title: 'Imitación de Cristo', subtitle: 'De imitatione Christi (texto latino original)', genre: 'devotional', language: 'la',
    author: { name: 'Tomás de Kempis', born: '1380', died: '1471' }, region: 'Europa septentrional', country: 'Países Bajos', period: 'Siglo XIV',
    collection: C_ESPIRITUAL, authority: 'spiritual_classic', wikiLang: 'la',
    edition: 'Texto latino transcrito en Wikisource (De imitatione Christi, cuatro libros). La página de Wikisource indica «editio: incognita» y «fons: incognitus»; no se identifica editor ni fecha de edición',
    mainPage: 'De imitatione Christi',
    parts: [
      { kind: 'group', title: 'Liber primus', parts: [{ kind: 'chapters', page: 'De imitatione Christi/I' }] },
      { kind: 'group', title: 'Liber secundus', parts: [{ kind: 'chapters', page: 'De imitatione Christi/II' }] },
      { kind: 'group', title: 'Liber tertius', parts: [{ kind: 'chapters', page: 'De imitatione Christi/III' }] },
      { kind: 'group', title: 'Liber quartus', parts: [{ kind: 'chapters', page: 'De imitatione Christi/IV' }] },
    ],
    extraNotes: 'Original latino (no hay traducción española de dominio público con transcripción completa verificable en Wikisource; ver README). La atribución a Tomás de Kempis es tradicional y discutida por la crítica. Se conservan los números de párrafo del texto.',
  },
  {
    slug: 'historia-de-un-alma', title: 'Histoire d’une âme', subtitle: 'Historia de un alma, de santa Teresa del Niño Jesús (texto francés, edición de 1912)', genre: 'autobiography', language: 'fr',
    author: { name: 'Teresa del Niño Jesús (Teresita de Lisieux)', born: '1873', died: '1897' }, region: 'Normandía', country: 'Francia', period: '1895–1897 (primera edición 1898)',
    collection: C_ESPIRITUAL, authority: 'spiritual_classic', wikiLang: 'fr',
    edition: 'Histoire d’une âme écrite par elle-même, «édition de 1912» (Lisieux, Office central de Lisieux), transcrita en fr.wikisource a partir del escaneo «Histoire d’une âme (édition de 1912).pdf»; página principal «Histoire d’une âme», revisión oldid=16100792',
    mainPage: 'Histoire d’une âme',
    parts: [
      {
        kind: 'group', title: 'Préliminaires',
        parts: [{
          kind: 'pages', headTitle: 3, reflow: true, pageParagraphs: true,
          titles: [{ title: 'Préface', page: 'Histoire d’une âme/03' }, { title: 'Introduction', page: 'Histoire d’une âme/04' }],
        }],
      },
      {
        kind: 'group', title: 'Histoire d’une âme',
        parts: [{
          kind: 'pages', headTitle: 3, reflow: true, pageParagraphs: true, dropMatching: ['marquées? d’une †'],
          titles: [
          { title: 'Chapitre I', page: 'Histoire d’une âme/1/1' },
          { title: 'Chapitre II', page: 'Histoire d’une âme/1/2' },
          { title: 'Chapitre III', page: 'Histoire d’une âme/1/3' },
          { title: 'Chapitre IV', page: 'Histoire d’une âme/1/4' },
          { title: 'Chapitre V', page: 'Histoire d’une âme/1/5' },
          { title: 'Chapitre VI', page: 'Histoire d’une âme/1/6' },
          { title: 'Chapitre VII', page: 'Histoire d’une âme/1/7' },
          { title: 'Chapitre VIII', page: 'Histoire d’une âme/1/8' },
          { title: 'Chapitre IX', page: 'Histoire d’une âme/1/9' },
          { title: 'Chapitre X', page: 'Histoire d’une âme/1/10' },
          { title: 'Chapitre XI', page: 'Histoire d’une âme/1/11' },
          { title: 'Chapitre XII', page: 'Histoire d’une âme/1/12' },
          ],
        }],
      },
      {
        kind: 'group', title: 'Prières et actes d’offrande',
        parts: [{ kind: 'prefix', prefix: 'Histoire d’une âme/2/', exclude: ['1'], headTitle: 3, reflow: true, pageParagraphs: true }],
      },
      {
        kind: 'group', title: 'Lettres',
        parts: [
          { kind: 'chapters', page: 'Histoire d’une âme/3/1', keepLevel: 4, joinParents: true, titleStrip: '^LETTRES\\s+', reflow: true, pageParagraphs: true },
          { kind: 'chapters', page: 'Histoire d’une âme/3/2', keepLevel: 4, joinParents: true, titleStrip: '^LETTRES\\s+', reflow: true, pageParagraphs: true, dropLines: ['fragments'] },
          { kind: 'chapters', page: 'Histoire d’une âme/3/3', keepLevel: 4, joinParents: true, titleStrip: '^LETTRES\\s+', reflow: true, pageParagraphs: true },
          { kind: 'chapters', page: 'Histoire d’une âme/3/4', keepLevel: 4, joinParents: true, titleStrip: '^LETTRES\\s+', reflow: true, pageParagraphs: true },
          { kind: 'chapters', page: 'Histoire d’une âme/3/5', keepLevel: 4, joinParents: true, titleStrip: '^LETTRES\\s+', reflow: true, pageParagraphs: true },
          { kind: 'chapters', page: 'Histoire d’une âme/3/6', keepLevel: 4, joinParents: true, titleStrip: '^LETTRES\\s+', reflow: true, pageParagraphs: true },
          { kind: 'chapters', page: 'Histoire d’une âme/3/7', keepLevel: 4, joinParents: true, titleStrip: '^LETTRES\\s+', dropLines: ['fragments'], reflow: true, pageParagraphs: true },
        ],
      },
      {
        kind: 'group', title: 'Poésies',
        parts: [
          { kind: 'group', title: 'Première partie', parts: [{ kind: 'prefix', prefix: 'Histoire d’une âme/4/1/', headTitle: 3 }] },
          { kind: 'group', title: 'Deuxième partie', parts: [{ kind: 'prefix', prefix: 'Histoire d’une âme/4/2/', headTitle: 3 }] },
          { kind: 'group', title: 'Troisième partie', parts: [{ kind: 'prefix', prefix: 'Histoire d’une âme/4/3/', headTitle: 3 }] },
        ],
      },
    ],
    extraNotes: 'Texto en francés (original de la obra; no hay en es.wikisource una versión española). Fuente: fr.wikisource «Histoire d’une âme» (edición de 1912), oldid=16100792 (https://fr.wikisource.org/w/index.php?title=Histoire_d%E2%80%99une_%C3%A2me&oldid=16100792), transcrita del escaneo «Histoire d’une âme (édition de 1912).pdf». Se incluyen la Préface y la Introduction del editor, los 12 capítulos del relato (que en esta edición funden los manuscritos A, B y C), el Acto de ofrenda y las oraciones, las cartas y las poesías de la santa. Se omiten las cartas de aprobación, el apéndice «Conseils et Souvenirs» (recopilación de dichos por terceros), «Pluie de Roses» y el relato de la exhumación (textos editoriales posteriores), así como notas a pie, ilustraciones y paginación del escaneo.',
  },
];
