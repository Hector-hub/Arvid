import { useEffect, useSyncExternalStore } from 'react';
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

function subscribeMotion(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  return () => observer.disconnect();
}

/** Movimiento reducido efectivo (ajuste o sistema), leído de `data-motion`; cambia en vivo (spec 05, ESC-11). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => document.documentElement.dataset.motion === 'reduced',
    () => false,
  );
}
