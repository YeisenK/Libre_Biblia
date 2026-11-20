'use client';
import { useEffect, useState } from 'react';
import { liturgicalDay, type LiturgicalDay } from '@bc/shared';
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
  return liturgicalDay(iso, { epiphanySunday: s.epiphanySunday, ascensionSunday: s.ascensionSunday, corpusSunday: s.corpusSunday });
}
