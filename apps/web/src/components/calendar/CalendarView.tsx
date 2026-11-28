'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { getCalendar, MASS_READING_LABEL } from '@bc/shared';
import { useSaintCatalog } from '@/hooks/useSaints';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { useSettings } from '@/hooks/useSettings';
import { useToday } from '@/hooks/useToday';
import { calendarDay, daysOfMonth, type CalendarDayInfo } from '@/lib/calendar/day';
import { formatLongDate, isIsoDate } from '@/lib/daily/date';
import { liturgyOptionsOf, massReadingsOf } from '@/lib/daily/mass';
import { RANK_LABEL, formatMonthDay } from '@/lib/saints/catalog';
import { activeSeasons } from '@/lib/seasons';
import { liturgyLine } from '../LiturgyHeader';
import { ChevronLeft, ChevronRight } from '../Icons';
import { ListGroup, ListRow, Loading, ScreenHeader, Section } from '../ui';
import { LITURGICAL_SWATCH } from './colors';
import { ReadingLinks } from './ReadingLinks';
import { SeasonContentList } from '../seasons/SeasonHighlight';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEK = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const TYPE: Record<string, string> = { solemnity: 'Solemnidad', feast: 'Fiesta', memorial: 'Memoria', optional: 'Memoria libre', sunday: 'Domingo', special: 'Día especial' };

