import type { Config } from 'tailwindcss';

const c = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: c('bg'),
        surface: c('surface'),
        sunken: c('sunken'),
        fg: c('fg'),
        muted: c('muted'),
        line: c('line'),
        accent: c('accent'),
        'accent-fg': c('accent-fg'),
        'accent-fill': c('accent-fill'),
        mark: c('mark'),
        danger: c('danger'),
        warn: c('warn'),
        raised: c('raised'),
        gold: c('gold'),
        'gold-soft': c('gold-soft'),
        ok: c('ok'),
        ink: c('ink'),
        'ink-fg': c('ink-fg'),
        night: c('night'),
        'night-2': c('night-2'),
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      maxWidth: { reading: '65ch' },
      boxShadow: {
        soft: '0 1px 2px rgb(0 0 0 / .03)',
        lift: '0 1px 3px rgb(0 0 0 / .06), 0 8px 24px -12px rgb(0 0 0 / .18)',
        glow: '0 0 0 1px rgb(var(--gold) / .35), 0 0 18px rgb(var(--gold) / .45)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'pop-in': { from: { opacity: '0', transform: 'scale(.97)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'rise-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out',
        'slide-up': 'slide-up .22s ease-out',
        'pop-in': 'pop-in .14s ease-out',
        'rise-in': 'rise-in .35s cubic-bezier(.2,.7,.2,1)',
      },
    },
  },
  plugins: [],
};
export default config;
