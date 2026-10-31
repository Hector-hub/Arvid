import { createContext, useContext } from 'react';

/** Abre la hoja de Sonido (2.0.2); la pone `SoundSheetProvider`. Aparte para no importar la hoja desde la bocina. */
export const SoundSheetCtx = createContext<() => void>(() => undefined);

export function useOpenSound() {
  return useContext(SoundSheetCtx);
}
