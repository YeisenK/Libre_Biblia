/** Estrella de luz de Lux (ver scripts/brand.mjs). Hereda el color del texto (`currentColor`). */
const STAR = 'M256 56L284 228L384 256L284 284L256 456L228 284L128 256L228 228Z';

export function LuxMark({ size = 28, className = '', title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      <circle cx="256" cy="256" r="150" fill="none" stroke="currentColor" strokeOpacity=".28" strokeWidth="6" />
      <path d={STAR} fill="currentColor" />
    </svg>
  );
}

/** Logotipo: estrella + «Lux». `stacked` los apila (pantalla de bienvenida). */
export function LuxLogo({ size = 28, stacked = false, showName = true, className = '' }: { size?: number; stacked?: boolean; showName?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center ${stacked ? 'flex-col gap-3' : 'gap-2'} ${className}`}>
      <span className="text-accent"><LuxMark size={size} title={showName ? undefined : 'Lux'} /></span>
      {showName && <span className="font-display leading-none" style={{ fontSize: size * (stacked ? 0.9 : 0.78) }}>Lux</span>}
    </span>
  );
}
