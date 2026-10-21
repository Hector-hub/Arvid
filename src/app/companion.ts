import { useEffect } from 'react';
import { COMPANION_NAME, COMPANION_SELF_O, type Companion } from '../domain/arvid/companion';
import { setGlobalVars } from '../i18n';
import { setCompanion } from './scene/engine';

/** Aplica el compañero en el acto: su nombre y su género en todos los textos, y en la escena (spec 08). */
export function applyCompanion(companion: Companion): void {
  setGlobalVars({ companion: COMPANION_NAME[companion], selfO: COMPANION_SELF_O[companion] });
  setCompanion(companion);
}

/** Mantiene aplicado el compañero guardado (al abrir la app o si cambia en otra pestaña). */
export function useCompanionSync(companion: Companion | undefined): void {
  useEffect(() => {
    if (companion) applyCompanion(companion);
  }, [companion]);
}
