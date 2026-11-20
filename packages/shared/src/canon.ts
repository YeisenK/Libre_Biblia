/**
 * Canon católico de 73 libros (orden de las Biblias católicas modernas:
 * Macabeos tras Ester, Baruc tras Lamentaciones).
 *
 * `osis` sigue los identificadores OSIS estándar. Los nombres de libros
 * difieren entre tradiciones (p. ej. 1-2 Samuel = 1-2 Reyes en la Vulgata,
 * 1-2 Reyes = 3-4 Reyes); las abreviaturas incluyen ambas formas.
 *
 * `vulgateChapters` es el número de capítulos según la versificación de la
 * Vulgata (la que siguen Torres Amat, Scío y Douay-Rheims). Se usa solo para
 * validar la ingesta, nunca para generar contenido.
 */

export type Testament = 'OT' | 'NT';

export type BookGroup =
  | 'pentateuch'
  | 'historical'
  | 'wisdom'
  | 'prophets'
  | 'gospels'
  | 'acts'
  | 'pauline'
  | 'catholic-epistles'
  | 'apocalypse';

export interface CanonBook {
  /** Posición 1..73 */
  order: number;
  osis: string;
  testament: Testament;
  group: BookGroup;
  deuterocanonical: boolean;
  vulgateChapters: number;
  names: { es: string; en: string; la: string };
  /** Abreviatura preferida para mostrar en español */
  abbrEs: string;
  /** Alias aceptados por el parser de referencias (cualquier idioma) */
  aliases: string[];
}

type Row = [
  osis: string,
  group: BookGroup,
  deutero: boolean,
  chapters: number,
  es: string,
  en: string,
  la: string,
  abbrEs: string,
  aliases: string[],
];

