'use client';
/**
 * Piezas de interfaz comunes (diseño v2, ver docs/DISENO_V2.md): contenido e imagen, no adornos.
 * Toda pantalla se construye con ellas para que la app se sienta una sola.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { artFor } from '@/lib/art';
import { ChevronLeft, ChevronRight } from '../Icons';
import { CheckIcon, SacredIcon } from '../icons/Sacred';

/** Cabecera de pantalla: título grande en sans, antetítulo opcional, subtítulo y acciones a la derecha. */
export function ScreenHeader({ eyebrow, title, subtitle, back, actions }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; back?: string | true; actions?: ReactNode }) {
  const router = useRouter();
  const backCls = '-ml-2 flex min-h-[44px] items-center gap-0.5 rounded-full px-2 text-[15px] text-muted hover:text-fg';
  return (
    <header className="mb-6">
      {back && (
        <div className="mb-1 flex min-h-[44px] items-center">
          {back === true ? (
            <button type="button" onClick={() => router.back()} className={backCls} aria-label="Volver">
              <ChevronLeft /> Volver
            </button>
          ) : (
            <Link href={back} className={backCls} aria-label="Volver">
              <ChevronLeft /> Volver
            </Link>
          )}
        </div>
      )}
      {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
      <div className="flex items-start justify-between gap-3">
        <h1 className="h-page min-w-0">{title}</h1>
        {actions && <div className="-mr-2 flex shrink-0 items-center gap-0.5">{actions}</div>}
      </div>
      {subtitle && <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{subtitle}</p>}
    </header>
  );
}

export function Section({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`mb-8 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          {title && <h2 className="font-display text-[1.25rem] leading-tight">{title}</h2>}
          {action && <span className="text-[14px] text-accent">{action}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Tarjeta destacada sobre fondo oscuro sobrio (por momento del día o sagrado). */
export function HeroCard({ tone = 'sacred', eyebrow, title, subtitle, icon, href, onClick, children, className = '' }: {
  tone?: 'morning' | 'midday' | 'afternoon' | 'night' | 'sacred';
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: string;
  href?: string;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
}) {
  const bg = tone === 'sacred' ? 'bg-sacred' : `bg-moment-${tone}`;
  const body = (
    <>
      {icon && (
        <span className="pointer-events-none absolute right-4 top-4 opacity-30" aria-hidden>
          <SacredIcon name={icon} size={22} />
        </span>
      )}
      <div className="relative">
        {eyebrow && <p className="mb-1.5 text-[12px] font-medium opacity-70">{eyebrow}</p>}
        <p className="font-display text-[1.6rem] leading-[1.12]">{title}</p>
        {subtitle && <p className="mt-1.5 max-w-[36ch] text-[15px] leading-snug opacity-75">{subtitle}</p>}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </>
  );
  const cls = `tap relative block overflow-hidden rounded-2xl p-5 ${bg} ${className}`;
  if (href) return <Link href={href} className={cls}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={`${cls} w-full text-left`}>{body}</button>;
  return <div className={cls}>{body}</div>;
}

/** Tarjeta de contenido en cuadrícula o carrusel; el icono, si lo hay, es pequeño y monocromo. */
export function TileCard({ title, subtitle, icon, tint: _tint, href, onClick, badge, progress, className = '' }: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: string;
  tint?: string;
  href?: string;
  onClick?: () => void;
  badge?: ReactNode;
  /** 0..1 */
  progress?: number;
  className?: string;
}) {
  const body = (
    <>
      {(icon || badge) && (
        <div className="mb-2 flex items-center justify-between gap-2">
          {icon ? <span className="text-muted"><SacredIcon name={icon} size={18} /></span> : <span />}
          {badge}
        </div>
      )}
      <p className="font-display text-[1.05rem] leading-tight">{title}</p>
      {subtitle && <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted">{subtitle}</p>}
      {progress !== undefined && <ProgressBar value={progress} className="mt-3" />}
    </>
  );
  const cls = `tap card-soft flex h-full flex-col hover:bg-sunken/60 ${className}`;
  if (href) return <Link href={href} className={cls}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={`${cls} text-left`}>{body}</button>;
  return <div className={cls}>{body}</div>;
}

/** Fila de lista: icono monocromo opcional, título, detalle y acción al final. */
export function ListRow({ title, detail, icon, href, onClick, trailing, done, className = '' }: {
  title: ReactNode;
  detail?: ReactNode;
  icon?: string;
  href?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  done?: boolean;
  className?: string;
}) {
  const body = (
    <>
      {icon !== undefined && (
        <span className={`grid h-6 w-6 shrink-0 place-items-center ${done ? 'text-ok' : 'text-muted'}`}>
          {done ? <CheckIcon size={20} /> : <SacredIcon name={icon} size={20} />}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[16px] ${done ? 'text-muted line-through decoration-muted/50' : 'font-medium'}`}>{title}</span>
        {detail && <span className="block truncate text-[13px] text-muted">{detail}</span>}
      </span>
      {trailing ?? ((href || onClick) && <span className="text-muted/70"><ChevronRight /></span>)}
    </>
  );
  const cls = `tap flex min-h-[56px] w-full items-center gap-3.5 px-4 py-2 text-left hover:bg-sunken/60 ${className}`;
  if (href) return <Link href={href} className={cls}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{body}</button>;
  return <div className={cls}>{body}</div>;
}

