interface StatusMeta {
  translationStatus?: 'final' | 'draft' | undefined;
  ecclesiasticalApproval?: boolean | undefined;
  /** Paquetes de versículo diario */
  status?: 'draft' | 'reviewed' | undefined;
}

/** Etiquetas de estado que acompañan siempre al nombre de una versión o paquete. */
export function statusLabels(m: StatusMeta): string[] {
  const out: string[] = [];
  if (m.translationStatus === 'draft') out.push('Borrador');
  if (m.status === 'draft') out.push('Borrador en revisión');
  if (m.ecclesiasticalApproval === false) out.push('Sin aprobación eclesiástica');
  return out;
}

/** « · Borrador · Sin aprobación eclesiástica» para textos de opciones y títulos. */
export const statusSuffix = (m: StatusMeta) => statusLabels(m).map((l) => ` · ${l}`).join('');

export function StatusBadges({ meta, className = '' }: { meta: StatusMeta; className?: string }) {
  const l = statusLabels(meta);
  if (!l.length) return null;
  return (
    <span className={`inline-flex flex-wrap gap-1 ${className}`}>
      {l.map((x) => (
        <span key={x} className="rounded-full bg-warn/10 px-2.5 py-0.5 text-[12px] font-medium text-warn">
          {x}
        </span>
      ))}
    </span>
  );
}

export function Notice({ text }: { text?: string | undefined }) {
  if (!text) return null;
  return <p className="mt-1 text-sm text-muted">{text}</p>;
}
