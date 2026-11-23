import type { LiturgicalColor, LiturgicalDay } from '@bc/shared';

const SWATCH: Record<LiturgicalColor, string> = { white: '#f3efe2', red: '#b3261e', green: '#2e7d32', violet: '#5b3d9a', rose: '#e08aa8' };
const TYPE: Record<string, string> = { solemnity: 'Solemnidad', feast: 'Fiesta', memorial: 'Memoria', optional: 'Memoria libre', sunday: 'Domingo', special: '' };

export function liturgyLine(d: LiturgicalDay): string {
  const parts: string[] = [d.seasonName];
  if (d.week && d.season !== 'triduum' && d.season !== 'christmas') parts.push(`semana ${d.week}`);
  parts.push(d.isSunday ? `ciclo ${d.sundayCycle}` : `ciclo ferial ${d.weekdayCycle}`);
  return parts.join(' · ');
}

/** Cabecera litúrgica: tiempo, semana, celebración y marca del color litúrgico. */
export function LiturgyHeader({ day, compact = false }: { day: LiturgicalDay; compact?: boolean }) {
  const type = day.celebration ? TYPE[day.celebration.type] : '';
  return (
    <div data-testid="liturgy-header" className="bg-sacred relative overflow-hidden rounded-2xl">
      <div className="h-1" style={{ backgroundColor: SWATCH[day.color] }} role="img" aria-label={`Color litúrgico: ${day.colorName}`} data-color={day.color} />
      <div className={compact ? 'p-4' : 'p-5'}>
        <p className="text-[12px] font-medium opacity-70">{liturgyLine(day)}</p>
        <p className={`mt-1 font-display leading-[1.12] ${compact ? 'text-[1.4rem]' : 'text-[1.8rem]'}`}>{day.title}</p>
        <p className="mt-2 flex items-center gap-2 text-[13px] opacity-70">
          <span className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white/40" style={{ backgroundColor: SWATCH[day.color] }} aria-hidden />
          {type && `${type} · `}Color litúrgico: {day.colorName.toLowerCase()}
        </p>
      </div>
    </div>
  );
}
