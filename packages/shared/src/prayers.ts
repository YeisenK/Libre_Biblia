/**
 * Oraciones, novenas, Santo Rosario y audio de oración.
 *
 * El contenido vive en paquetes (`PrayersPack`, `AudioPack`) igual que las Biblias
 * y los documentos: el catálogo se amplía publicando otro paquete, sin tocar la app.
 * Los textos son Markdown seguro (párrafos, **negrita**, *cursiva*, listas, citas `>`).
 */
import type { Authority, PackSource } from './packs';

/**
 * Naturaleza eclesial del texto. Se muestra siempre, para no confundir una devoción
 * privada con la liturgia ni presentarla como obligación.
 * - `liturgical`: forma parte de la liturgia (Misa, Liturgia de las Horas) o es su texto.
 * - `prayer`: oración tradicional de la Iglesia de uso común (Padre Nuestro, Ave María, actos…).
 * - `devotion`: devoción privada aprobada o tradicional (coronillas, consagraciones…).
 * - `popular_piety`: práctica de piedad popular (novenas, ejercicios…), Directorio sobre la piedad popular (2001).
 */
/**
 * Naturaleza eclesial del texto (ADR-016, ampliado en Lux 0.5):
 * - liturgical: texto de la liturgia; prayer: oración tradicional de la Iglesia;
 * - devotion: devoción privada; popular_piety: piedad popular;
 * - saint: oración compuesta por un santo (atribución documentada en `attribution`/`sources`);
 * - contemporary: oración moderna de autor conocido (con permiso o dominio público);
 * - original: composición propia de Lux para una circunstancia concreta (no tradicional ni aprobada).
 */
export type PrayerNature = 'liturgical' | 'prayer' | 'devotion' | 'popular_piety' | 'saint' | 'contemporary' | 'original';

/** Momento del día para el que se propone una oración o una rutina. */
export type PrayerMoment = 'morning' | 'midday' | 'afternoon' | 'night' | 'any';

export interface SourceRef {
  label: string;
  url?: string;
}

/** Versión legítima alternativa de una oración (p. ej. Padre Nuestro de España / de América). */
export interface PrayerVariant {
  id: string;
  label: string;
  text: string;
  note?: string;
}

export interface Prayer {
  /** Único y estable: "padre-nuestro". Lo usan rutinas, favoritos y audio. */
  id: string;
  title: string;
  altTitles?: string[];
  /** ids de `PrayerCategory` */
  categories: string[];
  moments?: PrayerMoment[];
  nature: PrayerNature;
  /** Texto principal (Markdown seguro). Las respuestas de diálogo con «V.» / «R.». */
  text: string;
  /** Versión latina, si es tradicional */
  latin?: string;
  variants?: PrayerVariant[];
  /** Origen, significado y uso (Markdown seguro). Sin atribuciones dudosas. */
  context?: string;
  /** Autor o tradición, solo cuando es seguro («San Francisco de Asís» no se atribuye a la «Oración por la paz»). */
  attribution?: string;
  /** Indicación litúrgica o de uso: «En el tiempo pascual se reza el Regina Coeli en lugar del Ángelus». */
  rubric?: string;
  sources?: SourceRef[];
  /** Referencias bíblicas en formato español: "Lc 1,28" */
  scripture?: string[];
  saints?: string[];
  tags?: string[];
  /** Duración aproximada en minutos */
  minutes?: number;
}

export interface PrayerCategory {
  id: string;
  title: string;
  description?: string;
  /** Clave de icono de la app: "cross" | "sun" | "moon" | "rosary" | "dove" | "heart" | "star" | "candle" | "shield" | "bread" | "family" | "hours" | "book" | "angel" | "crown" | "hands" */
  icon?: string;
  order: number;
}

/** Paso de una oración compuesta: una oración del catálogo (opcionalmente repetida) o un texto propio. */
export type PrayerStep =
  | { prayer: string; times?: number; title?: string }
  | { title?: string; text: string };

export interface NovenaDay {
  day: number; // 1..n
  title?: string;
  /** Referencia bíblica opcional para meditar: "Lc 1,26-38" */
  reading?: string;
  /** Meditación del día (Markdown seguro) */
  reflection: string;
  /** Oración propia del día (Markdown seguro) */
  prayer: string;
}

