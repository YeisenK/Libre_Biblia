import type { Authority, PackSource } from '@bc/shared';

export const AUTHORITY_LABEL: Record<Authority, string> = {
  scripture: 'Sagrada Escritura',
  magisterium: 'Magisterio',
  patristic: 'Padres de la Iglesia',
  spiritual_classic: 'Clásico espiritual',
  devotional: 'Devocional (no litúrgico oficial)',
  theological_opinion: 'Opinión teológica',
  academic_hypothesis: 'Hipótesis académica',
  literary: 'Obra literaria',
  personal: 'Personal',
};

export const isPublicDomain = (license: string) => /dominio p[uú]blico|public domain|\bPD\b|CC0/i.test(license);

export function LicenseBadge({ license, authority }: { license: string; authority?: Authority }) {
  const pd = isPublicDomain(license);
  return (
    <span className="inline-flex flex-wrap gap-1">
      {authority && <span className="rounded-full bg-sunken px-2 py-0.5 text-xs text-muted">{AUTHORITY_LABEL[authority]}</span>}
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pd ? 'bg-accent text-accent-fg' : 'bg-sunken text-muted'}`}>{pd ? 'Dominio público' : 'Licencia específica'}</span>
    </span>
  );
}

export function PackSourceInfo({ source, edition }: { source: PackSource; edition?: string | null }) {
  const link = (u: string) => (
    <a className="break-all text-accent underline" href={u} target="_blank" rel="noopener noreferrer">
      {u}
    </a>
  );
  return (
    <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[8rem_1fr]">
      {edition && (<><dt className="text-muted">Edición</dt><dd>{edition}</dd></>)}
      <dt className="text-muted">Fuente</dt>
      <dd>{source.name}</dd>
      <dt className="text-muted">Licencia</dt>
      <dd>{source.licenseUrl ? <a className="text-accent underline" href={source.licenseUrl} target="_blank" rel="noopener noreferrer">{source.license}</a> : source.license}</dd>
      <dt className="text-muted">Procedencia</dt>
      <dd>{link(source.provenanceUrl)}</dd>
      <dt className="text-muted">Obtenida</dt>
      <dd>{new Date(source.retrievedAt).toLocaleDateString('es')}</dd>
      {source.notes && (<><dt className="text-muted">Notas</dt><dd>{source.notes}</dd></>)}
    </dl>
  );
}
