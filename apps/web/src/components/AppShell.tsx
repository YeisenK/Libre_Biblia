'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { SunIcon, BookIcon, BookmarkIcon, ColumnsIcon, HomeIcon, InfoIcon, LibraryIcon, DownloadIcon, SearchIcon, SettingsIcon } from './Icons';

const MAIN = [
  { href: '/', label: 'Inicio', Icon: HomeIcon },
  { href: '/leer/', label: 'Leer', Icon: BookIcon },
  { href: '/buscar/', label: 'Buscar', Icon: SearchIcon },
  { href: '/marcadores/', label: 'Marcadores', Icon: BookmarkIcon },
  { href: '/ajustes/', label: 'Ajustes', Icon: SettingsIcon },
];
const EXTRA = [
  { href: '/hoy/', label: 'Hoy', Icon: SunIcon },
  { href: '/comparar/', label: 'Comparar', Icon: ColumnsIcon },
  { href: '/biblioteca/', label: 'Biblioteca', Icon: LibraryIcon },
  { href: '/descargas/', label: 'Contenido', Icon: DownloadIcon },
  { href: '/fuentes/', label: 'Fuentes y licencias', Icon: InfoIcon },
];

function active(path: string, href: string) {
  const p = path.replace(/\/$/, '') || '/';
  const h = href.replace(/\/$/, '') || '/';
  return h === '/' ? p === '/' : p === h || p.startsWith(h + '/');
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();

  const link = (i: (typeof MAIN)[number], cls: string, activeCls: string) => (
    <Link key={i.href} href={i.href} aria-current={active(path, i.href) ? 'page' : undefined} className={`${cls} ${active(path, i.href) ? activeCls : ''}`}>
      <i.Icon />
      <span>{i.label}</span>
    </Link>
  );

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface p-4 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 font-serif text-xl font-semibold">
          <img src="/icons/icon.svg" alt="" width={32} height={32} className="rounded-lg" />
          Libre Biblia
        </Link>
        <nav aria-label="Principal" className="flex flex-1 flex-col gap-1">
          {[MAIN[0]!, EXTRA[0]!, ...MAIN.slice(1, 3), EXTRA[1]!, EXTRA[2]!, EXTRA[3]!, MAIN[3]!, MAIN[4]!].map((i) =>
            link(i, 'flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-sunken', 'bg-sunken text-accent'),
          )}
          <div className="mt-auto flex flex-col gap-1">
            {link(EXTRA[4]!, 'flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm text-muted hover:bg-sunken', 'bg-sunken text-accent')}
          </div>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-5xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] md:px-8 md:pb-12 md:pt-8">{children}</main>
      </div>

      <nav aria-label="Principal" className="pb-safe fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 backdrop-blur md:hidden">
        {MAIN.map((i) => link(i, 'flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] text-muted', '!text-accent font-semibold'))}
      </nav>
    </div>
  );
}
