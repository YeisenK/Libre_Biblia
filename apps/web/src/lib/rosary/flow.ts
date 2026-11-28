/**
 * Motor puro del Santo Rosario: genera la lista ordenada de pasos del rezo.
 * No depende de React ni de la base de datos; lo usan por igual la modalidad
 * digital (cuentas en pantalla) y la física (con el rosario del usuario).
 */
import { MYSTERY_SET_LABEL, mysterySetForWeekday, type Mystery, type MysterySet, type RosaryData } from '@bc/shared';
import { todayIso } from '../daily/date';

export type StepKind = 'prayer' | 'announce' | 'passage' | 'reflection' | 'cue';
export type BeadType = 'crucifix' | 'large' | 'small' | 'centre';

export interface RosaryOptions {
  reflections: boolean;
  passages: boolean;
  /** ids de `RosaryExtra` activados */
  extras: string[];
  /**
   * Rosario físico: las Ave Marías de cada decena (y las tres iniciales) son UN solo paso
   * («reza diez Ave Marías»); el usuario las cuenta con sus cuentas y no pulsa Siguiente en cada una.
   */
  grouped?: boolean;
}

export interface RosaryStep {
  /** Estable entre ejecuciones con las mismas opciones: «d3-ave-7» */
  id: string;
  kind: StepKind;
  prayerId?: string;
  mystery?: Mystery;
  decade?: number;
  aveIndex?: number;
  bead: { index: number; type: BeadType };
  title: string;
  instruction: string;
  physicalCue: string;
  audioKey: string;
  /** Pista breve (p. ej. «por la fe») */
  hint?: string;
}

export const ROSARY_PRAYER = {
  cross: 'senal-de-la-cruz',
  creed: 'credo-apostoles',
  ourFather: 'padre-nuestro',
  hailMary: 'ave-maria',
  glory: 'gloria',
  salve: 'salve',
} as const;

const PRAYER_TITLE: Record<string, string> = {
  'senal-de-la-cruz': 'Señal de la cruz',
  'credo-apostoles': 'Credo de los Apóstoles',
  'padre-nuestro': 'Padre Nuestro',
  'ave-maria': 'Ave María',
  gloria: 'Gloria',
  salve: 'Salve',
};

const ORDINAL = ['', 'Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto'];
const ADJ: Record<MysterySet, string> = { joyful: 'gozoso', luminous: 'luminoso', sorrowful: 'doloroso', glorious: 'glorioso' };
const THEOLOGICAL = ['la fe', 'la esperanza', 'la caridad'];

/** «Tercer misterio doloroso» */
export function mysteryHeading(set: MysterySet, n: number): string {
  return `${ORDINAL[n] ?? `${n}.º`} misterio ${ADJ[set]}`;
}

/** Disposición de las cuentas: crucifijo (0), grande (1), 3 pequeñas (2–4), medalla (5), y 5 × (grande + 10 pequeñas). */
export const BEAD_COUNT = 6 + 5 * 11;
export const CENTRE_BEAD = 5;
export const decadeLargeBead = (decade: number) => 6 + 11 * (decade - 1);
export const decadeSmallBead = (decade: number, ave: number) => decadeLargeBead(decade) + ave;