export function CalendarView() {
  const sp = useSearchParams();
  const router = useRouter();
  const today = useToday();
  const { settings } = useSettings();
  const cat = useSaintCatalog().data;
  const dParam = sp.get('d');
  const selected = isIsoDate(dParam) ? dParam : today;
  const options = useMemo(() => liturgyOptionsOf(settings), [settings]);
  const [year, month] = (selected ?? '2000-01').split('-').map(Number) as [number, number];

  const days = useMemo(() => (selected ? daysOfMonth(year, month).map((iso) => calendarDay(iso, options, cat)) : []), [selected, year, month, options, cat]);
  if (!selected || !today) return <Loading />;

  const go = (iso: string) => router.replace(`/calendario/?d=${iso}`, { scroll: false });
  const shiftMonth = (delta: number) => {
    const t = new Date(Date.UTC(year, month - 1 + delta, 1));
    const iso = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-01`;
    go(iso === `${today.slice(0, 8)}01` ? today : iso);
  };
  const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const info = days.find((d) => d.iso === selected) ?? calendarDay(selected, options, cat);
  const cal = getCalendar(settings.calendar);

  return (
    <div data-testid="calendar-view">
      <ScreenHeader title="Calendario litúrgico" subtitle={cal.id === 'general' ? 'Calendario Romano General' : `Propio de ${cal.name}`} />
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="btn !min-h-[44px] !w-11 !px-0" aria-label="Mes anterior" onClick={() => shiftMonth(-1)}><ChevronLeft /></button>
        <h2 className="font-display text-[1.25rem]" aria-live="polite" data-testid="calendar-month">{MONTHS[month - 1]} {year}</h2>
        <button type="button" className="btn !min-h-[44px] !w-11 !px-0" aria-label="Mes siguiente" onClick={() => shiftMonth(1)}><ChevronRight /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={`${MONTHS[month - 1]} ${year}`}>
        {WEEK.map((w) => <div key={w} className="pb-1 text-[12px] font-medium text-muted" role="columnheader">{w}</div>)}
        {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} role="gridcell" aria-hidden />)}
        {days.map((d) => <DayCell key={d.iso} d={d} selected={d.iso === selected} isToday={d.iso === today} onPick={() => go(d.iso)} />)}
      </div>
      <p className="mt-2 text-center text-[12px] text-muted">El punto indica el color litúrgico; el borde, solemnidades y fiestas; la marca inferior, un santo ese día.</p>
      {selected !== today && <div className="mt-2 text-center"><button type="button" className="btn" onClick={() => go(today)}>Ir a hoy</button></div>}
      <DayPanel info={info} />
    </div>
  );
}

function DayCell({ d, selected, isToday, onPick }: { d: CalendarDayInfo; selected: boolean; isToday: boolean; onPick: () => void }) {
  const c = d.day.celebration;
  const major = !!c && c.rank <= 8 && c.type !== 'sunday';
  const label = `${formatLongDate(d.iso).replace(/ de \d{4}$/, '')}. ${d.day.title}. Color ${d.day.colorName.toLowerCase()}.${d.primary ? ` Santo: ${d.primary.saint.name}.` : ''}`;
  return (
    <button
      type="button"
      role="gridcell"
      aria-label={label}
      aria-selected={selected}
      aria-current={isToday ? 'date' : undefined}
      onClick={onPick}
      data-date={d.iso}
      data-color={d.day.color}
      className={`tap relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-[15px] ${selected ? 'bg-accent/20 ring-1 ring-accent/60' : 'hover:bg-sunken'} ${major ? 'border border-gold/70' : 'border border-transparent'} ${isToday ? 'font-bold' : ''}`}
    >
      <span className={isToday ? 'underline decoration-accent decoration-2 underline-offset-4' : ''}>{Number(d.iso.slice(8))}</span>
      <span className="h-2 w-2 rounded-full ring-1 ring-white/30" style={{ backgroundColor: LITURGICAL_SWATCH[d.day.color] }} aria-hidden />
      {d.primary && <span className="absolute bottom-0.5 h-0.5 w-3 rounded-full bg-muted" aria-hidden />}
    </button>
  );
}

function DayPanel({ info }: { info: CalendarDayInfo }) {
  const { settings } = useSettings();
  const prayers = usePrayerCatalog().data;
  const { day, iso } = info;
  const mass = massReadingsOf(iso, settings);
  const seasons = activeSeasons(iso, liturgyOptionsOf(settings));
  const celebrated = info.saints.filter((e) => e.celebrated);
  const omitted = info.saints.filter((e) => !e.celebrated);
  const md = iso.slice(5);
  // Devociones: oraciones y novenas de los santos del día + novenas cuya fiesta es hoy
  const devotions = new Map<string, { href: string; title: string }>();
  for (const e of info.saints) {
    for (const p of e.saint.prayers ?? []) devotions.set(`p:${p}`, { href: `/oracion/?id=${encodeURIComponent(p)}`, title: prayers?.prayerById.get(p)?.title ?? p });
    for (const n of e.saint.novenas ?? []) devotions.set(`n:${n}`, { href: `/novena/?id=${encodeURIComponent(n)}`, title: `Novena: ${prayers?.novenaById.get(n)?.title ?? n}` });
  }
  for (const n of prayers?.novenas ?? []) if (n.feast && `${String(n.feast.month).padStart(2, '0')}-${String(n.feast.day).padStart(2, '0')}` === md) devotions.set(`n:${n.id}`, { href: `/novena/?id=${encodeURIComponent(n.id)}`, title: `Novena: ${n.title}` });
  const dev = [...devotions.values()];

  return (
    <div className="mt-6" data-testid="day-panel" data-date={iso}>
      <div className="bg-sacred relative overflow-hidden rounded-2xl">
        <div className="h-1" style={{ backgroundColor: LITURGICAL_SWATCH[day.color] }} aria-hidden />
        <div className="p-5">
          <p className="text-[12px] font-medium opacity-70">{formatLongDate(iso)}</p>
          <h2 className="mt-1 font-display text-[1.5rem] leading-[1.15]" data-testid="day-title">{day.title}</h2>
          <p className="mt-2 text-[13px] opacity-75">
            {liturgyLine(day)}
          </p>
          <p className="mt-1 flex items-center gap-2 text-[13px] opacity-75">
            <span className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white/40" style={{ backgroundColor: LITURGICAL_SWATCH[day.color] }} aria-hidden />
            {day.celebration ? `${TYPE[day.celebration.type] ?? ''}${day.celebration.type === 'sunday' || day.celebration.type === 'special' ? '' : ' · '}` : ''}Color litúrgico: {day.colorName.toLowerCase()}
          </p>
        </div>
      </div>

      {seasons.length > 0 && (
        <Section title={seasons[0]!.def.name} className="mt-6">
          <p className="mb-3 text-[14px] text-muted">{seasons[0]!.length > 1 ? `Día ${seasons[0]!.dayIndex} de ${seasons[0]!.length}. ` : ''}{seasons[0]!.def.summary}</p>
          <details className="rounded-2xl border border-line bg-surface p-4">
            <summary className="cursor-pointer text-[15px] font-medium">Contenido de la temporada</summary>
            <div className="mt-3"><SeasonContentList season={seasons[0]!} /></div>
          </details>
        </Section>
      )}

      {celebrated.length > 0 && (
        <Section title={celebrated.length > 1 ? 'Santos del día' : 'Santo del día'} className="mt-6">
          <ListGroup>
            {celebrated.map((e) => (
              <ListRow key={e.saint.id} href={`/santo/?id=${encodeURIComponent(e.saint.id)}`} title={e.saint.name} detail={`${RANK_LABEL[e.celebration.rank]} · ${e.saint.summary}`} />
            ))}
          </ListGroup>
        </Section>
      )}
      {omitted.length > 0 && (
        <Section title={celebrated.length ? 'Otros santos de este día' : 'Santos de esta fecha'} className="mt-6">
          <ListGroup>
            {omitted.map((e) => (
              <ListRow key={e.saint.id} href={`/santo/?id=${encodeURIComponent(e.saint.id)}`} title={e.saint.name} detail={
                  e.celebration.rank === 'none'
                    ? e.saint.status === 'marian' ? 'Devoción popular (sin celebración en el calendario litúrgico)' : 'Martirologio Romano (sin celebración en el calendario)'
                    : `${RANK_LABEL[e.celebration.rank]} (${formatMonthDay(e.celebration.date)}) · no se celebra hoy: ${day.celebration && day.celebration.rank <= e.rank ? day.title : day.dayName}`
                } />
            ))}
          </ListGroup>
        </Section>
      )}

      <Section title="Lecturas de la Misa" className="mt-6">
        {mass ? (
          <>
            <ReadingLinks testId="day-readings" items={mass.readings.map((r) => ({ label: MASS_READING_LABEL[r.type], ref: r.ref }))} />
            <p className="mt-2 text-xs text-muted">Referencias: {mass.source}. El texto se lee de tu Biblia instalada.</p>
          </>
        ) : (
          <p className="text-[14px] text-muted">Las lecturas de este día aún no están disponibles.</p>
        )}
      </Section>

      {dev.length > 0 && (
        <Section title="Devociones relacionadas" className="mt-6">
          <div className="flex flex-wrap gap-2">
            {dev.map((d) => <Link key={d.href} href={d.href} className="tap inline-flex min-h-[36px] items-center rounded-full border border-line px-3.5 text-[14px] hover:bg-sunken">{d.title}</Link>)}
          </div>
        </Section>
      )}
    </div>
  );
}
