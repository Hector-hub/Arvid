import { describe, expect, it } from 'vitest';
import { keysOf } from '../../i18n';
import { FRAGMENT_FROM, FRAGMENTS, FRAGMENTS_STEP, fragmentsEarned, readableFragments } from './fragments';
import type { OrigenState } from './origen';
import type { ProgramTest } from './programTests';

const at = (d: number) => new Date(Date.UTC(2026, 10, d, 10)).toISOString();
const passed = (n: number, d: number): ProgramTest => ({
  n,
  type: 'fullDays',
  times: 3,
  period: 1,
  offeredAt: at(d),
  offeredOn: '2026-11-01' as never,
  result: 'passed',
  resolvedAt: at(d),
});
/** Estado con `chapters` capítulos abiertos, uno por semana. */
const state = (chapters: number, tests: ProgramTest[], teo = true): OrigenState => ({
  choice: 'investigate',
  contactAt: at(1),
  periods: Array.from({ length: chapters }, (_, i) => ({ openedAt: at(1 + i * 7), xpAtOpen: 0 })),
  steps: teo ? { [FRAGMENTS_STEP]: at(2) } : {},
  tests,
});

describe('fragmentos del archivo (PR-10)', () => {
  it('hay 30, en orden de capítulo, con su texto en es y en', () => {
    expect(FRAGMENT_FROM).toHaveLength(FRAGMENTS);
    expect([...FRAGMENT_FROM].sort((a, b) => a - b)).toEqual(FRAGMENT_FROM);
    // Ninguno sale después de la última prueba posible ni antes de la primera (capítulo 3)
    expect(Math.min(...FRAGMENT_FROM)).toBe(3);
    expect(Math.max(...FRAGMENT_FROM)).toBeLessThan(20);
    for (const locale of ['es', 'en'] as const)
      for (let n = 1; n <= FRAGMENTS; n++) expect(keysOf(locale)).toContain(`origen.fragment.${n}`);
  });

  it('antes de que Teo los abra, el compañero los guarda sin leerlos', () => {
    const s = state(6, [passed(1, 10)], false);
    expect(fragmentsEarned(s)).toBe(1);
    expect(readableFragments(s)).toEqual([]);
  });

  it('cada prueba superada descifra el siguiente, que espera a su capítulo (§9 de cimientos)', () => {
    const tests = [10, 12, 14, 16, 18, 20, 22, 24].map((d, i) => passed(i + 1, d));
    // En el capítulo 4 salen los cinco del capítulo 3 y los dos del 4; el octavo (capítulo 5) espera
    expect(readableFragments(state(4, tests)).map((f) => f.n)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(readableFragments(state(5, tests)).map((f) => f.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    // Llega cuando pasa lo último: la prueba, que Teo los abra o el capítulo
    expect(readableFragments(state(5, tests)).at(-1)!.at).toBe(at(29));
  });

  it('las pruebas no superadas no cuentan', () => {
    const s = state(8, [{ ...passed(1, 10), result: 'failed' }, passed(2, 12)]);
    expect(readableFragments(s).map((f) => f.n)).toEqual([1]);
  });
});
