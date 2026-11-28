'use client';
/** /novena/?id=<id>[&day=N]: introducción, día de la novena, progreso y navegación entre días. */
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NATURE_HELP, NATURE_LABEL, NOVENA_GROUP_LABEL, type Novena, type PrayerStep } from '@bc/shared';
import { useDefaultVersion, useVersions } from '@/hooks/useBible';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { useSettings } from '@/hooks/useSettings';
import { getDb } from '@/lib/db';
import { loadMassPassage, spanFor, spanOfPassage } from '@/lib/daily/mass';
import { readerHref } from '@/lib/links';
import { prayerText, splitReadings, type PrayerCatalog } from '@/lib/prayers/catalog';
import { toggleFavorite, useIsFavorite } from '@/lib/prayers/favorites';
import { novenaShareText } from '@/lib/prayers/share';
import { shareText } from '@/lib/share';
import { abandonNovena, calendarDay, currentDay, daysBehind, doneCount, feastTiming, markDayDone, restartNovena, startNovena, unmarkDay } from '@/lib/prayers/novenas';
import { Markdown } from '../Markdown';
import { Modal } from '../Modal';
import { HeartIcon } from '../Icons';
import { CheckIcon } from '../icons/Sacred';
import { ArtHeader, EmptyState, HeroCard, IconButton, NatureBadge, ProgressBar, ScreenHeader, Section, TextSizeControl } from '../ui';
import { PrayerAddToCollection } from './PrayerAddToCollection';
import { PrayerAddToRoutine } from './PrayerAddToRoutine';
import { PrayerText } from './PrayerText';
import { PrayerAudioButton } from '../audio/PrayerAudio';
import { GroupToggle } from './GroupToggle';
import { NovenaSchedule } from './NovenaSchedule';
import { useGroupMode } from '@/lib/prayers/groupMode';
import { relatedFeastNovenas, saintLabel, SAINT_PATRONAGE } from '@/lib/prayers/devotions';
import { isScheduled, nextFeastDate } from '@/lib/prayers/schedule';
import { useNovenaProgress, useToday } from './RoutineData';
import { plural } from './RoutineItems';

const btnPrimary = 'tap inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-fg px-6 text-[16px] font-medium text-bg disabled:opacity-60';
const btnGhost = 'tap inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-5 text-[15px] font-medium ring-1 ring-line hover:bg-sunken';

function Steps({ steps, cat, variants, group }: { steps: PrayerStep[]; cat: PrayerCatalog; variants: Record<string, string>; group?: boolean }) {
  return (
    <div className="space-y-6">
      {steps.map((s, i) => {
        if ('prayer' in s) {
          const p = cat.prayerById.get(s.prayer);
          const title = s.title ?? p?.title ?? s.prayer;
          return (
            <div key={i}>
              <h3 className="mb-2 flex flex-wrap items-baseline gap-2 font-display text-[1.25rem] font-semibold">
                {title}
                {s.times && s.times > 1 && <span className="rounded-md border border-line px-1.5 py-px font-sans text-[12px] font-medium text-muted">{s.times} veces</span>}
              </h3>
              {p ? <PrayerText text={prayerText(p, variants)} group={group} /> : <p className="text-sm text-muted">Esta oración todavía no está en tu devocionario.</p>}
            </div>
          );
        }
        return (
          <div key={i}>
            {s.title && <h3 className="mb-2 font-display text-[1.25rem] font-semibold">{s.title}</h3>}
            <PrayerText text={s.text} group={group} />
          </div>
        );
      })}
    </div>
  );
}

