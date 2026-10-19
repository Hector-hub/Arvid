import { describe, expect, it } from 'vitest';
import { evaluateAchievements } from './achievements/achievements';
import { computeProfile, scoresFromAnalysis } from './attributes/attributes';
import { analyze } from './progress/progress';
import { d } from './testing/fixtures';
import { yearData } from './testing/yearData';

// RE-02: con un año de datos (12 actividades y 60 misiones), el cálculo completo que hace la app al abrir (periodos,
// progreso, rachas, misiones, atributos y Disciplina de la ventana y de la anterior, y logros) tarda ≤ 150 ms.
describe('rendimiento con un año de datos (spec 07, RE-02)', () => {
  it('cálculo completo del dominio ≤ 150 ms (mejor de 5)', () => {
    const today = d('2026-10-18');
    const categoryIds = ['body', 'mind', 'learning', 'relationships', 'order', 'rest'];
    const { records, missions } = yearData(today, categoryIds);
    expect(records.reduce((n, r) => n + r.completions.length, 0)).toBeGreaterThan(2500);

    const run = () => {
      const analysis = analyze(records, today, missions);
      computeProfile({ analysis, records, missions, today, window: 30, categoryIds });
      return evaluateAchievements({
        records,
        analysis,
        scores30: scoresFromAnalysis(analysis, today, 30, categoryIds),
      });
    };
    const statuses = run();
    expect(statuses.filter((s) => s.met).length).toBeGreaterThan(5);
    // Mejor de 5: mide el coste propio del cálculo; la mediana fluctúa cuando la suite corre en paralelo
    const times = Array.from({ length: 5 }, () => {
      const start = performance.now();
      run();
      return performance.now() - start;
    }).sort((a, b) => a - b);
    expect(times[0]).toBeLessThanOrEqual(150);
  });
});
