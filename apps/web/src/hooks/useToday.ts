'use client';
import { useEffect, useState } from 'react';
import { liturgicalDay, type LiturgicalDay, type MassReadings } from '@bc/shared';
import { liturgyOptionsOf, massReadingsOf } from '@/lib/daily/mass';
import { todayIso } from '@/lib/daily/date';
import { useSettings } from './useSettings';

/** Fecha de hoy en la zona horaria elegida (o la del dispositivo). `null` hasta montar (evita desajustes de hidratación). Se actualiza al cambiar de día. */
export function useToday(): string | null {
  const { settings } = useSettings();
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setToday(todayIso(settings.timeZone));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [settings.timeZone]);
  return today;
}

export function useLiturgicalDay(iso: string | null): LiturgicalDay | null {
  const { settings: s } = useSettings();
  if (!iso) return null;
  return liturgicalDay(iso, liturgyOptionsOf(s));
}

/** Lecturas de la Misa de la fecha (solo referencias); null si no hay datos para ese día. */
export function useMassReadings(iso: string | null): MassReadings | null {
  const { settings: s } = useSettings();
  if (!iso) return null;
  return massReadingsOf(iso, s);
}