export function buildSteps(rosary: RosaryData, set: MysterySet, opts: RosaryOptions): RosaryStep[] {
  const steps: RosaryStep[] = [];
  const mysteries = rosary.mysteries.filter((m) => m.set === set).sort((a, b) => a.n - b.n);
  const extras = rosary.extras.filter((e) => opts.extras.includes(e.id));
  const titleOf = (pid: string) => PRAYER_TITLE[pid] ?? rosary.extras.find((e) => e.prayer === pid)?.title ?? pid;
  const extraTitle = (e: { title: string; prayer: string }) => e.title || titleOf(e.prayer);

  const prayer = (id: string, pid: string, bead: RosaryStep['bead'], instruction: string, physicalCue: string, extra: Partial<RosaryStep> = {}) =>
    steps.push({ id, kind: 'prayer', prayerId: pid, bead, title: titleOf(pid), instruction, physicalCue, audioKey: `prayer:${pid}`, ...extra });

  const crucifix = { index: 0, type: 'crucifix' as const };
  const centre = { index: CENTRE_BEAD, type: 'centre' as const };

  prayer('open-cross', ROSARY_PRAYER.cross, crucifix, 'Comienza con la señal de la cruz', 'Toma el crucifijo y, con él en la mano, haz la señal de la cruz.');
  for (const e of extras.filter((x) => x.place === 'opening')) {
    prayer(`open-${e.id}`, e.prayer, crucifix, `Ahora reza ${extraTitle(e)}`, `Con el crucifijo en la mano, reza ${extraTitle(e)}.`, { title: extraTitle(e) });
  }
  prayer('open-creed', ROSARY_PRAYER.creed, crucifix, 'Ahora reza el Credo', 'Con el crucifijo en la mano, reza el Credo de los Apóstoles.');
  prayer('open-pn', ROSARY_PRAYER.ourFather, { index: 1, type: 'large' }, 'Ahora reza el Padre Nuestro', 'Pasa a la cuenta grande que sigue al crucifijo y reza el Padre Nuestro.');
  if (opts.grouped) {
    prayer(
      'open-aves',
      ROSARY_PRAYER.hailMary,
      { index: 4, type: 'small' },
      'Reza tres Ave Marías',
      'Recorre las tres cuentas pequeñas que siguen y reza un Ave María en cada una. Al terminar la tercera, pulsa Siguiente.',
      { title: 'Tres Ave Marías', hint: 'Tradicionalmente por la fe, la esperanza y la caridad' },
    );
  }
  for (let k = 1; k <= (opts.grouped ? 0 : 3); k++) {
    const virtue = THEOLOGICAL[k - 1]!;
    prayer(
      `open-ave-${k}`,
      ROSARY_PRAYER.hailMary,
      { index: 1 + k, type: 'small' },
      `Ahora reza el Ave María (${k} de 3)`,
      k === 1 ? 'Pasa a la primera cuenta pequeña y reza el Ave María.' : `Pasa a la ${k === 2 ? 'segunda' : 'tercera'} cuenta pequeña y reza el Ave María.`,
      { aveIndex: k, hint: `Tradicionalmente por ${virtue}` },
    );
  }
  prayer('open-gloria', ROSARY_PRAYER.glory, centre, 'Ahora reza el Gloria', 'Has terminado las tres Ave Marías. Ahora reza el Gloria.');

  for (const m of mysteries) {
    const d = m.n;
    const base = `d${d}`;
    const heading = mysteryHeading(set, d);
    const large = { index: decadeLargeBead(d), type: 'large' as const };
    const lastSmall = { index: decadeSmallBead(d, 10), type: 'small' as const };
    const mk = (id: string, kind: StepKind, bead: RosaryStep['bead'], s: Pick<RosaryStep, 'title' | 'instruction' | 'physicalCue' | 'audioKey'>, extra: Partial<RosaryStep> = {}) =>
      steps.push({ id: `${base}-${id}`, kind, mystery: m, decade: d, bead, ...s, ...extra });

    mk('announce', 'announce', large, {
      title: m.title,
      instruction: `${heading}: ${m.title}`,
      physicalCue: d === 1 ? `Pasa a la medalla y a la cuenta grande que le sigue. Anuncia el ${heading.toLowerCase()}.` : `Pasa a la siguiente cuenta grande. Anuncia el ${heading.toLowerCase()}.`,
      audioKey: `mystery:${set}-${d}:announce`,
    });
    if (opts.passages && m.ref) {
      mk('passage', 'passage', large, { title: m.ref, instruction: 'Lee con calma el pasaje', physicalCue: `Lee con calma el pasaje: ${m.ref}.`, audioKey: `mystery:${set}-${d}:passage` });
    }
    if (opts.reflections && m.reflection) {
      mk('reflection', 'reflection', large, { title: 'Para meditar', instruction: 'Medita este misterio', physicalCue: 'Medita unos instantes este misterio.', audioKey: `mystery:${set}-${d}:reflection` });
    }
    mk('pn', 'prayer', large, {
      title: titleOf(ROSARY_PRAYER.ourFather),
      instruction: 'Ahora reza el Padre Nuestro',
      physicalCue: d === 1 ? 'Toma la cuenta grande que sigue a la medalla y reza el Padre Nuestro.' : 'Toma la siguiente cuenta grande y reza el Padre Nuestro.',
      audioKey: `prayer:${ROSARY_PRAYER.ourFather}`,
    }, { prayerId: ROSARY_PRAYER.ourFather });
    if (opts.grouped) {
      mk('aves', 'prayer', lastSmall, {
        title: 'Diez Ave Marías',
        instruction: 'Reza diez Ave Marías',
        physicalCue: 'Recorre las diez cuentas pequeñas y reza un Ave María en cada una, contemplando el misterio. Al llegar a la décima, pulsa Siguiente.',
        audioKey: `prayer:${ROSARY_PRAYER.hailMary}`,
      }, { prayerId: ROSARY_PRAYER.hailMary });
    }
    for (let k = 1; k <= (opts.grouped ? 0 : 10); k++) {
      mk(`ave-${k}`, 'prayer', { index: decadeSmallBead(d, k), type: 'small' }, {
        title: titleOf(ROSARY_PRAYER.hailMary),
        instruction: `Ahora reza el Ave María (${k} de 10)`,
        physicalCue: k === 1 ? 'Pasa a la primera cuenta pequeña y reza el Ave María.' : k === 10 ? 'Pasa a la última cuenta pequeña (la décima) y reza el Ave María.' : `Pasa a la cuenta pequeña ${k} de 10 y reza el Ave María.`,
        audioKey: `prayer:${ROSARY_PRAYER.hailMary}`,
      }, { prayerId: ROSARY_PRAYER.hailMary, aveIndex: k });
    }
    mk('gloria', 'prayer', lastSmall, {
      title: titleOf(ROSARY_PRAYER.glory),
      instruction: 'Ahora reza el Gloria',
      physicalCue: 'Has terminado las diez Ave Marías. Ahora reza el Gloria.',
      audioKey: `prayer:${ROSARY_PRAYER.glory}`,
    }, { prayerId: ROSARY_PRAYER.glory });
    for (const e of extras.filter((x) => x.place === 'after_decade')) {
      mk(`extra-${e.id}`, 'prayer', lastSmall, {
        title: extraTitle(e),
        instruction: `Ahora reza ${extraTitle(e)}`,
        physicalCue: `Sin mover las cuentas, reza ${extraTitle(e)}.`,
        audioKey: `prayer:${e.prayer}`,
      }, { prayerId: e.prayer });
    }
  }

  for (const e of extras.filter((x) => x.place === 'final')) {
    prayer(`final-${e.id}`, e.prayer, centre, `Ahora reza ${extraTitle(e)}`, `Sosteniendo la medalla, reza ${extraTitle(e)}.`, { title: extraTitle(e) });
  }
  prayer('salve', ROSARY_PRAYER.salve, centre, 'Ahora reza la Salve', 'Sosteniendo la medalla, reza la Salve.');
  prayer('close-cross', ROSARY_PRAYER.cross, crucifix, 'Termina con la señal de la cruz', 'Toma el crucifijo y haz la señal de la cruz para terminar.');
  return steps;
}