const OT: Row[] = [
  ['Gen', 'pentateuch', false, 50, 'Génesis', 'Genesis', 'Genesis', 'Gn', ['gen', 'gn', 'ge']],
  ['Exod', 'pentateuch', false, 40, 'Éxodo', 'Exodus', 'Exodus', 'Ex', ['ex', 'exo', 'exod', 'éx']],
  ['Lev', 'pentateuch', false, 27, 'Levítico', 'Leviticus', 'Leviticus', 'Lv', ['lv', 'lev', 'le']],
  ['Num', 'pentateuch', false, 36, 'Números', 'Numbers', 'Numeri', 'Nm', ['nm', 'num', 'nu']],
  ['Deut', 'pentateuch', false, 34, 'Deuteronomio', 'Deuteronomy', 'Deuteronomium', 'Dt', ['dt', 'deut', 'deu']],
  ['Josh', 'historical', false, 24, 'Josué', 'Joshua', 'Iosue', 'Jos', ['jos', 'josh', 'ios', 'iosue']],
  ['Judg', 'historical', false, 21, 'Jueces', 'Judges', 'Iudicum', 'Jue', ['jue', 'jc', 'judg', 'jdg', 'jdc', 'iudicum']],
  ['Ruth', 'historical', false, 4, 'Rut', 'Ruth', 'Ruth', 'Rt', ['rt', 'rut', 'ru']],
  ['1Sam', 'historical', false, 31, '1 Samuel', '1 Samuel', 'I Samuelis (I Regum)', '1 S', ['1s', '1sam', '1sm', '1samuel', '1reyesvulg', '1rg', '1regum', '1kingdoms']],
  ['2Sam', 'historical', false, 24, '2 Samuel', '2 Samuel', 'II Samuelis (II Regum)', '2 S', ['2s', '2sam', '2sm', '2samuel', '2rg', '2regum', '2kingdoms']],
  ['1Kgs', 'historical', false, 22, '1 Reyes', '1 Kings', 'I Regum (III Regum)', '1 R', ['1r', '1re', '1rey', '1reyes', '1kgs', '1ki', '1kings', '3rg', '3regum', '3reyes', '3kings']],
  ['2Kgs', 'historical', false, 25, '2 Reyes', '2 Kings', 'II Regum (IV Regum)', '2 R', ['2r', '2re', '2rey', '2reyes', '2kgs', '2ki', '2kings', '4rg', '4regum', '4reyes', '4kings']],
  ['1Chr', 'historical', false, 29, '1 Crónicas', '1 Chronicles', 'I Paralipomenon', '1 Cr', ['1cr', '1cro', '1cron', '1cronicas', '1chr', '1ch', '1chronicles', '1par', '1paralipomenon', '1paralipomenos']],
  ['2Chr', 'historical', false, 36, '2 Crónicas', '2 Chronicles', 'II Paralipomenon', '2 Cr', ['2cr', '2cro', '2cron', '2cronicas', '2chr', '2ch', '2chronicles', '2par', '2paralipomenon', '2paralipomenos']],
  ['Ezra', 'historical', false, 10, 'Esdras', 'Ezra', 'Esdrae', 'Esd', ['esd', 'esdras', 'ezra', 'ezr', '1esd', '1esdras']],
  ['Neh', 'historical', false, 13, 'Nehemías', 'Nehemiah', 'Nehemiae', 'Ne', ['ne', 'neh', 'nehemias', '2esd', '2esdras']],
  ['Tob', 'historical', true, 14, 'Tobías', 'Tobit', 'Tobiae', 'Tb', ['tb', 'tob', 'tobias', 'tobit']],
  ['Jdt', 'historical', true, 16, 'Judit', 'Judith', 'Iudith', 'Jdt', ['jdt', 'judit', 'judith', 'idt', 'iudith']],
  ['Esth', 'historical', false, 16, 'Ester', 'Esther', 'Esther', 'Est', ['est', 'esth', 'ester', 'esther']],
  ['1Macc', 'historical', true, 16, '1 Macabeos', '1 Maccabees', 'I Machabaeorum', '1 M', ['1m', '1mac', '1macc', '1mc', '1macabeos', '1maccabees', '1mach']],
  ['2Macc', 'historical', true, 15, '2 Macabeos', '2 Maccabees', 'II Machabaeorum', '2 M', ['2m', '2mac', '2macc', '2mc', '2macabeos', '2maccabees', '2mach']],
  ['Job', 'wisdom', false, 42, 'Job', 'Job', 'Iob', 'Jb', ['jb', 'job', 'iob']],
  ['Ps', 'wisdom', false, 150, 'Salmos', 'Psalms', 'Psalmi', 'Sal', ['sal', 'salmo', 'salmos', 'sl', 'ps', 'psa', 'psalm', 'psalms', 'psalmi']],
  ['Prov', 'wisdom', false, 31, 'Proverbios', 'Proverbs', 'Proverbia', 'Pr', ['pr', 'prov', 'proverbios', 'prv', 'proverbs']],
  ['Eccl', 'wisdom', false, 12, 'Eclesiastés', 'Ecclesiastes', 'Ecclesiastes', 'Ecl', ['ecl', 'qo', 'qoh', 'eclesiastes', 'eccl', 'ecc', 'eccles', 'ecclesiastes']],
  ['Song', 'wisdom', false, 8, 'Cantar de los Cantares', 'Song of Songs', 'Canticum Canticorum', 'Ct', ['ct', 'cant', 'cantar', 'cantares', 'song', 'sg', 'cc', 'canticum']],
  ['Wis', 'wisdom', true, 19, 'Sabiduría', 'Wisdom', 'Sapientia', 'Sab', ['sab', 'sb', 'sabiduria', 'wis', 'wisdom', 'sap', 'sapientia']],
  ['Sir', 'wisdom', true, 51, 'Eclesiástico (Sirácida)', 'Sirach (Ecclesiasticus)', 'Ecclesiasticus', 'Si', ['si', 'sir', 'eclo', 'eclesiastico', 'siracida', 'sirach', 'ecclus', 'ecclesiasticus']],
  ['Isa', 'prophets', false, 66, 'Isaías', 'Isaiah', 'Isaias', 'Is', ['is', 'isa', 'isaias', 'isaiah']],
  ['Jer', 'prophets', false, 52, 'Jeremías', 'Jeremiah', 'Ieremias', 'Jr', ['jr', 'jer', 'jeremias', 'jeremiah', 'ier']],
  ['Lam', 'prophets', false, 5, 'Lamentaciones', 'Lamentations', 'Lamentationes', 'Lm', ['lm', 'lam', 'lamentaciones', 'lamentations', 'thren']],
  ['Bar', 'prophets', true, 6, 'Baruc', 'Baruch', 'Baruch', 'Ba', ['ba', 'bar', 'baruc', 'baruch']],
  ['Ezek', 'prophets', false, 48, 'Ezequiel', 'Ezekiel', 'Ezechiel', 'Ez', ['ez', 'eze', 'ezek', 'ezequiel', 'ezekiel', 'ezech']],
  ['Dan', 'prophets', false, 14, 'Daniel', 'Daniel', 'Daniel', 'Dn', ['dn', 'dan', 'daniel', 'da']],
  ['Hos', 'prophets', false, 14, 'Oseas', 'Hosea', 'Osee', 'Os', ['os', 'oseas', 'hos', 'hosea', 'osee']],
  ['Joel', 'prophets', false, 3, 'Joel', 'Joel', 'Ioel', 'Jl', ['jl', 'joel', 'ioel']],
  ['Amos', 'prophets', false, 9, 'Amós', 'Amos', 'Amos', 'Am', ['am', 'amos']],
  ['Obad', 'prophets', false, 1, 'Abdías', 'Obadiah', 'Abdias', 'Abd', ['abd', 'abdias', 'ab', 'obad', 'ob', 'obadiah']],
  ['Jonah', 'prophets', false, 4, 'Jonás', 'Jonah', 'Ionas', 'Jon', ['jon', 'jonas', 'jonah', 'ion']],
  ['Mic', 'prophets', false, 7, 'Miqueas', 'Micah', 'Michaeas', 'Mi', ['mi', 'miq', 'miqueas', 'mic', 'micah']],
  ['Nah', 'prophets', false, 3, 'Nahún', 'Nahum', 'Nahum', 'Na', ['na', 'nah', 'nahum', 'nahun']],
  ['Hab', 'prophets', false, 3, 'Habacuc', 'Habakkuk', 'Habacuc', 'Ha', ['ha', 'hab', 'habacuc', 'habakkuk']],
  ['Zeph', 'prophets', false, 3, 'Sofonías', 'Zephaniah', 'Sophonias', 'So', ['so', 'sof', 'sofonias', 'zeph', 'zep', 'zephaniah', 'soph']],
  ['Hag', 'prophets', false, 2, 'Ageo', 'Haggai', 'Aggaeus', 'Ag', ['ag', 'ageo', 'hag', 'haggai', 'agg']],
  ['Zech', 'prophets', false, 14, 'Zacarías', 'Zechariah', 'Zacharias', 'Za', ['za', 'zac', 'zacarias', 'zech', 'zec', 'zechariah']],
  ['Mal', 'prophets', false, 4, 'Malaquías', 'Malachi', 'Malachias', 'Ml', ['ml', 'mal', 'malaquias', 'malachi']],
];

