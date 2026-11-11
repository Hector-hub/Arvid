// Expediente ORIGEN (spec 17, EX): lo que llevas descifrado. Todo sale del estado de la historia; no se guarda nada.
import type { NeighborId } from '../scene/city';
import type { OrigenState } from './origen';
import { currentChapter } from './periods';
import { passedTests } from './programTests';

/** Capítulos de la temporada (EX-02): los que faltan se ven como «Capítulo N · ???». */
export const SEASON_CHAPTERS = 20;
/** Fragmentos del archivo (PR-10). */
export const FRAGMENTS = 30;
/** Hasta este capítulo los guarda el compañero sin poder leerlos (PR-10). */
export const FRAGMENTS_READABLE_FROM = 8;

/** Pista que deja cada paso al entregarse (EX-02): una frase y el chat donde está. */
export const CLUES: { step: string; chat: NeighborId; key: string }[] = [
  { step: 'c2.dex', chat: 'dex', key: 'origen.clue.dex' },
  { step: 'c3.omar', chat: 'omar', key: 'origen.clue.omar' },
  { step: 'c4.lia2', chat: 'lia', key: 'origen.clue.lia' },
  { step: 'c5.nova', chat: 'nova', key: 'origen.clue.nova' },
  { step: 'c5.pip', chat: 'pip', key: 'origen.clue.pip' },
];

/** Capítulos con título y pregunta en i18n (`origen.chapter.N`). */
export const TITLED_CHAPTERS = 5;

export interface Dossier {
  chapters: { n: number; at?: string }[];
  clues: { chat: NeighborId; key: string; at: string }[];
  fragments: number;
  tests: { passed: number; failed: number; refused: number };
  /** «Señal descifrada» (EX-03): 3,5 puntos por capítulo y 1 por fragmento. */
  percent: number;
}

export function dossier(state: OrigenState | undefined): Dossier {
  const opened = currentChapter(state);
  const chapters = Array.from({ length: SEASON_CHAPTERS }, (_, i) => ({ n: i + 1, at: state?.periods?.[i]?.openedAt }));
  const clues = CLUES.flatMap((c) => (state?.steps?.[c.step] ? [{ chat: c.chat, key: c.key, at: state.steps[c.step]! }] : []));
  const fragments = Math.min(FRAGMENTS, passedTests(state?.tests));
  const tests = state?.tests ?? [];
  return {
    chapters,
    clues,
    fragments,
    tests: {
      passed: fragments,
      failed: tests.filter((t) => t.result === 'failed').length,
      refused: tests.filter((t) => t.result === 'rejected' || t.result === 'ignored').length,
    },
    percent: Math.min(100, Math.round(opened * 3.5 + fragments)),
  };
}
