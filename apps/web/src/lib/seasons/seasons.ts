/**
 * Temporadas espirituales: sistema declarativo. Cada temporada declara cuándo está activa (a partir
 * de liturgy.ts, nunca con fechas escritas a mano), su acento visual y su contenido destacado
 * (referencias a ids existentes: oraciones, novenas, lecturas, libros de la Biblioteca).
 *
 * Para añadir una temporada basta una entrada más en `SEASONS`; ni la UI ni las notificaciones cambian.
 */
import { celebrationsOfYear, easterSunday, liturgicalDay, type LiturgicalDay, type LiturgyOptions } from '@bc/shared';
import { shiftIso } from '../daily/date';

export interface SeasonContent {
  /** ids de oración (`prayer:<id>`) */
  prayers: string[];
  /** ids de novena */
  novenas: string[];
  /** Devociones con ruta propia de la app */
  devotions: { title: string; href: string }[];
  /** Lecturas bíblicas sugeridas (formato español, p. ej. «Is 11,1-10») */
  readings: { label: string; ref: string }[];
  /** Reflexión breve de redacción propia (no es un texto atribuido a nadie) */
  reflection: { title: string; text: string };
  /** ids de documentos de la Biblioteca (`doc.*`) */
  books: string[];
}

export interface SeasonAccent {
  /** Degradado profundo de la paleta Hallow (docs/DISENO_V2.md) */
  from: string;
  to: string;
  /** Color de acento para filetes y puntos (sobrio, legible sobre oscuro) */
  tint: string;
}

/** Condición de actividad de una temporada. */
export type SeasonRule =
  | { kind: 'day'; test: (d: LiturgicalDay, iso: string) => boolean }
  /** Ventana alrededor de una celebración (id de liturgy.ts, con el calendario activo) */
  | { kind: 'celebration'; id: string; before: number; after: number }
  /** Ventana relativa a la Pascua */
  | { kind: 'easter'; from: number; to: number };

export interface SeasonDef {
  id: string;
  name: string;
  summary: string;
  /** Mayor número = se muestra primero cuando coinciden varias */
  priority: number;
  /** Calendarios en que aplica (por omisión, todos) */
  calendars?: string[];
  rule: SeasonRule;
  accent: SeasonAccent;
  /** Clave de arte (lib/art.ts) */
  art?: string;
  /** Aviso al comenzar la temporada (notificación «inicio de tiempos») */
  start: { title: string; body: string };
  content: SeasonContent;
}

const A = (from: string, to: string, tint: string): SeasonAccent => ({ from, to, tint });