const NT: Row[] = [
  ['Matt', 'gospels', false, 28, 'Mateo', 'Matthew', 'Matthaeus', 'Mt', ['mt', 'mat', 'mateo', 'matt', 'matthew']],
  ['Mark', 'gospels', false, 16, 'Marcos', 'Mark', 'Marcus', 'Mc', ['mc', 'mr', 'mrc', 'marcos', 'mk', 'mark', 'marc']],
  ['Luke', 'gospels', false, 24, 'Lucas', 'Luke', 'Lucas', 'Lc', ['lc', 'lucas', 'lk', 'luke', 'luc']],
  ['John', 'gospels', false, 21, 'Juan', 'John', 'Ioannes', 'Jn', ['jn', 'juan', 'john', 'jhn', 'io', 'ioh']],
  ['Acts', 'acts', false, 28, 'Hechos de los Apóstoles', 'Acts', 'Actus Apostolorum', 'Hch', ['hch', 'hech', 'hechos', 'act', 'acts', 'ac']],
  ['Rom', 'pauline', false, 16, 'Romanos', 'Romans', 'ad Romanos', 'Rm', ['rm', 'ro', 'rom', 'romanos', 'romans']],
  ['1Cor', 'pauline', false, 16, '1 Corintios', '1 Corinthians', 'I ad Corinthios', '1 Co', ['1co', '1cor', '1corintios', '1corinthians']],
  ['2Cor', 'pauline', false, 13, '2 Corintios', '2 Corinthians', 'II ad Corinthios', '2 Co', ['2co', '2cor', '2corintios', '2corinthians']],
  ['Gal', 'pauline', false, 6, 'Gálatas', 'Galatians', 'ad Galatas', 'Ga', ['ga', 'gal', 'galatas', 'galatians']],
  ['Eph', 'pauline', false, 6, 'Efesios', 'Ephesians', 'ad Ephesios', 'Ef', ['ef', 'efe', 'efesios', 'eph', 'ephesians']],
  ['Phil', 'pauline', false, 4, 'Filipenses', 'Philippians', 'ad Philippenses', 'Flp', ['flp', 'fil', 'filipenses', 'phil', 'php', 'philippians']],
  ['Col', 'pauline', false, 4, 'Colosenses', 'Colossians', 'ad Colossenses', 'Col', ['col', 'colosenses', 'colossians']],
  ['1Thess', 'pauline', false, 5, '1 Tesalonicenses', '1 Thessalonians', 'I ad Thessalonicenses', '1 Ts', ['1ts', '1tes', '1tesalonicenses', '1th', '1thess', '1thessalonians']],
  ['2Thess', 'pauline', false, 3, '2 Tesalonicenses', '2 Thessalonians', 'II ad Thessalonicenses', '2 Ts', ['2ts', '2tes', '2tesalonicenses', '2th', '2thess', '2thessalonians']],
  ['1Tim', 'pauline', false, 6, '1 Timoteo', '1 Timothy', 'I ad Timotheum', '1 Tm', ['1tm', '1ti', '1tim', '1timoteo', '1timothy']],
  ['2Tim', 'pauline', false, 4, '2 Timoteo', '2 Timothy', 'II ad Timotheum', '2 Tm', ['2tm', '2ti', '2tim', '2timoteo', '2timothy']],
  ['Titus', 'pauline', false, 3, 'Tito', 'Titus', 'ad Titum', 'Tt', ['tt', 'tit', 'tito', 'titus']],
  ['Phlm', 'pauline', false, 1, 'Filemón', 'Philemon', 'ad Philemonem', 'Flm', ['flm', 'filemon', 'phlm', 'phm', 'philemon']],
  ['Heb', 'pauline', false, 13, 'Hebreos', 'Hebrews', 'ad Hebraeos', 'Hb', ['hb', 'heb', 'hebreos', 'hebrews']],
  ['Jas', 'catholic-epistles', false, 5, 'Santiago', 'James', 'Iacobi', 'St', ['st', 'stg', 'sant', 'santiago', 'jas', 'jm', 'james', 'iac']],
  ['1Pet', 'catholic-epistles', false, 5, '1 Pedro', '1 Peter', 'I Petri', '1 P', ['1p', '1pe', '1pd', '1ped', '1pedro', '1pet', '1peter']],
  ['2Pet', 'catholic-epistles', false, 3, '2 Pedro', '2 Peter', 'II Petri', '2 P', ['2p', '2pe', '2pd', '2ped', '2pedro', '2pet', '2peter']],
  ['1John', 'catholic-epistles', false, 5, '1 Juan', '1 John', 'I Ioannis', '1 Jn', ['1jn', '1juan', '1jo', '1john', '1io']],
  ['2John', 'catholic-epistles', false, 1, '2 Juan', '2 John', 'II Ioannis', '2 Jn', ['2jn', '2juan', '2jo', '2john', '2io']],
  ['3John', 'catholic-epistles', false, 1, '3 Juan', '3 John', 'III Ioannis', '3 Jn', ['3jn', '3juan', '3jo', '3john', '3io']],
  ['Jude', 'catholic-epistles', false, 1, 'Judas', 'Jude', 'Iudae', 'Jds', ['jds', 'jud', 'judas', 'jude', 'iud']],
  ['Rev', 'apocalypse', false, 22, 'Apocalipsis', 'Revelation', 'Apocalypsis', 'Ap', ['ap', 'apoc', 'apocalipsis', 'rev', 're', 'revelation', 'apocalypse']],
];

