'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { CloseIcon } from './Icons';
import { registerModal } from '@/lib/native/modalStack';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** 'sheet' = hoja inferior en móvil, diálogo centrado en escritorio */
  variant?: 'sheet' | 'dialog';
  wide?: boolean;
}

/** Diálogo accesible: Escape, clic fuera, foco inicial y retorno de foco. */
export function Modal({ open, onClose, title, children, variant = 'sheet', wide }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // onClose suele ser una función nueva en cada render: se guarda en una ref para que el efecto
  // (enfoque inicial, trampa de foco) no se repita al escribir y no robe el foco del campo activo.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onClose = () => closeRef.current();
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const focusable = () => Array.from(el?.querySelectorAll<HTMLElement>('input,button,select,textarea,a[href],[tabindex]:not([tabindex="-1"])') ?? []).filter((n) => !n.hasAttribute('disabled'));
    (el?.querySelector<HTMLElement>('[data-autofocus]') ?? focusable()[1] ?? focusable()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose();
      if (e.key !== 'Tab') return;
      const f = focusable();
      if (!f.length) return;
      const first = f[0]!, last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
      else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
    };
    const unregister = registerModal(onClose);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      unregister();
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  const pos = variant === 'sheet' ? 'items-end md:items-center' : 'items-center';
  const anim = variant === 'sheet' ? 'animate-slide-up md:animate-pop-in' : 'animate-pop-in';
  const round = variant === 'sheet' ? 'rounded-t-2xl md:rounded-2xl' : 'rounded-2xl';
  return (
    <div className={`fixed inset-0 z-50 flex justify-center ${pos}`}>
      <div className="absolute inset-0 animate-fade-in bg-black/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`pb-safe relative flex max-h-[85dvh] w-full flex-col border border-line bg-surface shadow-lift ${wide ? 'md:max-w-2xl' : 'md:max-w-md'} ${round} ${anim}`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-2">
          <h2 className="font-display text-[1.15rem]">{title}</h2>
          <button type="button" onClick={onClose} className="btn !min-w-[44px] !border-transparent !bg-transparent !px-2" aria-label="Cerrar">
            <CloseIcon />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain p-5">{children}</div>
      </div>
    </div>
  );
}
