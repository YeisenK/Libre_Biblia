'use client';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { parseReference } from '@bc/shared';
import { refHref } from '@/lib/links';

export function GoToBox({ version, label = 'Ir a referencia', onDone }: { version: string | null; label?: string; onDone?: () => void }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    try {
      const ref = parseReference(value);
      setError(null);
      setValue('');
      onDone?.();
      router.push(refHref(ref, version));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Referencia no válida');
    }
  }

  return (
    <form onSubmit={submit} role="search" aria-label={label} className="w-full">
      <label htmlFor={id} className="eyebrow mb-2 block">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          className="min-h-[48px] w-full rounded-full bg-sunken px-4 text-base placeholder:text-muted"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Rom 8,28 · Jn 3,16"
          autoCapitalize="off"
          autoCorrect="off"
          enterKeyHint="go"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        <button type="submit" className="btn btn-primary !rounded-full !px-6">
          Ir
        </button>
      </div>
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
