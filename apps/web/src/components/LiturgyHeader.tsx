import type { LiturgicalColor, LiturgicalDay } from '@bc/shared';

const SWATCH: Record<LiturgicalColor, string> = { white: '#f3efe2', red: '#b3261e', green: '#2e7d32', violet: '#5b3d9a', rose: '#e08aa8' };
const TYPE: Record<string, string> = { solemnity: 'Solemnidad', feast: 'Fiesta', memorial: 'Memoria', optional: 'Memoria libre', sunday: 'Domingo', special: '' };

export function liturgyLine(d: LiturgicalDay): string {
  const parts: string[] = [d.seasonName];
  if (d.week && d.season !== 'triduum' && d.season !== 'christmas') parts.push(`semana ${d.week}`);
  parts.push(d.isSunday ? `ciclo ${d.sundayCycle}` : `ciclo ferial ${d.weekdayCycle}`);
  return parts.join(' · ');
}

/** Cabecera litúrgica: tiempo, semana, celebración y franja del color litúrgico. */
export function LiturgyHeader({ day, compact = false }: { day: LiturgicalDay; compact?: boolean }) {
  const type = day.celebration ? TYPE[day.celebration.type] : '';
  return (
    <div data-testid="liturgy-header" className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="h-2.5" style={{ backgroundColor: SWATCH[day.color] }} role="img" aria-label={`Color litúrgico: ${day.colorName}`} data-color={day.color} />
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{liturgyLine(day)}</p>
        <p className={`mt-1 font-serif font-semibold ${compact ? 'text-lg' : 'text-xl'}`}>{day.title}</p>
        <p className="text-sm text-muted">
          {type && `${type} · `}Color litúrgico: {day.colorName.toLowerCase()}
        </p>
      </div>
    </div>
  );
}