export const SEASONS: SeasonDef[] = [
  {
    id: 'advent',
    name: 'Adviento',
    summary: 'Cuatro semanas de espera vigilante: la Iglesia se prepara para recibir al Señor que viene.',
    priority: 40,
    rule: { kind: 'day', test: (d) => d.season === 'advent' },
    accent: A('#3A2F86', '#0F1030', '#A99BFF'),
    art: 'mystery:joyful-1',
    start: { title: 'Comienza el Adviento', body: 'Tiempo de espera y de esperanza. Prepara el corazón para la venida del Señor.' },
    content: {
      prayers: ['magnificat', 'angelus', 'acordaos'],
      novenas: ['inmaculada-concepcion', 'nino-jesus'],
      devotions: [{ title: 'Santo Rosario: misterios gozosos', href: '/rosario/' }],
      readings: [{ label: 'La rama de Jesé', ref: 'Is 11,1-10' }, { label: 'Despertad del sueño', ref: 'Rm 13,11-14' }, { label: 'La Anunciación', ref: 'Lc 1,26-38' }],
      reflection: { title: 'Velar', text: 'Adviento no es solo contar los días hasta la Navidad: es aprender a esperar. Dedica cada día unos minutos de silencio y pide la gracia de estar despierto cuando el Señor llame.' },
      books: ['doc.imitacion-de-cristo'],
    },
  },
  {
    id: 'christmas',
    name: 'Navidad',
    summary: 'El Verbo se hizo carne. La Iglesia contempla el misterio de la Encarnación hasta el Bautismo del Señor.',
    priority: 40,
    rule: { kind: 'day', test: (d) => d.season === 'christmas' },
    accent: A('#7A4A2A', '#2A1230', '#E2B866'),
    art: 'mystery:joyful-3',
    start: { title: 'Feliz Navidad', body: 'Hoy nos ha nacido un Salvador. Detente un momento ante el misterio del Dios hecho niño.' },
    content: {
      prayers: ['gloria', 'te-deum', 'jesus-jose-y-maria'],
      novenas: ['nino-jesus'],
      devotions: [{ title: 'Santo Rosario: misterios gozosos', href: '/rosario/' }],
      readings: [{ label: 'El nacimiento', ref: 'Lc 2,1-14' }, { label: 'El Verbo se hizo carne', ref: 'Jn 1,1-18' }, { label: 'Los Magos', ref: 'Mt 2,1-12' }],
      reflection: { title: 'Dios con nosotros', text: 'La Navidad dura más que una noche. Lleva estos días el asombro del pesebre a tu casa: una oración compartida, un gesto de perdón, una puerta abierta.' },
      books: [],
    },
  },
  {
    id: 'lent',
    name: 'Cuaresma',
    summary: 'Cuarenta días de oración, ayuno y limosna para volver al Señor con todo el corazón.',
    priority: 40,
    rule: { kind: 'day', test: (d) => d.season === 'lent' && (d.week ?? 0) < 6 },
    accent: A('#2A3A7A', '#120F2E', '#A99BFF'),
    art: 'category:momentos-dificiles',
    start: { title: 'Comienza la Cuaresma', body: 'Convertíos y creed en el Evangelio. Oración, ayuno y limosna: elige hoy tu propósito.' },
    content: {
      prayers: ['via-crucis', 'acto-de-contricion', 'examen-de-conciencia', 'oracion-antes-de-confesarse'],
      novenas: ['san-jose'],
      devotions: [{ title: 'Vía Crucis', href: '/oracion/?id=via-crucis' }, { title: 'Preparar la confesión', href: '/oracion/?id=examen-para-confesion' }],
      readings: [{ label: 'Volved a mí', ref: 'Jl 2,12-18' }, { label: 'El hijo pródigo', ref: 'Lc 15,11-32' }, { label: 'Miserere', ref: 'Sal 51,3-19' }],
      reflection: { title: 'Oración, ayuno, limosna', text: 'La Cuaresma pide poco y bien: un propósito concreto de oración, una privación que te acerque a los demás y una limosna que cueste algo. Empieza por uno y sé fiel.' },
      books: ['doc.imitacion-de-cristo', 'doc.confesiones-agustin'],
    },
  },
  {
    id: 'holy-week',
    name: 'Semana Santa y Triduo Pascual',
    summary: 'Del Domingo de Ramos al Sábado Santo: la Iglesia acompaña a Cristo en su Pasión, muerte y sepultura.',
    priority: 90,
    rule: { kind: 'day', test: (d) => d.season === 'triduum' || (d.season === 'lent' && d.week === 6) },
    accent: A('#6A3A3A', '#1E1028', '#E2B866'),
    art: 'mystery:sorrowful-5',
    start: { title: 'Comienza la Semana Santa', body: 'Acompaña al Señor en su Pasión. Reserva tiempo para la liturgia de estos días.' },
    content: {
      prayers: ['via-crucis', 'anima-christi', 'santa-faz', 'hagase-tu-voluntad'],
      novenas: ['divina-misericordia', 'preciosa-sangre'],
      devotions: [{ title: 'Santo Rosario: misterios dolorosos', href: '/rosario/' }, { title: 'Vía Crucis', href: '/oracion/?id=via-crucis' }],
      readings: [{ label: 'El Siervo sufriente', ref: 'Is 52,13-53,12' }, { label: 'El lavatorio de los pies', ref: 'Jn 13,1-15' }, { label: 'Himno de Filipenses', ref: 'Flp 2,6-11' }, { label: 'La Pasión según san Juan', ref: 'Jn 18,1-19,42' }],
      reflection: { title: 'Quedarse al pie de la cruz', text: 'Estos días no se «hacen»: se acompañan. Si puedes, asiste a las celebraciones del Triduo; si no, lee despacio la Pasión y quédate unos minutos en silencio.' },
      books: [],
    },
  },
  {
    id: 'easter',
    name: 'Pascua',
    summary: 'Cincuenta días de alegría: Cristo ha resucitado. Del Domingo de Resurrección a Pentecostés.',
    priority: 40,
    rule: { kind: 'day', test: (d) => d.season === 'easter' },
    accent: A('#5E2F5A', '#16102E', '#E2B866'),
    art: 'mystery:glorious-1',
    start: { title: '¡Cristo ha resucitado!', body: 'Comienza el tiempo pascual: cincuenta días de alegría. Aleluya.' },
    content: {
      prayers: ['regina-coeli', 'gloria', 'te-deum'],
      novenas: ['divina-misericordia', 'espiritu-santo'],
      devotions: [{ title: 'Santo Rosario: misterios gloriosos', href: '/rosario/' }, { title: 'Coronilla de la Divina Misericordia', href: '/oracion/?id=coronilla-divina-misericordia' }],
      readings: [{ label: 'El sepulcro vacío', ref: 'Jn 20,1-9' }, { label: 'Los discípulos de Emaús', ref: 'Lc 24,13-35' }, { label: 'Pedro en Pentecostés', ref: 'Hch 2,14.22-33' }],
      reflection: { title: 'Vivir como resucitados', text: 'La Pascua no termina el domingo: dura cincuenta días. Elige un signo de alegría que compartir cada día; el Resucitado se deja reconocer en el pan partido y en el servicio.' },
      books: ['doc.historia-de-un-alma'],
    },
  },
  {
    id: 'pentecost',
    name: 'Novena de Pentecostés',
    summary: 'Nueve días de oración con María y los apóstoles, esperando al Espíritu Santo.',
    priority: 60,
    rule: { kind: 'easter', from: 40, to: 49 },
    accent: A('#7A4A2A', '#2A1230', '#E2B866'),
    art: 'mystery:glorious-3',
    start: { title: 'Comienza la novena al Espíritu Santo', body: 'Nueve días de oración hasta Pentecostés. Ven, Espíritu Santo.' },
    content: {
      prayers: ['ven-espiritu-santo', 'veni-creator', 'veni-sancte-spiritus', 'siete-dones'],
      novenas: ['espiritu-santo'],
      devotions: [],
      readings: [{ label: 'Pentecostés', ref: 'Hch 2,1-11' }, { label: 'Recibid el Espíritu Santo', ref: 'Jn 20,19-23' }, { label: 'Hijos de Dios', ref: 'Rm 8,14-17' }, { label: 'Frutos del Espíritu', ref: 'Ga 5,22-23' }],
      reflection: { title: 'Perseverar en la oración', text: 'Los apóstoles esperaron juntos y en oración. Dedica estos nueve días a una sola petición: que el Espíritu Santo renueve lo que tienes dormido.' },
      books: [],
    },
  },
  {
    id: 'guadalupe',
    name: 'Nuestra Señora de Guadalupe',
    summary: 'Los días previos a la fiesta de la Virgen de Guadalupe, patrona de México.',
    priority: 70,
    calendars: ['mx'],
    rule: { kind: 'celebration', id: 'guadalupe', before: 9, after: 0 },
    accent: A('#5E2F5A', '#16102E', '#E2B866'),
    art: 'novena:guadalupe',
    start: { title: 'Novena a la Virgen de Guadalupe', body: 'Comienzan los nueve días previos al 12 de diciembre.' },
    content: {
      prayers: ['acordaos', 'bajo-tu-amparo', 'magnificat'],
      novenas: ['guadalupe', 'san-juan-diego'],
      devotions: [{ title: 'Santo Rosario', href: '/rosario/' }],
      readings: [{ label: 'La Visitación', ref: 'Lc 1,39-48' }],
      reflection: { title: '¿No estoy yo aquí, que soy tu madre?', text: 'Acude a María con tus preocupaciones concretas, una por día. Ella nos lleva siempre a su Hijo.' },
      books: [],
    },
  },
  {
    id: 'immaculate',
    name: 'Inmaculada Concepción',
    summary: 'Preparación a la solemnidad del 8 de diciembre.',
    priority: 65,
    rule: { kind: 'celebration', id: 'immaculate-conception', before: 9, after: 0 },
    accent: A('#3A2F86', '#0F1030', '#A99BFF'),
    art: 'novena:inmaculada-concepcion',
    start: { title: 'Novena a la Inmaculada', body: 'Nueve días para preparar la solemnidad de la Inmaculada Concepción.' },
    content: {
      prayers: ['ave-maria', 'salve', 'magnificat'],
      novenas: ['inmaculada-concepcion'],
      devotions: [{ title: 'Santo Rosario', href: '/rosario/' }],
      readings: [{ label: 'La mujer y la serpiente', ref: 'Gn 3,9-15.20' }, { label: 'La Anunciación', ref: 'Lc 1,26-38' }],
      reflection: { title: 'Llena de gracia', text: 'Pide por intercesión de María un corazón limpio y disponible, como el suyo, para la venida del Señor.' },
      books: [],
    },
  },
  {
    id: 'sacred-heart',
    name: 'Sagrado Corazón de Jesús',
    summary: 'Los días previos a la solemnidad del Sagrado Corazón.',
    priority: 60,
    rule: { kind: 'celebration', id: 'sacred-heart', before: 9, after: 0 },
    accent: A('#6A3A3A', '#1E1028', '#E2B866'),
    art: 'novena:sagrado-corazon',
    start: { title: 'Novena al Sagrado Corazón', body: 'Nueve días para preparar la solemnidad del Sagrado Corazón de Jesús.' },
    content: {
      prayers: ['consagracion-sagrado-corazon', 'acto-de-reparacion-sagrado-corazon', 'jaculatorias-sagrado-corazon'],
      novenas: ['sagrado-corazon'],
      devotions: [],
      readings: [{ label: 'El pastor que busca', ref: 'Ez 34,11-16' }, { label: 'Venid a mí', ref: 'Mt 11,25-30' }, { label: 'El costado abierto', ref: 'Jn 19,31-37' }],
      reflection: { title: 'Un corazón manso y humilde', text: 'Contempla el corazón de Cristo abierto por amor. Pídele que ensanche el tuyo para acoger a quien menos esperas.' },
      books: [],
    },
  },
  {
    id: 'christ-king',
    name: 'Cristo Rey del Universo',
    summary: 'Última semana del año litúrgico: Cristo, principio y fin de todo.',
    priority: 55,
    rule: { kind: 'celebration', id: 'christ-king', before: 6, after: 0 },
    accent: A('#4B3FA0', '#14183A', '#E2B866'),
    art: 'novena:cristo-rey',
    start: { title: 'Última semana del año litúrgico', body: 'Esta semana termina el año de la Iglesia con la solemnidad de Cristo Rey.' },
    content: {
      prayers: ['acto-de-adoracion', 'credo-niceno'],
      novenas: ['cristo-rey'],
      devotions: [],
      readings: [{ label: 'El juicio de las naciones', ref: 'Mt 25,31-46' }, { label: 'Mi reino no es de este mundo', ref: 'Jn 18,33-37' }],
      reflection: { title: 'Cristo reina sirviendo', text: 'Su trono es la cruz. Revisa el año que termina y ofrécele lo vivido, lo cumplido y lo que quedó a medias.' },
      books: [],
    },
  },
  {
    id: 'souls',
    name: 'Fieles difuntos',
    summary: 'Del 1 al 8 de noviembre: Todos los Santos y oración por los difuntos.',
    priority: 65,
    rule: { kind: 'celebration', id: 'all-saints', before: 0, after: 7 },
    accent: A('#2A3A7A', '#120F2E', '#A99BFF'),
    art: 'novena:por-los-difuntos',
    start: { title: 'Todos los Santos y fieles difuntos', body: 'Estos días la Iglesia reza especialmente por los difuntos. Encomienda a los tuyos.' },
    content: {
      prayers: ['requiem-aeternam', 'de-profundis', 'oracion-por-un-difunto', 'oracion-por-un-familiar-fallecido'],
      novenas: ['por-los-difuntos'],
      devotions: [],
      readings: [{ label: 'Las almas de los justos', ref: 'Sb 3,1-9' }, { label: 'Yo soy la resurrección', ref: 'Jn 11,17-27' }, { label: 'La esperanza', ref: '1 Ts 4,13-18' }],
      reflection: { title: 'Comunión de los santos', text: 'Rezar por los difuntos es un acto de amor que no caduca. Nombra en voz alta a los tuyos y ofrece por ellos una Misa o un Rosario.' },
      books: [],
    },
  },
];