/** Firma de las opciones que determinan el recorrido (para reanudar sin desalinear). */
export function optionsKey(o: RosaryOptions): string {
  return `r${o.reflections ? 1 : 0}p${o.passages ? 1 : 0}x${[...new Set(o.extras)].sort().join('+')}${o.grouped ? '|g1' : ''}`;
}

export function parseOptionsKey(key: string): RosaryOptions | null {
  const m = /^r([01])p([01])x([^|]*)(\|g1)?$/.exec(key);
  if (!m) return null;
  return { reflections: m[1] === '1', passages: m[2] === '1', extras: m[3] ? m[3].split('+') : [], ...(m[4] ? { grouped: true } : {}) };
}

export interface RosaryProgress {
  /** 1-based */
  current: number;
  total: number;
  /** 0..1 */
  fraction: number;
  decade: number | null;
  /** Paso dentro del misterio (1-based) y total de pasos del misterio */
  inDecade: number;
  decadeTotal: number;
  decadeFraction: number;
  /** Ave Marías rezadas hasta este paso (incluida la actual) en el misterio */
  aveIndex: number | null;
}

export function progressOf(steps: RosaryStep[], i: number): RosaryProgress {
  const total = steps.length;
  const idx = Math.max(0, Math.min(total - 1, i));
  const s = steps[idx];
  const decade = s?.decade ?? null;
  let inDecade = 0;
  let decadeTotal = 0;
  if (decade !== null) {
    const idxs = steps.flatMap((x, k) => (x.decade === decade ? [k] : []));
    decadeTotal = idxs.length;
    inDecade = idxs.indexOf(idx) + 1;
  }
  return {
    current: idx + 1,
    total,
    fraction: total ? (idx + 1) / total : 0,
    decade,
    inDecade,
    decadeTotal,
    decadeFraction: decadeTotal ? inDecade / decadeTotal : 0,
    aveIndex: s?.aveIndex ?? null,
  };
}

