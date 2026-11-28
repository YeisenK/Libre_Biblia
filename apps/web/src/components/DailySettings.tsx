'use client';
import { useEffect, useState } from 'react';
import { getCalendar, listCalendars } from '@bc/shared';
import { useVersions } from '@/hooks/useBible';
import { useSettings } from '@/hooks/useSettings';
import { isTime, isValidTimeZone, todayIso } from '@/lib/daily/date';
import { isNative } from '@/lib/native/platform';
import { notificationPermission, requestNotificationPermission, type PermissionState } from '@/lib/notifications/native';
import { Modal } from './Modal';
import { statusSuffix } from './StatusBadges';

function zones(): string[] {
  try {
    return (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];
  } catch {
    return [];
  }
}

export function DailySettings() {
  const { settings: s, update } = useSettings();
  const versions = useVersions();
  const [native, setNative] = useState(false);
  const [perm, setPerm] = useState<PermissionState>('prompt');
  const [explain, setExplain] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [tz, setTz] = useState('');
  const device = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    void isNative().then(setNative);
    void notificationPermission().then(setPerm).catch(() => undefined);
  }, []);
  useEffect(() => setTz(s.timeZone ?? ''), [s.timeZone]);

  const calDef = getCalendar(s.calendar).defaults;
  const cal = { epiphanySunday: s.epiphanySunday ?? calDef.epiphanySunday, ascensionSunday: s.ascensionSunday ?? calDef.ascensionSunday, corpusSunday: s.corpusSunday ?? calDef.corpusSunday };
  const tzOk = tz === '' || isValidTimeZone(tz);
  const time = (label: string, value: string, key: 'notifyVerseTime' | 'notifyReadingTime' | 'notifyPrayerTime' | 'notifySaintTime' | 'notifyCelebrationsTime' | 'notifySeasonsTime' | 'notifyNovenasTime' | 'notifyRosaryTime') => (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input type="time" className="input !w-auto" value={value} onChange={(e) => isTime(e.target.value) && update({ [key]: e.target.value })} aria-label={label} />
    </label>
  );
  const check = (label: string, on: boolean, onChange: (v: boolean) => void) => (
    <label className="flex min-h-[44px] items-center gap-2 text-sm">
      <input type="checkbox" className="h-5 w-5" checked={on} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );

  async function confirmEnable() {
    setExplain(false);
    const p = await requestNotificationPermission();
    setPerm(p);
    if (p === 'granted') {
      update({ notifyEnabled: true });
      setNote(null);
    } else if (p === 'unsupported') setNote('Este navegador no admite notificaciones.');
    else setNote('No se concedió el permiso. Puedes activarlo después en los ajustes del sistema para esta app.');
  }

  return (
    <section className="card-soft mb-4" aria-labelledby="dv">
      <h2 id="dv" className="mb-1 font-display text-[1.15rem]">Versículo del día</h2>
      <p className="mb-3 text-sm text-muted">La cabecera litúrgica (tiempo, celebración y color) se muestra siempre. El versículo depende solo de la fecha, sin aleatoriedad.</p>

      <fieldset className="mb-4" data-testid="verse-mode">
        <legend className="mb-1 text-sm font-medium">Qué mostrar como versículo</legend>
        <label className="flex min-h-[44px] items-start gap-2 text-sm">
          <input type="radio" name="verse-mode" className="mt-0.5 h-5 w-5" checked={s.verseMode !== 'cycle'} onChange={() => update({ verseMode: 'gospel' })} />
          <span><span className="font-medium">Evangelio del día</span><br /><span className="text-muted">El Evangelio de la Misa de hoy, con el texto de tu Biblia. Si un día no tiene datos, se usa el ciclo temático.</span></span>
        </label>
        <label className="flex min-h-[44px] items-start gap-2 text-sm">
          <input type="radio" name="verse-mode" className="mt-0.5 h-5 w-5" checked={s.verseMode === 'cycle'} onChange={() => update({ verseMode: 'cycle' })} />
          <span><span className="font-medium">Ciclo temático</span><br /><span className="text-muted">El versículo devocional del ciclo instalado.</span></span>
        </label>
        <p className="mt-1 text-xs text-muted">Referencias de las lecturas: Evangelizo.org.</p>
      </fieldset>

      {!!versions.data?.length && (
        <label className="mb-4 block text-sm font-medium">
          Biblia para el versículo
          <select className="input mt-1" value={s.dailyBible ?? ''} onChange={(e) => update({ dailyBible: e.target.value || null })}>
            <option value="">La versión por defecto</option>
            {versions.data.map((v) => (
              <option key={v.code} value={v.code}>{v.code} · {v.name}{statusSuffix(v)}</option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="mb-4" data-testid="calendar-settings">
        <legend className="mb-1 text-sm font-medium">Calendario litúrgico</legend>
        <select className="input mb-2" aria-label="Calendario litúrgico" value={s.calendar} onChange={(e) => update({ calendar: e.target.value, epiphanySunday: null, ascensionSunday: null, corpusSunday: null })}>
          {listCalendars().map((c) => (
            <option key={c.id} value={c.id}>{c.id === 'general' ? 'Calendario Romano General' : `Propio de ${c.name}`}</option>
          ))}
        </select>
        <p className="mb-2 text-xs text-muted">Incluye las celebraciones propias del país y sus traslados. Fuentes: {getCalendar(s.calendar).sources.map((x) => x.label.split(':')[0]).join('; ')}.</p>
        {check('Epifanía en el domingo (entre el 2 y el 8 de enero)', cal.epiphanySunday, (v) => update({ epiphanySunday: v }))}
        {check('Ascensión en domingo', cal.ascensionSunday, (v) => update({ ascensionSunday: v }))}
        {check('Corpus Christi en domingo', cal.corpusSunday, (v) => update({ corpusSunday: v }))}
        {(s.epiphanySunday !== null || s.ascensionSunday !== null || s.corpusSunday !== null) && (
          <button type="button" className="btn mt-1" onClick={() => update({ epiphanySunday: null, ascensionSunday: null, corpusSunday: null })}>Usar los valores del calendario</button>
        )}
      </fieldset>

      <div className="mb-4">
        <label className="block text-sm font-medium" htmlFor="tz">Zona horaria (opcional)</label>
        <input
          id="tz"
          className="input mt-1"
          list="tz-list"
          value={tz}
          placeholder={`Dispositivo: ${device}`}
          onChange={(e) => {
            setTz(e.target.value);
            if (e.target.value === '') update({ timeZone: null });
            else if (isValidTimeZone(e.target.value)) update({ timeZone: e.target.value });
          }}
          aria-invalid={!tzOk}
        />
        <datalist id="tz-list">{zones().map((z) => <option key={z} value={z} />)}</datalist>
        {!tzOk && <p role="alert" className="mt-1 text-sm text-danger">Zona no válida. Usa un nombre IANA, por ejemplo America/Mexico_City.</p>}
        <p className="mt-1 text-xs text-muted">Hoy es {todayIso(s.timeZone)} en {s.timeZone ?? `${device} (la del dispositivo)`}.</p>
      </div>

      <h3 className="mb-1 text-sm font-semibold">Notificaciones</h3>
      <p className="mb-2 text-sm text-muted" data-testid="notify-explain">
        {native
          ? 'Al abrir la app se programan las notificaciones de los próximos 7 días (las litúrgicas, 4 semanas) con el texto de cada una; llegan aunque la app esté cerrada. No usan alarmas exactas, así que pueden retrasarse unos minutos. Si pasan más de 7 días sin abrir la app, dejarán de llegar el versículo y los recordatorios hasta que la abras.'
          : 'En el navegador, las notificaciones solo funcionan con la app abierta o instalada; no llegan si está cerrada. En la app de Android sí llegan con ella cerrada.'}
      </p>
      {!s.notifyEnabled ? (
        <button type="button" className="btn" onClick={() => setExplain(true)}>Activar notificaciones…</button>
      ) : (
        <div className="flex flex-col gap-2">
          {perm === 'denied' && <p role="alert" className="text-sm text-danger">El sistema tiene bloqueadas las notificaciones de esta app. Actívalas en los ajustes del sistema.</p>}
          {time('Hora del versículo', s.notifyVerseTime, 'notifyVerseTime')}
          {check('Recordatorio de lectura', s.notifyReading, (v) => update({ notifyReading: v }))}
          {s.notifyReading && time('Hora de lectura', s.notifyReadingTime, 'notifyReadingTime')}
          {check('Recordatorio de oración', s.notifyPrayer, (v) => update({ notifyPrayer: v }))}
          {s.notifyPrayer && time('Hora de oración', s.notifyPrayerTime, 'notifyPrayerTime')}
          <h4 className="mt-2 text-sm font-semibold">Liturgia (máximo 2 al día)</h4>
          <p className="text-xs text-muted">Se generan desde el calendario elegido, con antelación, para que lleguen sin conexión. Si coinciden varias el mismo día, se avisa de las más importantes.</p>
          {check('Santo del día', s.notifySaint, (v) => update({ notifySaint: v }))}
          {s.notifySaint && time('Hora del santo', s.notifySaintTime, 'notifySaintTime')}
          {check('Solemnidades y fiestas', s.notifyCelebrations, (v) => update({ notifyCelebrations: v }))}
          {s.notifyCelebrations && time('Hora de las celebraciones', s.notifyCelebrationsTime, 'notifyCelebrationsTime')}
          {check('Inicio de los tiempos litúrgicos', s.notifySeasons, (v) => update({ notifySeasons: v }))}
          {check('Contenido de temporada (semanal)', s.notifySeasonContent, (v) => update({ notifySeasonContent: v }))}
          {(s.notifySeasons || s.notifySeasonContent) && time('Hora de los tiempos litúrgicos', s.notifySeasonsTime, 'notifySeasonsTime')}
          {check('Inicio de novenas (9 días antes de la fiesta)', s.notifyNovenas, (v) => update({ notifyNovenas: v }))}
          {s.notifyNovenas && time('Hora de las novenas', s.notifyNovenasTime, 'notifyNovenasTime')}
          {check('Rosario del día', s.notifyRosary, (v) => update({ notifyRosary: v }))}
          {s.notifyRosary && time('Hora del Rosario', s.notifyRosaryTime, 'notifyRosaryTime')}
          <div>
            <button type="button" className="btn" onClick={() => update({ notifyEnabled: false })}>Desactivar notificaciones</button>
          </div>
        </div>
      )}
      {note && <p role="status" className="mt-2 text-sm">{note}</p>}

      <Modal open={explain} onClose={() => setExplain(false)} title="Notificaciones" variant="dialog">
        <p className="mb-2 text-sm">Lux puede avisarte cada día con el versículo (la referencia y sus primeras palabras) y, si quieres, con un recordatorio de lectura y otro de oración.</p>
        <ul className="mb-3 list-disc pl-5 text-sm">
          <li>Todo ocurre en tu dispositivo: no hay servidor ni cuenta, y no se envía ningún dato.</li>
          <li>Tú eliges las horas y puedes desactivarlas cuando quieras.</li>
          <li>{native ? 'Android te pedirá permiso para mostrar notificaciones.' : 'Tu navegador te pedirá permiso para mostrar notificaciones; solo aparecerán con la app abierta.'}</li>
        </ul>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={() => setExplain(false)}>Ahora no</button>
          <button type="button" className="btn btn-primary" data-autofocus onClick={() => void confirmEnable()}>Continuar</button>
        </div>
      </Modal>
    </section>
  );
}