// ── Resolución desde el calendario ─────────────────────────────────────────

export interface SeasonRange {
  start: string;
  end: string;
}
export interface ActiveSeason {
  def: SeasonDef;
  range: SeasonRange;
  /** Día en la temporada (1 = primer día) y duración */
  dayIndex: number;
  length: number;
  isFirstDay: boolean;
}

const calOk = (def: SeasonDef, options: LiturgyOptions) => !def.calendars || def.calendars.includes(options.calendar ?? 'general');
const dateOfCelebration = (id: string, iso: string, options: LiturgyOptions): string | null => {
  const y = Number(iso.slice(0, 4));
  for (const yy of [y, y + 1, y - 1]) {
    const hit = celebrationsOfYear(yy, options).find((c) => c.celebration.id === id);
    if (hit && Math.abs(Date.parse(hit.date) - Date.parse(iso)) < 400 * 86400000) {
      // la del año civil de la fecha tiene prioridad (primer intento)
      return hit.date;
    }
  }
  return null;
};

function ruleMatches(def: SeasonDef, iso: string, options: LiturgyOptions): boolean {
  const r = def.rule;
  if (r.kind === 'day') return r.test(liturgicalDay(iso, options), iso);
  if (r.kind === 'celebration') {
    const feast = dateOfCelebration(r.id, iso, options);
    return !!feast && iso >= shiftIso(feast, -r.before) && iso <= shiftIso(feast, r.after);
  }
  const y = Number(iso.slice(0, 4));
  const e = easterSunday(y);
  return iso >= shiftIso(e, r.from) && iso <= shiftIso(e, r.to);
}