/** Índice del primer paso de un misterio (1–5); -1 si no existe. */
export function firstStepOfDecade(steps: RosaryStep[], decade: number): number {
  return steps.findIndex((s) => s.decade === decade);
}

/**
 * Misterio (1–5) en el que está un paso, o null si está en el inicio o el final.
 * El comienzo (señal, Credo…) cuenta como 0 y el final como 6.
 */
export function phaseOf(steps: RosaryStep[], i: number): number {
  const s = steps[i];
  if (!s) return 0;
  if (s.decade) return s.decade;
  return i < firstStepOfDecade(steps, 1) ? 0 : 6;
}

/** Cuenta mayor alcanzada hasta el paso i (las cuentas con índice menor ya se rezaron). */
export function reachedBead(steps: RosaryStep[], i: number): number {
  let max = 0;
  for (let k = 0; k <= i && k < steps.length; k++) max = Math.max(max, steps[k]!.bead.index);
  return max;
}

/** ¿Es el tramo final (ya fuera de las decenas)? */
export const isClosing = (steps: RosaryStep[], i: number) => phaseOf(steps, i) === 6;

/** Misterios del día según el día de la semana local (o de `tz` si existe). */
export function todaySet(date: Date = new Date(), tz?: string | null): MysterySet {
  const [y, m, d] = todayIso(tz, date).split('-').map(Number) as [number, number, number];
  return mysterySetForWeekday(new Date(Date.UTC(y, m - 1, d)).getUTCDay());
}

export const SET_ORDER: MysterySet[] = ['joyful', 'luminous', 'sorrowful', 'glorious'];
export const setTitle = (s: MysterySet) => MYSTERY_SET_LABEL[s];

/** Todo el motor necesita saber de los ajustes: pasa de `UserSettings` a opciones. */
export function optionsFromSettings(
  s: { rosaryReflections: boolean; rosaryPassages: boolean; rosaryExtras: string[]; rosaryMode?: 'digital' | 'physical' },
  mode: 'digital' | 'physical' | undefined = s.rosaryMode,
): RosaryOptions {
  return { reflections: s.rosaryReflections, passages: s.rosaryPassages, extras: s.rosaryExtras, ...(mode === 'physical' ? { grouped: true } : {}) };
}
