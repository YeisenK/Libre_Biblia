'use client';
/** Cabecera común de las pantallas de entrada de las prácticas (oscuras e inmersivas). */
import type { ReactNode } from 'react';
import { PrayerScreen, ScreenHeader, EmptyState } from '../ui';

export function PracticeScreen({ artKey, title, subtitle, back = '/orar/', children }: { artKey: string; title: string; subtitle?: ReactNode; back?: string; children: ReactNode }) {
  return (
    <PrayerScreen artKey={artKey}>
      <div className="mx-auto max-w-2xl">
        <ScreenHeader back={back} title={title} subtitle={subtitle} />
        {children}
      </div>
    </PrayerScreen>
  );
}

export function PreparingNotice() {
  return <EmptyState title="Preparando el devocionario…">Las prácticas guiadas se están instalando. Vuelve en unos instantes.</EmptyState>;
}
