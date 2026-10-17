import { useEffect } from 'react';
import type { Settings } from '../data/repository';

/** Aplica el ajuste de movimiento reducido (SET-02, C-003) como `data-motion` en la raíz. */
export function useMotionPreference(setting: Settings['reducedMotion'] | undefined) {
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const apply = () => {
      const reduced = setting === 'on' || (setting !== 'off' && media?.matches === true);
      document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
    };
    apply();
    media?.addEventListener?.('change', apply);
    return () => media?.removeEventListener?.('change', apply);
  }, [setting]);
}
