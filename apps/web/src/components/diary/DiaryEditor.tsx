'use client';
/** Formulario de una entrada del diario (crear o editar). Todo local. */
import { useEffect, useState } from 'react';
import { Modal } from '../Modal';
import { Banner, Segmented } from '../ui';
import { usePrayerCatalog } from '@/hooks/usePrayers';
import { getDb, type DiaryEntryRow } from '@/lib/db';
import { DIARY_KINDS, DIARY_KIND_LABEL, MAX_TEXT, MAX_TITLE, bibleRef, parseRef, type DiaryKind, type IntentionStatus } from '@/lib/diary/model';
import { createEntry, updateEntry } from '@/lib/diary/store';
import { todayIso } from '@/lib/daily/date';

type StatusChoice = 'ninguno' | IntentionStatus;

export function DiaryEditor({ open, onClose, row, defaultDate }: { open: boolean; onClose: () => void; row?: DiaryEntryRow; defaultDate: string }) {
  const { data: cat } = usePrayerCatalog();
  const [kind, setKind] = useState<DiaryKind>('reflection');
  const [date, setDate] = useState(defaultDate);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [bible, setBible] = useState('');
  const [prayer, setPrayer] = useState('');
  const [status, setStatus] = useState<StatusChoice>('ninguno');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Al abrir: rellena con la entrada a editar o con un formulario vacío.
  useEffect(() => {
    if (!open) return;
    const ref = row?.refs?.map(parseRef).filter(Boolean) ?? [];
    setKind(row?.kind ?? 'reflection');
    setDate(row?.date ?? defaultDate);
    setTitle(row?.title ?? '');
    setText(row?.text ?? '');
    setBible(ref.find((r) => r?.kind === 'bible')?.id ?? '');
    const p = ref.find((r) => r && r.kind !== 'bible');
    setPrayer(p ? `${p.kind}:${p.id}` : '');
    setStatus(row?.status ?? 'ninguno');
    setErr(null);
    setBusy(false);
  }, [open, row, defaultDate]);

  const prayers = cat ? [...cat.prayers.map((p) => ({ key: `prayer:${p.id}`, title: p.title })), ...cat.novenas.map((n) => ({ key: `novena:${n.id}`, title: `Novena: ${n.title}` }))] : [];
  const selectedMissing = prayer && !prayers.some((p) => p.key === prayer);

  async function save() {
    setBusy(true);
    setErr(null);
    const refs = [bible.trim() ? bibleRef(bible) : null, prayer || null].filter((x): x is string => !!x);
    const draft = {
      date: date || todayIso(),
      kind,
      title: title.trim() || undefined,
      text,
      refs,
      status: kind === 'intention' && status !== 'ninguno' ? status : undefined,
    };
    try {
      if (row) await updateEntry(row.id, { ...draft, refs, title: draft.title, status: draft.status }, getDb());
      else await createEntry(draft, getDb());
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }

  const field = 'mt-1 block w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-[16px] text-fg placeholder:text-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';
  const label = 'block text-[14px] font-medium';

  return (
    <Modal open={open} onClose={onClose} title={row ? 'Editar entrada' : 'Nueva entrada'} variant="dialog">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label className={label}>
          Tipo
          <select className={field} value={kind} onChange={(e) => setKind(e.target.value as DiaryKind)}>
            {DIARY_KINDS.map((k) => (
              <option key={k} value={k}>
                {DIARY_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          Fecha
          <input type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>

        {kind === 'intention' && (
          <div>
            <p className={label}>Estado <span className="font-normal text-muted">(opcional)</span></p>
            <div className="mt-1">
              <Segmented<StatusChoice>
                label="Estado de la intención"
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'ninguno', label: 'Sin estado' },
                  { value: 'encomendada', label: 'Encomendada' },
                  { value: 'atendida', label: 'Atendida' },
                ]}
              />
            </div>
          </div>
        )}

        <label className={label}>
          Título <span className="font-normal text-muted">(opcional)</span>
          <input className={field} value={title} maxLength={MAX_TITLE} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className={label}>
          Texto
          <textarea className={`${field} min-h-[160px] leading-relaxed`} value={text} maxLength={MAX_TEXT} onChange={(e) => setText(e.target.value)} required rows={7} />
        </label>

        <label className={label}>
          Pasaje bíblico <span className="font-normal text-muted">(opcional)</span>
          <input className={field} value={bible} placeholder="Ej.: Jn 8,12" onChange={(e) => setBible(e.target.value)} />
        </label>

        <label className={label}>
          Oración o novena <span className="font-normal text-muted">(opcional)</span>
          <select className={field} value={prayer} onChange={(e) => setPrayer(e.target.value)}>
            <option value="">Ninguna</option>
            {selectedMissing && <option value={prayer}>{prayer}</option>}
            {prayers.map((p) => (
              <option key={p.key} value={p.key}>
                {p.title}
              </option>
            ))}
          </select>
        </label>

        {err && <Banner tone="error">{err}</Banner>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}
