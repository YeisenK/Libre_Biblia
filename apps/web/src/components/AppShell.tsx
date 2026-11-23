'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';
import { useHideOnScroll } from '@/hooks/useHideOnScroll';
import { BookmarkIcon, ColumnsIcon, DownloadIcon, HomeIcon, InfoIcon, LibraryIcon, SearchIcon, SettingsIcon, SunIcon } from './Icons';
import { BookOpenIcon, HandsIcon, MoreIcon } from './icons/Sacred';

type Dest = 'inicio' | 'orar' | 'biblia' | 'biblioteca' | 'mas';
type Icon = ComponentType<{ size?: number }>;

/** Los cinco destinos principales (barra inferior y lateral). */
const MAIN: { id: Dest; href: string; label: string; Icon: Icon }[] = [
  { id: 'inicio', href: '/', label: 'Inicio', Icon: () => <HomeIcon /> },
  { id: 'orar', href: '/orar/', label: 'Orar', Icon: () => <HandsIcon size={22} /> },
  { id: 'biblia', href: '/leer/', label: 'Biblia', Icon: () => <BookOpenIcon size={22} /> },
  { id: 'biblioteca', href: '/biblioteca/', label: 'Biblioteca', Icon: () => <LibraryIcon /> },
  { id: 'mas', href: '/mas/', label: 'Más', Icon: () => <MoreIcon size={22} /> },
];

/** Accesos secundarios solo en la barra lateral de escritorio. */
const SECONDARY: { href: string; label: string; Icon: Icon }[] = [
  { href: '/hoy/', label: 'Hoy', Icon: () => <SunIcon /> },
  { href: '/buscar/', label: 'Buscar', Icon: () => <SearchIcon /> },
  { href: '/comparar/', label: 'Comparar', Icon: () => <ColumnsIcon /> },
  { href: '/marcadores/', label: 'Marcadores', Icon: () => <BookmarkIcon /> },
  { href: '/descargas/', label: 'Contenido', Icon: () => <DownloadIcon /> },
  { href: '/ajustes/', label: 'Ajustes', Icon: () => <SettingsIcon /> },
  { href: '/fuentes/', label: 'Fuentes y licencias', Icon: () => <InfoIcon /> },
];

const GROUPS: Record<Dest, string[]> = {
  inicio: ['/hoy'],
  orar: ['/orar', '/oracion', '/oraciones', '/novena', '/novenas', '/rutina', '/rutinas', '/rosario'],
  biblia: ['/leer', '/comparar', '/buscar'],
  biblioteca: ['/biblioteca', '/documento'],
  mas: ['/mas', '/marcadores', '/ajustes', '/descargas', '/fuentes'],
};

const norm = (p: string) => p.replace(/\/$/, '') || '/';
const within = (path: string, base: string) => path === base || path.startsWith(base + '/');

/** Destino principal que se ilumina para una ruta. */
export function destinationOf(pathname: string): Dest | null {
  const p = norm(pathname);
  if (p === '/') return 'inicio';
  for (const id of Object.keys(GROUPS) as Dest[]) if (GROUPS[id].some((b) => within(p, b))) return id;
  return null;
}

/** Marca de la app: solo el nombre, en sans. */
function Brand() {
  return (
    <Link href="/" className="font-display text-[1.35rem] leading-none" aria-label="Libre Biblia, inicio">
      Libre Biblia
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname() ?? '/';
  const dest = destinationOf(path);
  const hide = useHideOnScroll();
  // En la lectura larga la barra inferior se retira al bajar y vuelve al subir.
  const reading = within(norm(path), '/leer') || within(norm(path), '/documento');
  const barHidden = reading && hide;
  const dark = dest === 'orar' && !within(norm(path), '/rosario');
  const secondaryActive = (href: string) => norm(path) === norm(href);

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-bg px-4 py-6 md:flex">
        <div className="mb-8 px-2">
          <Brand />
        </div>
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {MAIN.map((i) => {
            const on = dest === i.id;
            return (
              <Link
                key={i.id}
                href={i.href}
                aria-current={on ? 'page' : undefined}
                className={`tap flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-[15px] transition-colors hover:bg-sunken ${on ? 'font-semibold text-fg' : 'font-medium text-muted'}`}
              >
                <i.Icon />
                <span>{i.label}</span>
              </Link>
            );
          })}
        </nav>
        <p className="eyebrow mb-2 mt-8 px-3">Atajos</p>
        <nav aria-label="Secundaria" className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {SECONDARY.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={secondaryActive(i.href) ? 'page' : undefined}
              className={`flex min-h-[40px] items-center gap-3 rounded-lg px-3 text-[13.5px] transition-colors hover:bg-sunken ${secondaryActive(i.href) ? 'font-semibold text-fg' : 'text-muted'}`}
            >
              <i.Icon />
              <span>{i.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-5xl px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] md:px-10 md:pb-16 md:pt-10">{children}</main>
      </div>

      <nav
        aria-label="Principal"
        className={`${dark ? 'theme-prayer ' : ''}pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur-xl transition-transform duration-200 md:hidden ${barHidden ? 'translate-y-full' : ''}`}
      >
        <ul className="mx-auto grid max-w-xl grid-cols-5 px-1 pt-1">
          {MAIN.map((i) => {
            const on = dest === i.id;
            return (
              <li key={i.id}>
                <Link
                  href={i.href}
                  aria-current={on ? 'page' : undefined}
                  className={`tap flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] ${on ? 'font-semibold text-fg' : 'text-muted'}`}
                >
                  <span className="grid h-7 w-12 place-items-center">
                    <i.Icon />
                  </span>
                  <span>{i.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
