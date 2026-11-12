import { describe, expect, it } from 'vitest';
import { analyze } from '../progress/progress';
import { activity, d, days } from '../testing/fixtures';
import { checkAiTest, parseAiJson, testPrompt, testSummary } from './aiTest';

describe('prueba escrita por la IA (PR-02 a PR-04)', () => {
  it('valida longitudes, días, plazo y que la actividad sea tuya', () => {
    expect(checkAiTest({ title: 'Leer **20** minutos', detail: 'Antes de dormir.', times: 3, days: 7 }, [])).toEqual({
      ok: true,
      test: { title: 'Leer 20 minutos', detail: 'Antes de dormir.', times: 3, days: 7 },
    });
    expect(checkAiTest({ title: 'x'.repeat(61), detail: '', times: 3, days: 7 }, []).ok).toBe(false);
    expect(checkAiTest({ title: 'Leer', detail: '', times: 8, days: 7 }, []).ok).toBe(false);
    expect(checkAiTest({ title: 'Leer', detail: '', times: 4, days: 3 }, []).ok).toBe(false);
    expect(checkAiTest({ title: 'Leer', detail: '', times: 2, days: 3, activityId: 'a1' }, ['a1']).ok).toBe(true);
    expect(checkAiTest({ title: 'Leer', detail: '', times: 2, days: 3, activityId: 'zz' }, ['a1']).ok).toBe(false);
  });

  it('lee el JSON aunque venga con texto alrededor', () => {
    expect(parseAiJson('Aquí va:\n```json\n{"title":"A","times":1}\n```')).toEqual({ title: 'A', times: 1 });
    expect(parseAiJson('nada')).toBeUndefined();
  });

  it('las instrucciones prohíben salud, dinero, otras personas y la historia', () => {
    expect(testPrompt('es')).toMatch(/health risk.*money.*another person.*story/s);
    expect(testPrompt('es')).toMatch(/Latin American Spanish/);
  });

  it('el resumen lleva actividades, cumplimiento y días flojos, sin alias ni conversaciones (NFR17-04)', () => {
    const run = activity('correr', { period: 'day', target: 1, createdOn: '2026-11-01', logs: days('2026-11-01', 10) });
    const today = d('2026-11-20');
    const s = testSummary({
      records: [run],
      analysis: analyze([run], today),
      missions: [],
      goals: [{ title: '5 km', done: 1, total: 3 }],
      categoryName: () => 'Cuerpo',
      tests: [],
      times: 3,
      today,
    });
    expect(s).toMatchObject({ times: 3, goals: [{ title: '5 km', done: 1, total: 3 }] });
    expect((s.activities as { name: string; fulfilledRate: number }[])[0]).toMatchObject({
      name: 'correr',
      category: 'Cuerpo',
    });
    expect(JSON.stringify(s)).not.toMatch(/alias|chat/i);
  });
});
