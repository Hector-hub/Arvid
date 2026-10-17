import { describe, expect, it } from 'vitest';
import { activity, d, days } from '../testing/fixtures';
import { analyze } from './progress';

// NFR2-01: un año con 10 actividades diarias (~3 650 periodos) en < 50 ms en un Android de gama media.
// En el equipo de desarrollo se exige < 25 ms (mediana de 5 ejecuciones) como margen.
describe('rendimiento (NFR2-01)', () => {
  it('progreso y rachas de un año con 10 actividades diarias', () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      activity(`a${i}`, { period: 'day', target: 1, createdOn: '2025-10-15', logs: days('2025-10-15', 365).filter((_, j) => (j + i) % 5 !== 0) }),
    );
    const today = d('2026-10-14');
    const run = () => analyze(records, today);
    run();
    const times = Array.from({ length: 5 }, () => {
      const start = performance.now();
      run();
      return performance.now() - start;
    }).sort((a, b) => a - b);
    expect(times[2]).toBeLessThan(25);
  });
});
