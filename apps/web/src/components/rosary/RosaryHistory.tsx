'use client';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { MYSTERY_SET_LABEL } from '@bc/shared';
import { useSettings } from '@/hooks/useSettings';
import { formatLongDate, todayIso } from '@/lib/daily/date';
import { deleteSession, rosaryStats } from '@/lib/rosary/sessions';
import { TrashIcon } from '../icons/Sacred';
import { EmptyState, IconButton, ListGroup, ListRow, ScreenHeader, Section } from '../ui';
import { ROSARY_HISTORY_KEY, useRosaryHistory } from './hooks';

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="card-soft text-center">
      <p className="font-display text-[2rem] leading-none text-gold">{value}</p>
      <p className="mt-1.5 text-[12px] text-muted">{label}</p>
    </div>
  );
}

export function RosaryHistory() {
  const { settings } = useSettings();
  const qc = useQueryClient();
  const q = useRosaryHistory();
  const rows = q.data ?? [];
  const stats = rosaryStats(rows, todayIso(settings.timeZone), settings.timeZone);

  const remove = async (id: string) => {
    if (!window.confirm('¿Quitar este Rosario del historial?')) return;
    await deleteSession(id);
    void qc.invalidateQueries({ queryKey: ROSARY_HISTORY_KEY });
  };

  return (
    <>
      <ScreenHeader title="Mi historial" back="/rosario/" subtitle="Los Rosarios que has rezado, guardados solo en este dispositivo." />
      {q.isLoading ? (
        <p className="text-muted">Cargando…</p>
      ) : rows.length === 0 ? (
        <EmptyState icon="rosary" title="Aún no has terminado ningún Rosario" action={<Link href="/rosario/" className="btn btn-primary">Rezar el Rosario</Link>}>
          Cuando termines uno, aparecerá aquí con su fecha, los misterios y tu intención.
        </EmptyState>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-3 gap-3">
            <Stat value={stats.streak} label={stats.streak === 1 ? 'día seguido' : 'días seguidos'} />
            <Stat value={stats.thisMonth} label="este mes" />
            <Stat value={stats.total} label="en total" />
          </div>
          <Section title="Rosarios rezados">
            <ListGroup>
              {rows.map((r) => {
                const at = new Date(r.completedAt!);
                const day = todayIso(settings.timeZone, at);
                return (
                  <ListRow
                    key={r.id}
                    icon="rosary"
                    title={`${MYSTERY_SET_LABEL[r.set]}`}
                    detail={[formatLongDate(day), r.mode === 'digital' ? 'Digital' : 'Con mi rosario', r.intention && `«${r.intention}»`].filter(Boolean).join(' · ')}
                    trailing={
                      <IconButton label="Quitar del historial" onClick={() => void remove(r.id)}>
                        <TrashIcon size={20} />
                      </IconButton>
                    }
                  />
                );
              })}
            </ListGroup>
          </Section>
        </>
      )}
    </>
  );
}