export const CANON: readonly CanonBook[] = [
  ...OT.map((r) => ({ r, testament: 'OT' as const })),
  ...NT.map((r) => ({ r, testament: 'NT' as const })),
].map(({ r, testament }, i) => {
  const [osis, group, deuterocanonical, vulgateChapters, es, en, la, abbrEs, aliases] = r;
  return {
    order: i + 1,
    osis,
    testament,
    group,
    deuterocanonical,
    vulgateChapters,
    names: { es, en, la },
    abbrEs,
    aliases,
  };
});

const byOsis = new Map(CANON.map((b) => [b.osis, b]));

export function getBook(osis: string): CanonBook | undefined {
  return byOsis.get(osis);
}

export function requireBook(osis: string): CanonBook {
  const b = byOsis.get(osis);
  if (!b) throw new Error(`Libro desconocido: ${osis}`);
  return b;
}

/** Normaliza un nombre/abreviatura: minúsculas, sin acentos, sin espacios ni puntos. */
export function normalizeBookToken(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s.]/g, '')
    .replace(/^(iii|ii|i)(?=[a-z])/, (m) => String(m.length));
}

const aliasIndex: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const b of CANON) {
    const keys = [b.osis, b.abbrEs, b.names.es, b.names.en, b.names.la, ...b.aliases];
    for (const k of keys) {
      const n = normalizeBookToken(k);
      if (!m.has(n)) m.set(n, b.osis);
    }
  }
  return m;
})();

export function resolveBook(token: string): CanonBook | undefined {
  const osis = aliasIndex.get(normalizeBookToken(token));
  return osis ? byOsis.get(osis) : undefined;
}
