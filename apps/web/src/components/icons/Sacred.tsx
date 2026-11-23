import type { ReactNode, SVGProps } from 'react';

type P = { size?: number; className?: string };

function Svg({ children, size = 22, ...p }: Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> & { children: ReactNode; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      {children}
    </svg>
  );
}

export const CrossIcon = (p: P) => <Svg {...p}><path d="M12 3v18M7 8h10" /></Svg>;
export const HandsIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 21V10.5c0-1.2-.6-2.4-1.6-3.1L8 5.6M12 21V10.5c0-1.2.6-2.4 1.6-3.1L16 5.6" />
    <path d="M8 5.6 6.6 11a4 4 0 0 0 .8 3.6L10 18M16 5.6l1.4 5.4a4 4 0 0 1-.8 3.6L14 18" />
  </Svg>
);
export const RosaryIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="5.2" strokeDasharray="0.1 2.6" strokeWidth="2.4" />
    <path d="M12 13.2v3M12 16.2v4.8M10 18.4h4" />
  </Svg>
);
export const CandleIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 3c1.4 1.6 1.8 2.8 0 4.4C10.2 5.8 10.6 4.6 12 3z" />
    <rect x="9" y="9" width="6" height="12" rx="1" />
  </Svg>
);
export const DoveIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 13c3 0 5-1 7-3l3-3c1-1 3-1 4 0l1 1-2 1c0 4-3 8-8 8H6l2-2c-2 0-4-1-5-2z" />
    <path d="M13 7 9 4" />
  </Svg>
);
export const MoonIcon = (p: P) => <Svg {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" /></Svg>;
export const SunriseIcon = (p: P) => <Svg {...p}><path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 4v4M5.6 9.6l1.5 1.5M18.4 9.6l-1.5 1.5M2 14h2M20 14h2" /></Svg>;
export const SunsetIcon = (p: P) => <Svg {...p}><path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 9V5M10 7l2 2 2-2M2 14h2M20 14h2" /></Svg>;
export const StarIcon = (p: P) => <Svg {...p}><path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z" /></Svg>;
export const ShieldIcon = (p: P) => <Svg {...p}><path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z" /><path d="M12 8v8M9 11h6" /></Svg>;
export const CrownIcon = (p: P) => <Svg {...p}><path d="M4 18h16l1-10-5 4-4-6-4 6-5-4z" /></Svg>;
export const AngelIcon = (p: P) => (
  <Svg {...p}>
    <ellipse cx="12" cy="4.5" rx="3" ry="1.2" />
    <circle cx="12" cy="9" r="2.4" />
    <path d="M8 21l1.5-7h5L16 21zM9.5 14C6 13 4 10 3.5 7c2.5 1 4.5 2.5 6 5M14.5 14c3.5-1 5.5-4 6-7-2.5 1-4.5 2.5-6 5" />
  </Svg>
);
export const HeartFlameIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 21s-7-4.2-8.5-8.6A4.6 4.6 0 0 1 12 9a4.6 4.6 0 0 1 8.5 3.4C19 16.8 12 21 12 21z" />
    <path d="M12 9V6M10.5 4.5 12 3l1.5 1.5" />
  </Svg>
);
export const BreadIcon = (p: P) => <Svg {...p}><path d="M5 11a7 5 0 0 1 14 0v8H5z" /><path d="M9 11v3M12 10v4M15 11v3" /></Svg>;
export const FamilyIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="8" cy="6" r="2.2" /><circle cx="16" cy="6" r="2.2" /><circle cx="12" cy="12" r="1.7" />
    <path d="M4 20v-5a4 4 0 0 1 8 0M12 20v-5a4 4 0 0 1 8 0M10 20v-2a2 2 0 0 1 4 0v2" />
  </Svg>
);
export const HoursIcon = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2M12 1.8v1.5" /></Svg>;
export const BookOpenIcon = (p: P) => <Svg {...p}><path d="M3 5.5c3-1 6-.8 9 1.2v13c-3-2-6-2.2-9-1.2zM21 5.5c-3-1-6-.8-9 1.2v13c3-2 6-2.2 9-1.2z" /></Svg>;
export const PlayIcon = (p: P) => <Svg {...p}><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" /></Svg>;
export const PauseIcon = (p: P) => <Svg {...p}><path d="M8 5v14M16 5v14" strokeWidth="2.6" /></Svg>;
export const CheckIcon = (p: P) => <Svg {...p}><path d="m5 12.5 4.2 4.2L19 7" /></Svg>;
export const PlusIcon = (p: P) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const GripIcon = (p: P) => <Svg {...p}><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth="2.6" /></Svg>;
export const BellIcon = (p: P) => <Svg {...p}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" /></Svg>;
export const TextSizeIcon = (p: P) => <Svg {...p}><path d="M3 19 8 6l5 13M4.8 14.5h6.4M14 19l3.5-9 3.5 9M15.1 16.2h4.8" /></Svg>;
export const MoreIcon = (p: P) => <Svg {...p}><path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3" /></Svg>;
export const ArrowUpIcon = (p: P) => <Svg {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Svg>;
export const ArrowDownIcon = (p: P) => <Svg {...p}><path d="M12 5v14M6 13l6 6 6-6" /></Svg>;
export const TrashIcon = (p: P) => <Svg {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></Svg>;
export const VolumeIcon = (p: P) => <Svg {...p}><path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /></Svg>;

/** Icono por clave de categoría/novena (ver `PrayerCategory.icon`). */
export function SacredIcon({ name, ...p }: P & { name?: string }) {
  const I =
    {
      cross: CrossIcon,
      sun: SunriseIcon,
      sunset: SunsetIcon,
      moon: MoonIcon,
      rosary: RosaryIcon,
      dove: DoveIcon,
      heart: HeartFlameIcon,
      star: StarIcon,
      candle: CandleIcon,
      shield: ShieldIcon,
      bread: BreadIcon,
      family: FamilyIcon,
      hours: HoursIcon,
      book: BookOpenIcon,
      angel: AngelIcon,
      crown: CrownIcon,
      hands: HandsIcon,
    }[name ?? 'cross'] ?? CrossIcon;
  return <I {...p} />;
}
