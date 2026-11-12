// Fragmentos del archivo (spec 17, PR-10, H-03): cada prueba superada descifra el siguiente. Hasta el capítulo 8 los
// guarda el compañero sin poder leerlos; desde que Teo los abre, llegan a su chat. Se calculan; no se guarda nada.
import type { OrigenState } from './origen';
import { currentChapter } from './periods';

/** Fragmentos del archivo (PR-10). */
export const FRAGMENTS = 30;
/** Paso en el que Teo empieza a abrir los fragmentos (capítulo 8): desde ahí llegan a su chat. */
export const FRAGMENTS_STEP = 'c8.teo2';
/**
 * Capítulo desde el que puede salir cada fragmento (§9 de `cimientos.md`), en orden: si toca uno que aún no puede
 * salir, espera a su capítulo. Los textos están en i18n (`origen.fragment.N`).
 */
export const FRAGMENT_FROM = [3, 3, 3, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 11, 12, 13, 13, 14, 15, 16, 17, 18, 19, 19, 19];

/** Pruebas superadas, por orden: la enésima descifra el fragmento enésimo. */
function passedAt(state: OrigenState | undefined): string[] {
  return (state?.tests ?? [])
    .filter((t) => t.result === 'passed')
    .map((t) => t.resolvedAt ?? t.offeredAt)
    .sort()
    .slice(0, FRAGMENTS);
}

/** Fragmentos que ya ha descifrado el programa (los lea o no el compañero). */
export const fragmentsEarned = (state: OrigenState | undefined) => passedAt(state).length;

/** Fragmentos que ya se pueden leer, con el número (1–30) y cuándo llegaron al chat de Teo (PR-10). */
export function readableFragments(state: OrigenState | undefined): { n: number; at: string }[] {
  const opened = state?.steps?.[FRAGMENTS_STEP];
  if (!opened) return [];
  const chapter = currentChapter(state);
  const out: { n: number; at: string }[] = [];
  for (const [i, passed] of passedAt(state).entries()) {
    const from = FRAGMENT_FROM[i]!;
    // En orden: si este aún no puede salir, los siguientes tampoco
    if (from > chapter) break;
    const chapterAt = state?.periods?.[from - 1]?.openedAt ?? '';
    out.push({ n: i + 1, at: [passed, opened, chapterAt].reduce((a, b) => (b > a ? b : a)) });
  }
  return out;
}
