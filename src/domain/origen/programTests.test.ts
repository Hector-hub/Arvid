import { describe, expect, it } from 'vitest';
import { analyze } from '../progress/progress';
import { activity, d, days } from '../testing/fixtures';
import { acceptTest, chooseTest, resolveTest, restAhead, testProgress, testsXp, timesForChapter, type ProgramTest } from './programTests';

const TODAY = d('2026-11-30');
const NOW = new Date('2026-11-30T10:00:00.000Z');
// Leer: casi todos los días; Correr: uno de cada cuatro
const read = activity('leer', { period: 'day', target: 1, createdOn: '2026-10-25', logs: days('2026-10-25', 36), categoryId: 'mind' });
const run = activity('correr', { period: 'day', target: 1, createdOn: '2026-10-25', logs: days('2026-10-25', 36).filter((_, i) => i % 4 === 0), categoryId: 'body' });
const records = [read, run];
const analysis = analyze(records, TODAY);
const base = { period: 2, chapter: 3, records, missions: [], analysis, today: TODAY, now: NOW };

describe('pruebas del programa (PR)', () => {
  it('N según el acto: 3, 5 y 7 (PR-02)', () => {
    expect([1, 5, 6, 10, 11, 20].map(timesForChapter)).toEqual([3, 3, 5, 5, 7, 7]);
  });

  it('la prueba 1 se apoya en la actividad que menos cumples (PR-05)', () => {
    const test = chooseTest({ ...base, n: 1 });
    expect(test).toMatchObject({ type: 'hardest', activityId: 'a-correr', times: 3, offeredOn: TODAY, period: 2 });
  });

  it('va a donde más cuesta y no repite el tipo anterior (PR-02)', () => {
    const second = chooseTest({ ...base, n: 2 });
    expect(['hardest', 'weakArea']).toContain(second.type);
    const third = chooseTest({ ...base, n: 3, lastType: second.type });
    expect(third.type).not.toBe(second.type);
  });

  it('con menos de 7 días de historial, «Sin días en blanco»', () => {
    const fresh = activity('nuevo', { period: 'day', target: 1, createdOn: '2026-11-27', logs: ['2026-11-27'] });
    const test = chooseTest({ ...base, n: 2, records: [fresh], analysis: analyze([fresh], TODAY) });
    expect(test.type).toBe('noBlank');
  });

  it('se supera sola con los registros justos y no con uno menos (PR-07, PR-08)', () => {
    const offered: ProgramTest = { n: 1, type: 'hardest', activityId: 'a-correr', times: 3, period: 2, offeredAt: NOW.toISOString(), offeredOn: TODAY };
    const accepted = acceptTest(offered, TODAY);
    expect(accepted.deadline).toBe('2026-12-06');
    const two = activity('correr', { period: 'day', target: 1, createdOn: '2026-10-25', logs: ['2026-11-30', '2026-12-01'], categoryId: 'body' });
    const day2 = d('2026-12-01');
    expect(testProgress(accepted, [read, two], analyze([read, two], day2), day2)).toEqual({ done: 2, of: 3 });
    expect(resolveTest(accepted, [read, two], analyze([read, two], day2), day2, NOW).result).toBeUndefined();
    const three = activity('correr', { period: 'day', target: 1, createdOn: '2026-10-25', logs: ['2026-11-30', '2026-12-01', '2026-12-03'], categoryId: 'body' });
    const day4 = d('2026-12-03');
    expect(resolveTest(accepted, [read, three], analyze([read, three], day4), day4, NOW).result).toBe('passed');
  });

  it('sin contestar en 3 días queda ignorada; aceptada y vencida, no superada; nada resta (PR-09)', () => {
    const offered: ProgramTest = { n: 1, type: 'noBlank', times: 3, period: 2, offeredAt: NOW.toISOString(), offeredOn: TODAY };
    expect(resolveTest(offered, [], analyze([], d('2026-12-02')), d('2026-12-02'), NOW).result).toBeUndefined();
    expect(resolveTest(offered, [], analyze([], d('2026-12-03')), d('2026-12-03'), NOW).result).toBe('ignored');
    const accepted = acceptTest(offered, TODAY);
    expect(resolveTest(accepted, [], analyze([], d('2026-12-07')), d('2026-12-07'), NOW).result).toBe('failed');
    expect(testsXp([{ ...accepted, result: 'failed' }, { ...offered, result: 'rejected' }])).toBe(0);
    expect(testsXp([{ ...accepted, result: 'passed' }])).toBe(100);
  });

  it('no llega con un descanso planificado en los 7 días siguientes (PR-01)', () => {
    const rest = { id: 'r', from: d('2026-12-05'), to: d('2026-12-08'), createdAt: NOW.toISOString() };
    expect(restAhead([rest], TODAY)).toBe(true);
    expect(restAhead([rest], d('2026-11-20'))).toBe(false);
  });
});