function Reading({ reference }: { reference: string }) {
  const { settings } = useSettings();
  const version = useDefaultVersion();
  const versions = useVersions();
  const preferred = settings.dailyBible ?? version;
  const q = useQuery({
    queryKey: ['novena-reading', reference, preferred, versions.data?.length],
    enabled: !!versions.data,
    queryFn: async () => {
      try {
        return await loadMassPassage(getDb(), reference, versions.data!, preferred);
      } catch {
        return null;
      }
    },
  });
  const p = q.data;
  let href: string | null = null;
  try {
    if (p) {
      const span = spanOfPassage(p);
      href = readerHref({ v: p.version.code, b: span.book, c: span.chapter, vs: span.verseStart ?? null, ve: span.chapterEnd ? null : (span.verseEnd ?? null) });
    } else if (versions.data?.length) {
      const span = spanFor(reference, versions.data.find((v) => v.code === preferred) ?? versions.data[0]!);
      href = readerHref({ v: preferred, b: span.book, c: span.chapter, vs: span.verseStart ?? null, ve: span.chapterEnd ? null : (span.verseEnd ?? null) });
    }
  } catch {
    href = null;
  }
  return (
    <div className="card-soft">
      <p className="eyebrow mb-1">Lectura bíblica</p>
      <p className="font-display text-[1.3rem] font-semibold">{p?.label ?? reference}</p>
      {p && (
        <p className="prayer-text mt-3">
          {p.verses.map((v) => (
            <span key={`${v.chapter}:${v.verse}`}>
              <sup className="mr-1 font-sans text-[0.6em] text-muted">{v.verse}</sup>
              {v.text.trim()}{' '}
            </span>
          ))}
        </p>
      )}
      {p?.fallback && <p className="mt-2 text-[12px] text-muted">Texto de {p.version.name ?? p.version.code}.</p>}
      {!p && !q.isLoading && <p className="mt-1 text-[13px] text-muted">Instala una Biblia en español en Contenido para leer el texto aquí.</p>}
      {href && <Link href={href} className="tap mt-3 inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-medium ring-1 ring-line hover:bg-sunken">Abrir en el lector</Link>}
    </div>
  );
}

