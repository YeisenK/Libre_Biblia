/** Código USFM -> OSIS (los de CANON). Los códigos ausentes de aquí se ignoran y se documentan. */
export const USFM_TO_OSIS: Record<string, string> = {
  GEN: 'Gen', EXO: 'Exod', LEV: 'Lev', NUM: 'Num', DEU: 'Deut', JOS: 'Josh', JDG: 'Judg', RUT: 'Ruth',
  '1SA': '1Sam', '2SA': '2Sam', '1KI': '1Kgs', '2KI': '2Kgs', '1CH': '1Chr', '2CH': '2Chr',
  EZR: 'Ezra', NEH: 'Neh', TOB: 'Tob', JDT: 'Jdt', EST: 'Esth', '1MA': '1Macc', '2MA': '2Macc',
  JOB: 'Job', PSA: 'Ps', PRO: 'Prov', ECC: 'Eccl', SNG: 'Song', WIS: 'Wis', SIR: 'Sir',
  ISA: 'Isa', JER: 'Jer', LAM: 'Lam', BAR: 'Bar', EZK: 'Ezek', DAN: 'Dan', HOS: 'Hos', JOL: 'Joel',
  AMO: 'Amos', OBA: 'Obad', JON: 'Jonah', MIC: 'Mic', NAM: 'Nah', HAB: 'Hab', ZEP: 'Zeph',
  HAG: 'Hag', ZEC: 'Zech', MAL: 'Mal',
  MAT: 'Matt', MRK: 'Mark', LUK: 'Luke', JHN: 'John', ACT: 'Acts', ROM: 'Rom',
  '1CO': '1Cor', '2CO': '2Cor', GAL: 'Gal', EPH: 'Eph', PHP: 'Phil', COL: 'Col',
  '1TH': '1Thess', '2TH': '2Thess', '1TI': '1Tim', '2TI': '2Tim', TIT: 'Titus', PHM: 'Phlm',
  HEB: 'Heb', JAS: 'Jas', '1PE': '1Pet', '2PE': '2Pet', '1JN': '1John', '2JN': '2John',
  '3JN': '3John', JUD: 'Jude', REV: 'Rev',
};

/**
 * Libros USFM deliberadamente NO mapeados (fuera del canon de 73 o que requieren fusión ambigua):
 * ESG/ADE/AES (Ester griego), DAG/S3Y/SUS/BEL (Daniel griego), LJE (Carta de Jeremías; en Vulgata es Bar 6),
 * 1ES/2ES/3ES/4ES (Esdras apócrifos), MAN (Oración de Manasés), PS2 (Sal 151), 3MA/4MA, ODA, PSS, LAO...
 */
export const USFM_IGNORED_NOTE =
  'Libros fuera del canon católico de 73 (1-2 Esdras apócrifos, Oración de Manasés, Sal 151, 3-4 Macabeos...) ' +
  'o suplementos griegos separados (ESG, DAG, LJE) se omiten en vez de fusionarlos por conjetura.';
