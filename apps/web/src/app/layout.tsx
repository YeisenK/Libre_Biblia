import type { Metadata, Viewport } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AppShell } from '@/components/AppShell';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const serif = Source_Serif_4({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Libre Biblia', template: '%s · Libre Biblia' },
  description: 'Biblia, oración, Rosario y novenas: lectura, comparación de versiones, búsqueda y vida de oración católica.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icons/icon.svg', apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'Libre Biblia', statusBarStyle: 'black-translucent' },
};
export const viewport: Viewport = { themeColor: '#0b0b12', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

// Evita el parpadeo de tema antes de hidratar.
const themeScript = `try{var s=JSON.parse(localStorage.getItem('bc.settings')||'{}');var t=s.theme||'dark';if(t==='system')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t);if(s.fontScale)document.documentElement.style.setProperty('--font-scale',s.fontScale);if(s.lineHeight)document.documentElement.style.setProperty('--line-height',s.lineHeight)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
