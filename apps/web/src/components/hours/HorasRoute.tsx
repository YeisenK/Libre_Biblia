'use client';
/** /horas/: elige fecha y hora (sugerida por la hora local) y abre el reproductor paso a paso. */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HOURS_NOTICE, HOUR_IDS, HOUR_LABEL, hoursFor, suggestHour, type HourId } from '@bc/shared';
import { useSettings } from '@/hooks/useSettings';
import { formatLongDate, shiftIso, todayIso } from '@/lib/daily/date';
import { ensureHoursPack } from '@/lib/hours/pack';
import { getHoursPrefs, getHoursProgress, setHoursPrefs, type HoursPrefs } from '@/lib/hours/prefs';
import { Banner, Chip, EmptyState, IconButton, PrayerScreen, Section } from '../ui';
import { ChevronLeft, ChevronRight } from '../Icons';
import { HoursPlayer } from './HoursPlayer';

export const HOURS_PACK_KEY = ['hours-pack'] as const;

export function HorasRoute() {
  const { settings } = useSettings();
  const qc = useQueryClient();
  const pack = useQuery({ queryKey: HOURS_PACK_KEY, queryFn: () => ensureHoursPack(), staleTime: Infinity });
  const [date, setDate] = useState<string | null>(null);
  const [hour, setHour] = useState<HourId>('lauds');
  const [prefs, setPrefs] = useState<HoursPrefs | null>(null);
  const [playing, setPlaying] = useState(false);
  const [resume, setResume] = useState<{ key: string; step: number } | null>(null);
  useEffect(() => {
    setDate(todayIso(settings.timeZone));
    setHour(suggestHour(new Date().getHours()));
    setPrefs(getHoursPrefs());
    setResume(getHoursProgress());
  }, [settings.timeZone]);

  const plan = useMemo(() => (pack.data && date ? hoursFor(date, hour, settings.calendar, pack.data, { invitatory: prefs?.invitatory ?? true, complementary: prefs?.complementary ?? false }) : null), [pack.data, date, hour, settings.calendar, prefs]);
  const update = (p: Partial<HoursPrefs>) => { setHoursPrefs(p); setPrefs((x) => ({ ...(x as HoursPrefs), ...p })); };

  if (playing && plan && pack.data && prefs) {
    return <HoursPlayer plan={plan} pack={pack.data} prefs={prefs} onPrefs={update} startStep={resume?.key === `${date}|${hour}` ? resume.step : 0} onExit={() => { setPlaying(false); setResume(getHoursProgress()); void qc.invalidateQueries({ queryKey: HOURS_PACK_KEY }); }} />;
  }
  return (
    <PrayerScreen>
      <div className="mx-auto max-w-2xl">
        <h1 className="h-page mb-1">Oración de las Horas</h1>
        <p className="mb-5 text-[14px] text-muted">{HOURS_NOTICE}</p>
        {pack.isLoading || !date ? <p className="text-muted">Preparando el breviario…</p> : !pack.data ? (
          <EmptyState title="El breviario aún no está disponible">El paquete de la Oración de las Horas no se ha instalado todavía en este dispositivo.</EmptyState>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-2">
              <IconButton label="Día anterior" onClick={() => setDate(shiftIso(date, -1))}><ChevronLeft /></IconButton>
              <div className="text-center">
                <p className="font-display text-[1.2rem] font-semibold capitalize">{formatLongDate(date)}</p>
                {plan && <p className="text-[13px] text-muted">{plan.title} · semana {['I', 'II', 'III', 'IV'][plan.psalterWeek - 1]} del salterio</p>}
              </div>
              <IconButton label="Día siguiente" onClick={() => setDate(shiftIso(date, 1))}><ChevronRight /></IconButton>
            </div>
            <div className="mb-5 flex flex-wrap justify-center gap-2" role="group" aria-label="Hora">
              {HOUR_IDS.map((h) => <Chip key={h} active={h === hour} onClick={() => setHour(h)}>{HOUR_LABEL[h]}</Chip>)}
            </div>
            {plan && !plan.available && <Banner tone="warn">{plan.unavailableReason}</Banner>}
            {plan?.eve && <p className="mb-3 text-center text-[13px] text-accent">I Vísperas de {plan.title}</p>}
            {plan?.notes.map((n) => <p key={n} className="mb-2 text-[12px] text-muted">{n}</p>)}
            <div className="mt-4 flex flex-col gap-3">
              <button type="button" disabled={!plan?.available} onClick={() => setPlaying(true)} className="btn btn-primary !min-h-[56px] !rounded-full text-base">
                {resume?.key === `${date}|${hour}` && resume.step > 0 ? 'Continuar' : 'Rezar'} {HOUR_LABEL[hour]}
              </button>
            </div>
            <Section title="Ajustes">
              <div className="flex flex-wrap gap-2">
                {([['es', 'Español'], ['la', 'Latín (Vulgata)'], ['both', 'Ambos']] as const).map(([v, l]) => <Chip key={v} active={prefs?.lang === v} onClick={() => update({ lang: v })}>{l}</Chip>)}
                <Chip active={!!prefs?.invitatory} onClick={() => update({ invitatory: !prefs?.invitatory })}>Invitatorio</Chip>
                <Chip active={!!prefs?.complementary} onClick={() => update({ complementary: !prefs?.complementary })}>Salmodia complementaria</Chip>
              </div>
            </Section>
          </>
        )}
      </div>
    </PrayerScreen>
  );
}
