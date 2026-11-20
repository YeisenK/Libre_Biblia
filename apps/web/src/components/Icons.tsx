import type { ReactNode, SVGProps } from 'react';

function Svg({ children, ...p }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      {children}
    </svg>
  );
}
export const HomeIcon = () => <Svg><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" /></Svg>;
export const BookIcon = () => <Svg><path d="M4 5c3-1.2 5.500-1 8 .8v14C9.500 18 7 17.800 4 19zM20 5c-3-1.200-5.500-1-8 .8v14c2.500-1.800 5-2 8-.8z" /></Svg>;
export const SearchIcon = () => <Svg><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></Svg>;
export const BookmarkIcon = () => <Svg><path d="M6 3h12v18l-6-4-6 4z" /></Svg>;
export const SettingsIcon = () => <Svg><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.900 4.900l2.100 2.100M17 17l2.100 2.100M4.900 19.100L7 17M17 7l2.100-2.100" /></Svg>;
export const ColumnsIcon = () => <Svg><rect x="3" y="4" width="8" height="16" rx="1" /><rect x="13" y="4" width="8" height="16" rx="1" /></Svg>;
export const ChevronLeft = () => <Svg><path d="M15 5l-7 7 7 7" /></Svg>;
export const ChevronRight = () => <Svg><path d="M9 5l7 7-7 7" /></Svg>;
export const ChevronDown = () => <Svg width="18" height="18"><path d="M6 9l6 6 6-6" /></Svg>;
export const UserIcon = () => <Svg><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></Svg>;
export const InfoIcon = () => <Svg><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.500v.01" /></Svg>;
export const CloseIcon = () => <Svg><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const WifiOffIcon = () => <Svg width="16" height="16"><path d="M2 2l20 20M5 12.500a10 10 0 0 1 5-2.600M19 12.500a10 10 0 0 0-3-2M8.500 16a5 5 0 0 1 7 0M12 20h.01" /></Svg>;
export const LibraryIcon = () => <Svg><path d="M4 4h4v16H4zM10 4h4v16h-4zM16.500 5l3.500 1-3.500 14-3.500-1z" /></Svg>;
export const DownloadIcon = () => <Svg><path d="M12 3v12M7 11l5 5 5-5M4 20h16" /></Svg>;