/** Grupo de filas con separadores finos, sin sombra. */
export function ListGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface ${className}`}>{children}</div>;
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`tap min-h-[36px] shrink-0 rounded-full px-4 text-[14px] font-medium transition-colors ${active ? 'bg-ink text-ink-fg' : 'border border-line bg-transparent text-fg hover:bg-sunken'}`}
    >
      {children}
    </button>
  );
}

/** Fila deslizable horizontal (carrusel) que no desborda la página. */
export function Rail({ children }: { children: ReactNode }) {
  return <div className="-mx-5 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:px-0 [&>*]:snap-start">{children}</div>;
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={`h-1 w-full overflow-hidden rounded-full bg-line ${className}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)}>
      <div className="h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: `${v * 100}%` }} />
    </div>
  );
}

export function ProgressRing({ value, size = 44, stroke = 3, label }: { value: number; size?: number; stroke?: number; label?: ReactNode }) {
  const v = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--gold))" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} className="transition-[stroke-dashoffset] duration-500" />
      </svg>
      {label !== undefined && <span className="absolute text-[11px] font-semibold">{label}</span>}
    </span>
  );
}

export function EmptyState({ icon: _icon, title, children, action }: { icon?: string; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <p className="font-display text-[1.1rem]">{title}</p>
      {children && <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-sunken p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-[36px] flex-1 rounded-lg px-3 text-[14px] font-medium transition-colors ${value === o.value ? 'bg-raised text-fg shadow-soft ring-1 ring-line' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, detail }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; detail?: ReactNode }) {
  return (
    <label className="flex min-h-[56px] cursor-pointer items-center justify-between gap-4 px-4 py-2">
      <span className="min-w-0">
        <span className="block text-[16px]">{label}</span>
        {detail && <span className="block text-[13px] text-muted">{detail}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-7 w-12 rounded-full bg-line transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg" />
        <span className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

/** Insignia de naturaleza eclesial (litúrgica, devoción privada…): texto pequeño con borde fino. */
export function NatureBadge({ label, title }: { label: string; title?: string }) {
  return (
    <span title={title} className="inline-flex items-center rounded-md border border-line px-1.5 py-px text-[11px] font-medium text-muted">
      {label}
    </span>
  );
}

/** Control de tamaño de letra (A− / A+). */
export function TextSizeControl({ value, onChange, min = 0.85, max = 1.6 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const step = (d: number) => onChange(Math.round(Math.max(min, Math.min(max, value + d)) * 100) / 100);
  return (
    <div className="flex items-center gap-0.5 rounded-xl bg-sunken p-1" role="group" aria-label="Tamaño del texto">
      <button type="button" className="grid h-9 w-10 place-items-center rounded-lg text-sm hover:bg-raised disabled:opacity-40" onClick={() => step(-0.1)} disabled={value <= min} aria-label="Reducir texto">
        A−
      </button>
      <button type="button" className="grid h-9 w-10 place-items-center rounded-lg text-lg hover:bg-raised disabled:opacity-40" onClick={() => step(0.1)} disabled={value >= max} aria-label="Aumentar texto">
        A+
      </button>
    </div>
  );
}

/** Botón redondo de icono (cabeceras y reproductores). */
export function IconButton({ label, onClick, children, active, className = '' }: { label: string; onClick?: () => void; children: ReactNode; active?: boolean; className?: string }) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={active} onClick={onClick} className={`tap grid h-11 w-11 place-items-center rounded-full hover:bg-sunken ${active ? 'text-accent' : ''} ${className}`}>
      {children}
    </button>
  );
}

/** Momento del día según la hora local. */
export function momentOf(d: Date = new Date()): 'morning' | 'midday' | 'afternoon' | 'night' {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 15) return 'midday';
  if (h >= 15 && h < 20) return 'afternoon';
  return 'night';
}
export const MOMENT_LABEL = { morning: 'Mañana', midday: 'Mediodía', afternoon: 'Tarde', night: 'Noche', any: 'Cualquier momento' } as const;
export const MOMENT_GREETING = { morning: 'Buenos días', midday: 'Buen mediodía', afternoon: 'Buenas tardes', night: 'Buenas noches' } as const;

/* ---- Añadidos del rediseño ---- */

/** Aviso en línea (información, éxito o error) con rol accesible. */
export function Banner({ tone = 'info', children, className = '' }: { tone?: 'info' | 'ok' | 'error' | 'warn'; children: ReactNode; className?: string }) {
  const cls = { info: 'bg-sunken text-fg', ok: 'bg-ok/10 text-ok', error: 'bg-danger/10 text-danger', warn: 'bg-warn/10 text-warn' }[tone];
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl px-4 py-3 text-[14px] leading-snug ${cls} ${className}`}>
      {children}
    </p>
  );
}

/** Línea de carga discreta. */
export function Loading({ children = 'Cargando…' }: { children?: ReactNode }) {
  return (
    <p role="status" className="py-6 text-center text-[14px] text-muted">
      {children}
    </p>
  );
}

const COVER_TONES = [
  ['#2a3150', '#12151f'],
  ['#4a2c36', '#1a1115'],
  ['#2b3f3b', '#111a18'],
  ['#42341f', '#1a150c'],
  ['#35294a', '#14101f'],
  ['#28394d', '#0f1822'],
];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Portada sobria: título en sans sobre degradado oscuro; el tono se deriva de la clave. */
export function Cover({ title, subtitle, seed, icon = 'book', className = '' }: { title: ReactNode; subtitle?: ReactNode; seed?: string; icon?: string; className?: string }) {
  const [a, b] = COVER_TONES[hash(seed ?? String(title)) % COVER_TONES.length]!;
  return (
    <div className={`relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-xl p-3 text-[#f0f0f4] ${className}`} style={{ background: `linear-gradient(155deg, ${a}, ${b})` }}>
      <span className="relative opacity-60" aria-hidden>
        <SacredIcon name={icon} size={16} />
      </span>
      <div className="relative">
        <p className="font-display text-[1.02rem] leading-tight">{title}</p>
        {subtitle && <p className="mt-1 text-[11px] opacity-65">{subtitle}</p>}
      </div>
    </div>
  );
}

/** Sección de ajustes: título pequeño sobre un grupo de filas. */
export function SettingsSection({ title, hint, children }: { title: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 px-1 text-[13px] font-semibold text-muted">{title}</h2>
      <div className="rounded-2xl border border-line bg-surface p-4">{children}</div>
      {hint && <p className="mt-2 px-1 text-[13px] text-muted">{hint}</p>}
    </section>
  );
}

/* ---- Arte (v2) ---- */

const FALLBACK_BG = ['linear-gradient(160deg,#262a3d,#0c0c12)', 'linear-gradient(160deg,#35262c,#0e0b0d)', 'linear-gradient(160deg,#22302d,#0b100f)', 'linear-gradient(160deg,#322b1f,#0f0d09)'];
const fallbackFor = (k: string) => FALLBACK_BG[hash(k) % FALLBACK_BG.length]!;

/** Imagen de arte para una clave, o degradado oscuro sobrio si no hay. Rellena a su contenedor (posicionado). */
function ArtImage({ artKey, blur = false }: { artKey: string; blur?: boolean }) {
  const art = artFor(artKey);
  if (!art) return <span className="absolute inset-0" style={{ background: fallbackFor(artKey) }} aria-hidden />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={art.src}
      alt=""
      loading="lazy"
      decoding="async"
      className={`absolute inset-0 h-full w-full object-cover ${blur ? 'scale-110 blur-2xl' : ''}`}
      style={{ objectPosition: art.focus ?? 'center' }}
    />
  );
}

const ART_SIZE = { hero: 'aspect-[16/10] w-full', tile: 'aspect-[4/5] w-[156px] shrink-0', wide: 'aspect-[16/9] w-full' } as const;

/** Tarjeta con arte a sangre, degradado inferior y texto blanco. */
export function ArtCard({ artKey, title, subtitle, label, progress, size = 'tile', fluid, href, onClick, children, className = '' }: {
  artKey: string;
  title: ReactNode;
  subtitle?: ReactNode;
  label?: ReactNode;
  /** 0..1 */
  progress?: number;
  size?: 'hero' | 'tile' | 'wide';
  /** Tile a ancho del contenedor (cuadrículas) en vez de ancho fijo de carrusel. */
  fluid?: boolean;
  href?: string;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
}) {
  const big = size !== 'tile';
  const body = (
    <>
      <ArtImage artKey={artKey} />
      <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" aria-hidden />
      {label && <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">{label}</span>}
      <span className={`absolute inset-x-0 bottom-0 block text-left text-white ${big ? 'p-4' : 'p-3'}`}>
        <span className={`block font-display leading-tight ${big ? 'text-[1.45rem]' : 'text-[1.02rem]'}`}>{title}</span>
        {subtitle && <span className={`mt-0.5 block text-white/75 ${big ? 'line-clamp-2 text-[14px]' : 'line-clamp-2 text-[12px] leading-snug'}`}>{subtitle}</span>}
        {children}
        {progress !== undefined && (
          <span className="mt-2.5 block h-1 overflow-hidden rounded-full bg-white/25" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <span className="block h-full rounded-full bg-gold" style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
          </span>
        )}
      </span>
    </>
  );
  const cls = `tap relative block overflow-hidden rounded-2xl bg-night ${fluid && size === 'tile' ? 'aspect-[4/5] w-full' : ART_SIZE[size]} ${className}`;
  if (href) return <Link href={href} className={cls}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{body}</button>;
  return <div className={cls}>{body}</div>;
}

/** Cabecera de pantalla inmersiva: arte difuminado detrás del título, siempre oscura. */
export function ArtHeader({ artKey, title, subtitle, eyebrow, back, actions, children, className = '' }: {
  artKey: string;
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  back?: string | true;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const backCls = 'flex min-h-[44px] items-center gap-0.5 rounded-full pr-2 text-[15px] text-white/80 hover:text-white';
  return (
    <header className={`theme-prayer relative -mx-5 -mt-[max(1.25rem,env(safe-area-inset-top))] mb-6 overflow-hidden bg-transparent px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] text-white md:-mx-10 md:-mt-10 md:px-10 md:pt-10 ${className}`}>
      <div className="absolute inset-0 opacity-60" aria-hidden>
        <ArtImage artKey={artKey} blur />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-[rgb(var(--bg))]" aria-hidden />
      <div className="relative">
        <div className="flex min-h-[44px] items-center justify-between">
          {back ? (
            back === true ? (
              <button type="button" onClick={() => router.back()} className={`${backCls} -ml-2 pl-2`} aria-label="Volver">
                <ChevronLeft /> Volver
              </button>
            ) : (
              <Link href={back} className={`${backCls} -ml-2 pl-2`} aria-label="Volver">
                <ChevronLeft /> Volver
              </Link>
            )
          ) : (
            <span />
          )}
          {actions && <div className="-mr-2 flex items-center gap-0.5">{actions}</div>}
        </div>
        <div className="mt-6">
          {eyebrow && <p className="mb-1 text-[12px] font-medium text-white/70">{eyebrow}</p>}
          <h1 className="font-display text-[2rem] leading-[1.1]">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[15px] leading-relaxed text-white/75">{subtitle}</p>}
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </header>
  );
}

/** Contenedor oscuro inmersivo para superficies de oración: fuerza la paleta oscura y sangra hasta los bordes. */
export function PrayerScreen({ children, artKey, className = '' }: { children: ReactNode; artKey?: string; className?: string }) {
  return (
    <div className={`theme-prayer relative -mx-5 -mb-[calc(7rem+env(safe-area-inset-bottom))] -mt-[max(1.25rem,env(safe-area-inset-top))] min-h-dvh overflow-hidden px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] md:-mx-10 md:-mb-16 md:-mt-10 md:px-10 md:pb-16 md:pt-10 ${className}`}>
      {artKey && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-40" aria-hidden>
          <ArtImage artKey={artKey} blur />
          <span className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgb(var(--bg))]" />
        </div>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