export function NovenaDetail() {
  const sp = useSearchParams();
  const id = sp.get('id') ?? '';
  const dayParam = Number(sp.get('day'));
  const router = useRouter();
  const { data: cat, isLoading } = usePrayerCatalog();
  const { settings, update } = useSettings();
  const today = useToday();
  const progress = useNovenaProgress(id);
  const fav = useIsFavorite(`novena:${id}`);
  const [intention, setIntention] = useState('');
  const [confirm, setConfirm] = useState<null | 'restart' | 'abandon'>(null);
  const [busy, setBusy] = useState(false);
  const [schedule, setSchedule] = useState(false);
  const [group] = useGroupMode();

  if (isLoading || progress === undefined) return <div className="h-40 animate-pulse rounded-2xl bg-sunken" aria-hidden />;
  const novena: Novena | undefined = cat?.novenaById.get(id);
  if (!cat || !novena) {
    return (
      <div className="mx-auto max-w-3xl">
        <ScreenHeader back="/novenas/" title="Novena" />
        <EmptyState icon="candle" title="No encontramos esta novena" action={<Link href="/novenas/" className={btnGhost}>Ver todas las novenas</Link>}>Puede que el devocionario todavía se esté instalando.</EmptyState>
      </div>
    );
  }

  const total = novena.days.length;
  const p = progress ?? undefined;
  const scheduled = !!p && isScheduled(p, today);
  const running = !!p && !p.completedAt && !scheduled;
  const finished = !!p?.completedAt;
  const cur = currentDay(p, total);
  const inDay = Number.isInteger(dayParam) && dayParam >= 1 && dayParam <= total;
  const href = (d?: number) => `/novena/?id=${encodeURIComponent(id)}${d ? `&day=${d}` : ''}`;
  const timing = novena.feast ? feastTiming(novena.feast, today, total) : null;

  const begin = async () => {
    setBusy(true);
    await startNovena(id, intention);
    router.push(href(1));
  };

  const actions = (
    <>
      <TextSizeControl value={settings.prayerFontScale} onChange={(v) => update({ prayerFontScale: v })} />
      <IconButton label="Compartir novena" onClick={() => void shareText(novenaShareText(novena, p?.intention), novena.title)}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
      </IconButton>
      <IconButton label={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'} active={fav} onClick={() => void toggleFavorite(`novena:${id}`, novena.title)}>
        <span className={fav ? '[&_svg]:fill-current' : ''}><HeartIcon /></span>
      </IconButton>
    </>
  );

  // ── Vista de un día ───────────────────────────────────────────────
  if (inDay) {
    const d = novena.days.find((x) => x.day === dayParam) ?? novena.days[dayParam - 1]!;
    const isDone = !!p?.done[dayParam];
    const suggested = p && running ? calendarDay(p, total, today) : null;
    const finish = async () => {
      setBusy(true);
      const row = await markDayDone(novena, dayParam, { date: today, title: novena.title });
      setBusy(false);
      if (!row.completedAt && dayParam < total) router.replace(href(dayParam + 1));
      else router.replace(href());
    };
    return (
      <div className="mx-auto max-w-2xl">
        <ArtHeader artKey={`novena:${id}`} back={href()} eyebrow={`${novena.title} · Día ${dayParam} de ${total}`} title={d.title ?? `Día ${dayParam}`} actions={actions} />
        <div className="mb-6 flex items-center gap-1.5" role="group" aria-label="Días de la novena">
          {novena.days.map((x) => (
            <Link key={x.day} href={href(x.day)} aria-label={`Día ${x.day}${p?.done[x.day] ? ' (hecho)' : ''}`} aria-current={x.day === dayParam ? 'page' : undefined} className={`tap grid h-9 min-w-0 flex-1 place-items-center rounded-full text-[12px] font-semibold ring-1 ${x.day === dayParam ? 'bg-fg text-bg ring-fg' : p?.done[x.day] ? 'bg-ok/15 text-ok ring-ok/30' : 'bg-surface ring-line'}`}>
              {p?.done[x.day] && x.day !== dayParam ? <CheckIcon size={14} /> : x.day}
            </Link>
          ))}
        </div>
        {p?.intention && <p className="mb-6 rounded-2xl bg-sunken px-4 py-3 text-[14px]"><span className="eyebrow mr-2">Tu intención</span>{p.intention}</p>}
        {suggested && cur && suggested > cur && !isDone && daysBehind(p!, total, today) > 0 && <p className="mb-6 text-[13px] text-muted" role="status">Por el calendario tocaría el día {suggested}; puedes seguir a tu ritmo.</p>}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <GroupToggle />
          {/* Audio: clip por día generado en la ola 2 con Juglar (clave `novena:<id>:day:<n>`); no se muestra si no existe */}
          <PrayerAudioButton clipKey={`novena:${id}:day:${dayParam}`} />
        </div>
        <article className="space-y-10 pb-4">
          {novena.opening.length > 0 && (
            <Section title="Oraciones iniciales" className="!mb-0"><Steps steps={novena.opening} cat={cat} variants={settings.prayerVariants} group={group} /></Section>
          )}
          {d.reading && splitReadings(d.reading).map((r) => <Reading key={r} reference={r} />)}
          <Section title="Reflexión" className="!mb-0"><div className="prayer-text"><Markdown text={d.reflection} /></div></Section>
          <Section title="Oración del día" className="!mb-0"><PrayerText text={d.prayer} group={group} /></Section>
          {novena.closing.length > 0 && (
            <Section title="Oraciones finales" className="!mb-0"><Steps steps={novena.closing} cat={cat} variants={settings.prayerVariants} group={group} /></Section>
          )}
        </article>

        <div className="mt-8 space-y-3">
          {isDone ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-ok/10 px-4 py-3 text-ok">
              <span className="flex items-center gap-2 font-medium"><CheckIcon size={20} /> Día completado</span>
              <button type="button" onClick={() => void unmarkDay(id, dayParam)} className="tap min-h-[44px] rounded-full px-3 text-sm underline">Desmarcar</button>
            </div>
          ) : (
            <button type="button" disabled={busy} onClick={() => void finish()} className={btnPrimary}><CheckIcon size={20} /> Día completado</button>
          )}
          <div className="flex gap-3">
            {dayParam > 1 ? <Link href={href(dayParam - 1)} className={`${btnGhost} flex-1`}>Día anterior</Link> : <span className="flex-1" />}
            {dayParam < total ? <Link href={href(dayParam + 1)} className={`${btnGhost} flex-1`}>Día siguiente</Link> : <Link href={href()} className={`${btnGhost} flex-1`}>Volver a la novena</Link>}
          </div>
          <div className="flex"><PrayerAddToRoutine itemKey={`novena:${id}`} title={novena.title} /></div>
        </div>
      </div>
    );
  }

  // ── Introducción ──────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl">
      <ArtHeader
        artKey={`novena:${id}`}
        back="/novenas/"
        title={novena.title}
        subtitle={novena.description}
        actions={actions}
        meta={
          <span className="flex flex-wrap items-center gap-2 text-[13px] text-white/70">
            <NatureBadge label={NATURE_LABEL[novena.nature]} title={NATURE_HELP[novena.nature]} />
            <span>{NOVENA_GROUP_LABEL[novena.group]} · {plural(total, 'día', 'días')}{novena.feast && ` · ${novena.feast.label}`}</span>
          </span>
        }
      />

      <HeroCard tone="sacred" eyebrow={finished ? 'Novena completada' : running ? 'En curso' : scheduled ? 'Programada' : 'Para empezar'} title={finished ? 'Has terminado la novena' : running ? `Día ${cur ?? total} de ${total}` : 'Nueve días de oración'} subtitle={scheduled && p ? `Empieza el ${new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(p.startedAt))}. Puedes empezarla antes.` : running && p ? `${doneCount(p)} de ${total} días hechos` : timing && timing.daysUntilStart > 0 ? `Para la fiesta (${novena.feast!.label}) conviene empezar el ${new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${timing.startDate}T00:00:00Z`))}.` : undefined} className="mb-6">
        {running && p && <ProgressBar value={doneCount(p) / total} className="mb-4 !bg-white/30" />}
        {!running && !finished && (
          <>
            <label htmlFor="intention" className="mb-1 block text-[13px] font-medium opacity-80">Tu intención (opcional)</label>
            <input id="intention" value={intention} maxLength={200} onChange={(e) => setIntention(e.target.value)} placeholder="Por quién o por qué rezas" className="mb-3 min-h-[48px] w-full rounded-2xl border border-white/15 bg-white/10 px-4 text-[16px] text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/70" />
          </>
        )}
        {running ? (
          <Link href={href(cur ?? total)} className="tap inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-white px-6 text-[16px] font-semibold text-[#0b0b12]">Continuar: día {cur ?? total}</Link>
        ) : finished ? (
          <button type="button" onClick={() => setConfirm('restart')} className="tap inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-white px-6 text-[16px] font-semibold text-[#0b0b12]">Volver a hacerla</button>
        ) : (
          <button type="button" disabled={busy || total === 0} onClick={() => void begin()} className="tap inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-white px-6 text-[16px] font-semibold text-[#0b0b12] disabled:opacity-60">Comenzar la novena</button>
        )}
      </HeroCard>

      {p?.intention && <p className="mb-6 rounded-2xl bg-sunken px-4 py-3 text-[14px]"><span className="eyebrow mr-2">Tu intención</span>{p.intention}</p>}

      {(running || finished) && (
        <Section title="Los días">
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-9">
            {novena.days.map((x) => (
              <Link key={x.day} href={href(x.day)} aria-label={`Día ${x.day}${p?.done[x.day] ? ' (hecho)' : ''}`} className={`tap grid h-12 place-items-center rounded-2xl text-[15px] font-semibold ring-1 ${p?.done[x.day] ? 'bg-ok/15 text-ok ring-ok/30' : x.day === cur ? 'bg-fg text-bg ring-fg' : 'bg-surface ring-line'}`}>
                {p?.done[x.day] ? <CheckIcon size={18} /> : x.day}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {novena.introduction && <Section title="Origen e historia"><div className="prayer-text"><Markdown text={novena.introduction} /></div></Section>}
      {novena.purpose && <Section title="Finalidad"><div className="prayer-text"><Markdown text={novena.purpose} /></div></Section>}

      {(() => {
        const feastDate = novena.feast ? nextFeastDate(novena, today) : null;
        const related = relatedFeastNovenas(cat, novena.saints, novena.id);
        if (!feastDate && !novena.saints?.length) return null;
        return (
          <Section title="Santo y fiesta">
            {feastDate && novena.feast && <p className="mb-3 text-[14px]">{novena.feast.label}: <strong>{new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${feastDate}T00:00:00Z`))}</strong></p>}
            {novena.saints && novena.saints.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {novena.saints.map((sid) => <Link key={sid} href={`/oraciones/santos/?s=${encodeURIComponent(sid)}`} className="tap inline-flex min-h-[44px] items-center rounded-full bg-surface px-4 text-[14px] ring-1 ring-line hover:bg-sunken">{SAINT_PATRONAGE[sid]?.name ?? saintLabel(sid)}</Link>)}
              </div>
            )}
            {related.length > 0 && <ul className="space-y-1 text-[14px]">{related.map((r) => <li key={r.id}><Link className="text-accent underline" href={`/novena/?id=${encodeURIComponent(r.id)}`}>{r.title}</Link>{r.feast ? ` · ${r.feast.label}` : ''}</li>)}</ul>}
          </Section>
        );
      })()}

      {(novena.attribution || (novena.sources && novena.sources.length > 0)) && (
        <Section title="Fuentes y atribución">
          {novena.attribution && <p className="mb-2 text-[14px] text-muted">{novena.attribution}</p>}
          {novena.sources && (
            <ul className="list-disc space-y-1 pl-5 text-[14px] text-muted">
              {novena.sources.map((s, i) => <li key={i}>{s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="underline">{s.label}</a> : s.label}</li>)}
            </ul>
          )}
        </Section>
      )}

      <p className="mb-4 text-[13px] leading-relaxed text-muted">{NATURE_HELP[novena.nature]}</p>
      <div className="mb-8 flex flex-wrap gap-3">
        {!running && !finished && <button type="button" onClick={() => setSchedule(true)} className={btnGhost}>{scheduled ? 'Cambiar fecha' : 'Programar'}</button>}
        <PrayerAddToRoutine itemKey={`novena:${id}`} title={novena.title} />
        <PrayerAddToCollection itemKey={`novena:${id}`} title={novena.title} />
        {running && <button type="button" onClick={() => setConfirm('restart')} className={btnGhost}>Reiniciar</button>}
        {p && <button type="button" onClick={() => setConfirm('abandon')} className={btnGhost}>{finished ? 'Quitar del progreso' : 'Abandonar'}</button>}
      </div>

      <NovenaSchedule novena={novena} today={today} open={schedule} onClose={() => setSchedule(false)} />

      <Modal open={confirm !== null} onClose={() => setConfirm(null)} title={confirm === 'restart' ? '¿Empezar de nuevo?' : '¿Abandonar la novena?'} variant="dialog">
        <p className="mb-4 text-sm text-muted">{confirm === 'restart' ? 'Se borrará el progreso actual y volverás al día 1. Se conserva tu intención.' : 'Se borrará el progreso de esta novena. Podrás empezarla otra vez cuando quieras.'}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="tap min-h-[44px] rounded-full bg-fg px-5 text-sm font-medium text-bg" onClick={() => { const c = confirm; setConfirm(null); void (c === 'restart' ? restartNovena(id).then(() => router.push(href(1))) : abandonNovena(id)); }}>
            {confirm === 'restart' ? 'Sí, empezar de nuevo' : 'Sí, abandonar'}
          </button>
          <button type="button" onClick={() => setConfirm(null)} className="tap min-h-[44px] rounded-full px-5 text-sm ring-1 ring-line">Cancelar</button>
        </div>
      </Modal>
    </div>
  );
}
