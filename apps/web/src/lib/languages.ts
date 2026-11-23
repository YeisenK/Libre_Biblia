/** Español primero (ADR-018, DISENO_V2 punto 8): por defecto solo se ven las Biblias en español y la Vulgata latina. */
export interface HasLang {
  code: string;
  language?: string;
}

/** ¿Es una Biblia que se muestra siempre? Español, o latín (la Vulgata, como referencia). */
export function isPrimaryLanguage(v: HasLang): boolean {
  const l = (v.language ?? '').toLowerCase();
  return l.startsWith('es') || l === 'la' || l.startsWith('la-') || l === 'lat';
}

/**
 * Biblias visibles según el ajuste. Si no hay ninguna en español/latín instalada, se muestran todas
 * (mejor eso que una app vacía).
 */
export function visibleVersions<T extends HasLang>(list: T[], showOther: boolean): T[] {
  if (showOther) return list;
  const primary = list.filter(isPrimaryLanguage);
  return primary.length ? primary : list;
}

/** Elige la primera versión candidata que siga visible; si ninguna, la primera en español (o la primera). */
export function pickVisibleVersion<T extends HasLang>(candidates: (string | null | undefined)[], visible: T[]): string | null {
  for (const c of candidates) if (c && visible.some((v) => v.code === c)) return c;
  return (visible.find((v) => (v.language ?? '').toLowerCase().startsWith('es')) ?? visible[0])?.code ?? null;
}
