'use client';
import { useEffect, useState } from 'react';

/** true cuando el usuario baja por la página; vuelve a false al subir o al estar arriba. */
export function useHideOnScroll(threshold = 8, minY = 80): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const d = y - last;
        if (y < minY) setHidden(false);
        else if (d > threshold) setHidden(true);
        else if (d < -threshold) setHidden(false);
        if (Math.abs(d) > threshold || y < minY) last = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold, minY]);
  return hidden;
}
