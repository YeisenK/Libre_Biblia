'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { EmptyState, PrayerScreen } from '../ui';
import { useRosarySession } from './hooks';
import { RosaryIntro } from './RosaryIntro';
import { RosaryPlayer } from './RosaryPlayer';

/** `/rosario/` es la introducción; `/rosario/?s=<id>` es el rezo guiado de esa sesión. */
export function RosaryRoute() {
  const id = useSearchParams().get('s');
  const q = useRosarySession(id);
  if (!id) return <PrayerScreen artKey="home:default"><RosaryIntro /></PrayerScreen>;
  if (q.isLoading) return <PrayerScreen><p className="text-muted">Cargando…</p></PrayerScreen>;
  if (!q.data) {
    return (
      <PrayerScreen>
      <EmptyState icon="rosary" title="No encontramos ese rezo" action={<Link href="/rosario/" className="btn btn-primary">Volver al Rosario</Link>}>
        Puede que ya lo hayas terminado o quitado.
      </EmptyState>
      </PrayerScreen>
    );
  }
  return <RosaryPlayer key={q.data.id} session={q.data} />;
}