export type NovenaGroup = 'marian' | 'angels' | 'christ' | 'holy_spirit' | 'saints' | 'souls' | 'other' | 'virtues' | 'work_vocation' | 'family' | 'health';

export interface Novena {
  id: string;
  title: string;
  group: NovenaGroup;
  /** Una o dos frases para la tarjeta */
  description: string;
  /** Representación visual: icono de la app y color (hex) del motivo */
  image?: { icon: string; tint?: string };
  /** Origen e historia (Markdown seguro) */
  introduction: string;
  /** Finalidad de la devoción (Markdown seguro) */
  purpose: string;
  nature: PrayerNature;
  /** Fiesta relacionada; la novena suele empezar 9 días antes */
  feast?: { month: number; day: number; label: string };
  opening: PrayerStep[];
  days: NovenaDay[];
  closing: PrayerStep[];
  attribution?: string;
  sources?: SourceRef[];
  saints?: string[];
  tags?: string[];
}

export type MysterySet = 'joyful' | 'luminous' | 'sorrowful' | 'glorious';

export interface Mystery {
  set: MysterySet;
  n: 1 | 2 | 3 | 4 | 5;
  title: string;
  /** Pasaje bíblico en formato español ("Lc 1,26-38"); el texto se lee de la Biblia instalada */
  ref: string;
  /** Fruto tradicional del misterio («La humildad») */
  fruit?: string;
  /** Reflexión breve (Markdown seguro) */
  reflection: string;
  /** Enseñanza principal en una frase */
  teaching: string;
}

export interface MysterySetInfo {
  set: MysterySet;
  title: string; // "Misterios gozosos"
  /** Días tradicionales (0 = domingo) */
  weekdays: number[];
  description: string;
}

/** Oraciones adicionales configurables del Rosario (no alteran su orden esencial). */
export interface RosaryExtra {
  id: string; // "fatima", "jaculatoria-maria", "letania", "san-miguel", "intenciones-papa"
  title: string;
  /** Dónde se reza: tras cada decena o al final */
  place: 'after_decade' | 'final' | 'opening';
  prayer: string; // id de Prayer
  defaultOn: boolean;
  note?: string;
}

export interface RosaryData {
  sets: MysterySetInfo[];
  mysteries: Mystery[];
  extras: RosaryExtra[];
  /** Introducción y nota sobre su naturaleza (Markdown seguro) */
  introduction: string;
}

/** Rutina propuesta por el paquete; el usuario la copia y la adapta. */
export interface RoutineTemplate {
  id: string;
  title: string;
  moment: PrayerMoment;
  description?: string;
  /** Claves de elementos: "prayer:<id>", "novena:<id>", "rosary", "gospel", "verse" */
  items: string[];
}

/** Prácticas guiadas (examen de conciencia, guía de la confesión, adoración, vía crucis…): pasos con oraciones del catálogo, pasajes por referencia y textos propios. */
export type PracticeKind = 'examen' | 'confession' | 'adoration' | 'stations';
export type PracticeStepKind = 'text' | 'prayer' | 'reading' | 'reflection' | 'silence' | 'questions' | 'station';

export interface PracticeQuestion {
  text: string;
  /** Números del Catecismo en que se apoya («2083-2141») */
  ccc?: string;
}

export interface PracticeStep {
  id: string;
  kind: PracticeStepKind;
  title: string;
  /** Texto en Markdown seguro (introducción, reflexión, meditación) */
  text?: string;
  /** id de una oración del catálogo */
  prayer?: string;
  /** Referencia bíblica en formato español; el texto se lee de la Biblia instalada */
  reading?: string;
  questions?: PracticeQuestion[];
  /** Estaciones: versículo y respuesta tradicionales */
  /** Silencio: duración orientativa en segundos */
  seconds?: number;
  /** Silencio: peso relativo al repartir el tiempo de una sesión de duración elegible */
  weight?: number;
  /** Solo se incluye si la sesión dura al menos estos minutos */
  minDuration?: number;
  ccc?: string;
}

