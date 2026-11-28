'use client';
/** Diario en la copia de seguridad: casilla «Incluir mi diario» (cifrado) y diálogo para restaurarlo con su contraseña. */
import { useEffect, useState } from 'react';
import { Modal } from '../Modal';
import { Banner, Toggle } from '../ui';
import { MIN_DIARY_PASSWORD } from '@/lib/diary/crypto';

export interface DiaryExportChoice {
  on: boolean;
  password: string;
  confirm: string;
}

export const NO_DIARY_EXPORT: DiaryExportChoice = { on: false, password: '', confirm: '' };

/**
 * Contraseña para cifrar el diario al exportar.
 * undefined = no incluir el diario · string = contraseña válida · null = casilla marcada pero la contraseña no sirve.
 */
export function diaryExportPassword(c: DiaryExportChoice): string | undefined | null {
  if (!c.on) return undefined;
  if (c.password.length < MIN_DIARY_PASSWORD || c.password !== c.confirm) return null;
  return c.password;
}

const field = 'mt-1 block w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-[16px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

export function DiaryExportOption({ value, onChange }: { value: DiaryExportChoice; onChange: (v: DiaryExportChoice) => void }) {
  const pw = diaryExportPassword(value);
  return (
    <div className="mb-4">
      <Toggle
        checked={value.on}
        onChange={(on) => onChange({ ...value, on })}
        label="Incluir mi diario"
        detail="Se guarda cifrado con una contraseña que eliges. Sin esa contraseña no se puede restaurar."
      />
      {value.on && (
        <div className="space-y-3 px-4 pb-2 pt-1">
          <label className="block text-[14px] font-medium">
            Contraseña del diario <span className="font-normal text-muted">(mínimo {MIN_DIARY_PASSWORD} caracteres)</span>
            <input type="password" autoComplete="new-password" className={field} value={value.password} onChange={(e) => onChange({ ...value, password: e.target.value })} />
          </label>
          <label className="block text-[14px] font-medium">
            Repite la contraseña
            <input type="password" autoComplete="new-password" className={field} value={value.confirm} onChange={(e) => onChange({ ...value, confirm: e.target.value })} />
          </label>
          {pw === null && value.confirm.length > 0 && <Banner tone="warn">Las contraseñas deben coincidir y tener al menos {MIN_DIARY_PASSWORD} caracteres.</Banner>}
          <p className="text-[13px] text-muted">Si olvidas la contraseña, el diario de esta copia no podrá recuperarse. Lux no la guarda ni la envía a ningún sitio.</p>
        </div>
      )}
    </div>
  );
}

/** Pide la contraseña del diario antes de restaurar una copia que lo trae cifrado. */
export function DiaryRestoreDialog({ open, busy, error, onCancel, onRestore }: { open: boolean; busy?: boolean; error?: string | null; onCancel: () => void; onRestore: (password: string | undefined) => void }) {
  const [password, setPassword] = useState('');
  // La contraseña no se conserva en memoria cuando el diálogo se cierra.
  useEffect(() => {
    if (!open) setPassword('');
  }, [open]);
  return (
    <Modal
      open={open}
      onClose={() => {
        setPassword('');
        onCancel();
      }}
      title="Diario cifrado"
      variant="dialog"
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (password) onRestore(password);
        }}
      >
        <p className="text-[15px] text-muted">Esta copia incluye tu diario cifrado. Escribe la contraseña que usaste al crearla para restaurarlo, o restaura el resto sin el diario.</p>
        <label className="block text-[14px] font-medium">
          Contraseña del diario
          <input type="password" autoComplete="off" data-autofocus className={field} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <Banner tone="error">{error}</Banner>}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button type="button" className="btn" disabled={busy} onClick={() => onRestore(undefined)}>
            Sin el diario
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || !password}>
            Restaurar con diario
          </button>
        </div>
      </form>
    </Modal>
  );
}