/** Temporadas activas en una fecha, la de mayor prioridad primero. */
export function activeSeasons(iso: string, options: LiturgyOptions = {}, defs: SeasonDef[] = SEASONS): ActiveSeason[] {
  const out: ActiveSeason[] = [];
  for (const def of defs) {
    if (!calOk(def, options) || !ruleMatches(def, iso, options)) continue;
    let start = iso;
    let end = iso;
    for (let i = 0; i < 130 && ruleMatches(def, shiftIso(start, -1), options); i++) start = shiftIso(start, -1);
    for (let i = 0; i < 130 && ruleMatches(def, shiftIso(end, 1), options); i++) end = shiftIso(end, 1);
    const dayIndex = Math.round((Date.parse(iso) - Date.parse(start)) / 86400000) + 1;
    const length = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
    out.push({ def, range: { start, end }, dayIndex, length, isFirstDay: iso === start });
  }
  return out.sort((a, b) => b.def.priority - a.def.priority);
}

/** Temporadas que comienzan en la fecha (para avisos de «inicio de tiempos»). */
export const seasonsStartingOn = (iso: string, options: LiturgyOptions = {}, defs: SeasonDef[] = SEASONS) => activeSeasons(iso, options, defs).filter((a) => a.isFirstDay);

export const seasonById = (id: string) => SEASONS.find((s) => s.id === id) ?? null;