export interface Practice {
  id: string;
  kind: PracticeKind;
  title: string;
  description: string;
  /** Agrupación en la pantalla de la práctica (p. ej. «Según los mandamientos») */
  group?: string;
  nature: PrayerNature;
  attribution?: string;
  rubric?: string;
  sources?: SourceRef[];
  minutes?: number;
  ccc?: string[];
  steps: PracticeStep[];
}

export interface PrayersPack {
  format: number;
  kind: 'prayers';
  id: string;
  version: string;
  meta: {
    title: string;
    description?: string;
    authority: Authority;
    language: string;
    source: PackSource;
  };
  categories: PrayerCategory[];
  prayers: Prayer[];
  novenas: Novena[];
  rosary?: RosaryData;
  routines?: RoutineTemplate[];
  practices?: Practice[];
}

/** Clip de audio de una oración generado con una voz concreta. */
export interface AudioClip {
  /** "prayer:padre-nuestro", "mystery:joyful-1:announce", "mystery:joyful-1:reflection", "rosary:cue:<id>" */
  key: string;
  mime: 'audio/ogg' | 'audio/mpeg' | 'audio/mp4';
  /** base64 del archivo */
  data: string;
  seconds: number;
  /** sha256 del texto leído, para detectar audios desfasados respecto al paquete de oraciones */
  textSha256?: string;
}

export interface AudioPack {
  format: number;
  kind: 'audio';
  id: string; // "audio.oraciones.fraile"
  version: string;
  meta: {
    title: string;
    description?: string;
    authority: Authority;
    language: string;
    voice: { id: string; label: string; description?: string };
    /** Paquete de oraciones al que acompaña */
    forPack: string;
    generator: string; // "Juglar (Qwen3-TTS)"
    source: PackSource;
  };
  clips: AudioClip[];
}

export const MYSTERY_SET_LABEL: Record<MysterySet, string> = {
  joyful: 'Misterios gozosos',
  luminous: 'Misterios luminosos',
  sorrowful: 'Misterios dolorosos',
  glorious: 'Misterios gloriosos',
};

/** Distribución tradicional (Rosarium Virginis Mariae, 38). 0 = domingo. */
export function mysterySetForWeekday(weekday: number): MysterySet {
  return (['glorious', 'joyful', 'sorrowful', 'glorious', 'luminous', 'sorrowful', 'joyful'] as const)[((weekday % 7) + 7) % 7]!;
}

export const NATURE_LABEL: Record<PrayerNature, string> = {
  liturgical: 'Litúrgica',
  prayer: 'Oración de la Iglesia',
  devotion: 'Devoción privada',
  popular_piety: 'Piedad popular',
  saint: 'Oración de un santo',
  contemporary: 'Oración contemporánea',
  original: 'Composición de Lux',
};

export const NATURE_HELP: Record<PrayerNature, string> = {
  liturgical: 'Texto de la liturgia de la Iglesia.',
  prayer: 'Oración tradicional de uso común en la Iglesia.',
  devotion: 'Devoción privada: recomendable, pero libre; no es obligatoria ni sustituye la liturgia o los sacramentos.',
  popular_piety: 'Práctica de piedad popular: libre y voluntaria; no sustituye la liturgia ni los sacramentos.',
  saint: 'Oración escrita por un santo o atribuida a él según las fuentes indicadas.',
  contemporary: 'Oración moderna de autor conocido.',
  original: 'Texto redactado para Lux como ayuda para orar en esta circunstancia. No es una oración tradicional ni un texto aprobado por la Iglesia.',
};

export const NOVENA_GROUP_LABEL: Record<NovenaGroup, string> = {
  marian: 'Marianas',
  angels: 'Ángeles y arcángeles',
  christ: 'Jesucristo',
  holy_spirit: 'Espíritu Santo',
  saints: 'Santos',
  souls: 'Difuntos y duelo',
  virtues: 'Virtudes y combate espiritual',
  work_vocation: 'Trabajo, estudios y vocación',
  family: 'Amor, matrimonio y familia',
  health: 'Salud y dificultades',
  other: 'Otras',
};
