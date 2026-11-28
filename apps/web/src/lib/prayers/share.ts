/** Texto para compartir una oración o una novena. Conserva siempre la naturaleza (p. ej. «Composición de Lux») y la fuente. */
import { NATURE_LABEL, type Novena, type Prayer } from '@bc/shared';

/** Texto plano (sin marcas de Markdown). */
export function plainForShare(md: string): string {
  return md.replace(/\*\*|__/g, '').replace(/(^|[\s(])[*_]([^*_\n]+)[*_]/g, '$1$2').replace(/^\s*>\s?/gm, '');
}

const FOOT = '— Lux';

export function prayerShareText(p: Prayer, text: string = p.text): string {
  const meta = [NATURE_LABEL[p.nature], p.attribution && p.attribution !== NATURE_LABEL[p.nature] ? p.attribution : null].filter(Boolean).join(' · ');
  return `${p.title}\n(${meta})\n\n${plainForShare(text)}\n\n${FOOT}`;
}

export function novenaShareText(n: Novena, intention?: string): string {
  const lines = [n.title, `(${NATURE_LABEL[n.nature]} · ${n.days.length} días)`, '', n.description];
  if (n.feast) lines.push(`Fiesta: ${n.feast.label}.`);
  if (intention?.trim()) lines.push('', `Mi intención: ${intention.trim()}`);
  lines.push('', n.days.map((d) => `Día ${d.day}${d.title ? `: ${d.title}` : ''}${d.reading ? ` (${d.reading})` : ''}`).join('\n'), '', FOOT);
  return lines.join('\n');
}
