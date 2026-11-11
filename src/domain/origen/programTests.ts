// Pruebas del programa (spec 17 §3.9, PR): la lista fija de siete tipos (PR-05), elegidos con tus registros y
// comprobados solos. La IA que las escribe llega en la 2.6.0; esta lista se queda como reserva.
import type { ActivityRecord, Rest } from '../activities/types';
import type { Analysis } from '../progress/progress';
import { addDays, compareDates, diffDays, type LocalDate } from '../time/localDate';
import type { MissionRecord } from '../missions/missions';
import { createdOn } from '../activities/rules';

export type TestType = 'fullDays' | 'hardest' | 'noBlank' | 'roundWeek' | 'weakArea' | 'missionsOnTime' | 'bestWeek';
export type TestResult = 'passed' | 'failed' | 'rejected' | 'ignored';

export interface ProgramTest {
  /** Número de la prueba: 1, 2, 3… */
  n: number;
  type: TestType;
  /** Cuántos días (o misiones, o registros) pide. */
  times: number;
  activityId?: string;
  categoryId?: string;
  missionIds?: string[];
  /** «Tu mejor semana»: los registros que hay que superar. */
  threshold?: number;
  /** Tramo (índice) en que llegó: si se supera, es su pase (RI-02). */
  period: number;
  offeredAt: string;
  offeredOn: LocalDate;
  acceptedOn?: LocalDate;
  /** Último día del plazo (7 días contando el de aceptar). */
  deadline?: LocalDate;
  result?: TestResult;
  resolvedAt?: string;
}

/** XP de una prueba superada (PR-08). */
export const TEST_XP = 100;
/** Plazo, contando el día en que se acepta. */
export const TEST_DAYS = 7;
/** Sin contestar en 3 días, se da por ignorada (PR-09). */
export const IGNORE_DAYS = 3;
const LOOKBACK = 28;

/** N según el acto (PR-02): 3 en el I, 5 en el II y 7 en el III. */
export const timesForChapter = (chapter: number) => (chapter <= 5 ? 3 : chapter <= 10 ? 5 : 7);

export const passedTests = (tests: readonly ProgramTest[] | undefined) => (tests ?? []).filter((t) => t.result === 'passed').length;

/** XP de las pruebas superadas: cuenta para el nivel, no para los atributos, la Disciplina ni la vara (PR-08, RI-05). */
export const testsXp = (tests: readonly ProgramTest[] | undefined) => passedTests(tests) * TEST_XP;

/** La prueba abierta: ofrecida sin contestar o aceptada sin resolver. Como mucho una a la vez (PR-01). */
export const openTest = (tests: readonly ProgramTest[] | undefined) => (tests ?? []).find((t) => !t.result);

// ---------- Lectura de los registros ----------
interface Day {
  /** Hay actividades diarias ese día y todas se cumplieron. */
  full: boolean;
  hasDaily: boolean;
  logged: boolean;
}

function daysOf(records: readonly ActivityRecord[], analysis: Analysis, from: LocalDate, to: LocalDate): Map<LocalDate, Day> {
  const days = new Map<LocalDate, Day>();
  for (let d = from; compareDates(d, to) <= 0; d = addDays(d, 1)) days.set(d, { full: true, hasDaily: false, logged: false });
  for (const a of analysis.byActivity.values())
    for (const p of a.periods) {
      if (p.period.kind !== 'day' || p.reason === 'paused' || p.reason === 'rest' || p.reason === 'truncated') continue;
      const day = days.get(p.period.start);
      if (!day) continue;
      day.hasDaily = true;
      if (!p.fulfilled) day.full = false;
    }
  for (const r of records)
    for (const c of r.completions) {
      const day = days.get(c.date);
      if (day) day.logged = true;
    }
  for (const day of days.values()) if (!day.hasDaily) day.full = false;
  return days;
}

function longestRun(days: Iterable<boolean>): number {
  let best = 0;
  let run = 0;
  for (const on of days) {
    run = on ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Cumplimiento de cada actividad diaria en los últimos 28 días cerrados. */
function dailyRates(analysis: Analysis, today: LocalDate): { activityId: string; categoryId: string; rate: number }[] {
  const from = addDays(today, -LOOKBACK);
  const out: { activityId: string; categoryId: string; rate: number }[] = [];
  for (const a of analysis.byActivity.values()) {
    const periods = a.periods.filter((p) => p.period.kind === 'day' && p.closed && p.evaluable && compareDates(p.period.start, from) >= 0);
    if (periods.length < 3) continue;
    out.push({ activityId: a.activityId, categoryId: periods.at(-1)!.categoryId, rate: periods.filter((p) => p.fulfilled).length / periods.length });
  }
  return out;
}

const average = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function completionsPerWeek(records: readonly ActivityRecord[], today: LocalDate, weeks: number): number[] {
  const counts = Array.from({ length: weeks }, () => 0);
  for (const r of records)
    for (const c of r.completions) {
      const ago = diffDays(c.date, today);
      if (ago >= 0 && ago < weeks * 7) counts[Math.floor(ago / 7)]!++;
    }
  return counts;
}

export interface ChooseInput {
  n: number;
  period: number;
  chapter: number;
  records: readonly ActivityRecord[];
  missions: readonly MissionRecord[];
  analysis: Analysis;
  today: LocalDate;
  now: Date;
  lastType?: TestType;
}

/** Elige la prueba (PR-05): va a donde más te cuesta, sin repetir el tipo anterior. */
export function chooseTest(input: ChooseInput): ProgramTest {
  const { records, analysis, today, n } = input;
  const times = timesForChapter(input.chapter);
  const base = { n, period: input.period, offeredAt: input.now.toISOString(), offeredOn: today, times };
  const firstDay = records.map((r) => createdOn(r.events)).filter((d): d is LocalDate => !!d).sort(compareDates)[0];
  const history = firstDay ? diffDays(firstDay, today) : 0;
  const rates = dailyRates(analysis, today);
  const lowest = [...rates].sort((a, b) => a.rate - b.rate)[0];

  // La prueba 1 se apoya en una actividad tuya, para que el capítulo 4 se compruebe solo (PR-05)
  if (n === 1) {
    if (lowest) return { ...base, type: 'hardest', activityId: lowest.activityId };
    return { ...base, type: 'noBlank' };
  }
  if (history < 7) return { ...base, type: 'noBlank' };

  const candidates: ProgramTest[] = [];
  const pending = input.missions.filter((m) => {
    const a = analysis.byMission.get(m.mission.id);
    return a?.state === 'pending' && a.deadline && diffDays(today, a.deadline) >= 0 && diffDays(today, a.deadline) < TEST_DAYS;
  });
  if (pending.length >= 2) candidates.push({ ...base, type: 'missionsOnTime', times: pending.length, missionIds: pending.map((m) => m.mission.id) });
  if (lowest && rates.length >= 2 && lowest.rate < 0.6 && lowest.rate < average(rates.map((r) => r.rate)) - 0.15)
    candidates.push({ ...base, type: 'hardest', activityId: lowest.activityId });
  const byCategory = new Map<string, number[]>();
  for (const r of rates) byCategory.set(r.categoryId, [...(byCategory.get(r.categoryId) ?? []), r.rate]);
  if (byCategory.size >= 2) {
    const cats = [...byCategory].map(([id, rs]) => ({ id, rate: average(rs) })).sort((a, b) => a.rate - b.rate);
    const others = average(cats.slice(1).map((c) => c.rate));
    if (cats[0]!.rate < others - 0.15) candidates.push({ ...base, type: 'weakArea', categoryId: cats[0]!.id });
  }
  const recent = daysOf(records, analysis, addDays(today, -Math.min(LOOKBACK, history)), addDays(today, -1));
  const daily = [...recent.values()].filter((d) => d.hasDaily);
  if (daily.length >= 7 && daily.filter((d) => d.full).length / daily.length < 0.5) candidates.push({ ...base, type: 'fullDays' });
  if ([...recent.values()].filter((d) => !d.logged).length >= 4) candidates.push({ ...base, type: 'noBlank' });
  const weekly = [...analysis.byActivity.values()].filter((a) =>
    a.periods.some((p) => p.period.kind === 'week' && p.closed && p.evaluable && !p.fulfilled && diffDays(p.period.end, today) <= LOOKBACK),
  );
  if (weekly.length > 0) candidates.push({ ...base, type: 'roundWeek', times: 1 });
  const best = Math.max(0, ...completionsPerWeek(records, today, 8));
  candidates.push({ ...base, type: 'bestWeek', times: 1, threshold: best });

  return candidates.find((c) => c.type !== input.lastType) ?? candidates[0]!;
}

// ---------- Comprobación (PR-07, PR-08) ----------
/** Avance de la prueba aceptada: cuánto lleva de lo que pide. */
export function testProgress(test: ProgramTest, records: readonly ActivityRecord[], analysis: Analysis, today: LocalDate): { done: number; of: number } {
  if (!test.acceptedOn || !test.deadline) return { done: 0, of: test.times };
  const to = compareDates(today, test.deadline) < 0 ? today : test.deadline;
  if (compareDates(to, test.acceptedOn) < 0) return { done: 0, of: test.times };
  const days = daysOf(records, analysis, test.acceptedOn, to);
  const of = test.times;
  switch (test.type) {
    case 'fullDays':
      return { done: Math.min(of, longestRun([...days.values()].map((d) => d.full))), of };
    case 'noBlank':
      return { done: Math.min(of, longestRun([...days.values()].map((d) => d.logged))), of };
    case 'hardest': {
      const a = analysis.byActivity.get(test.activityId ?? '');
      const done = (a?.periods ?? []).filter((p) => p.fulfilled && days.has(p.period.start) && p.period.kind === 'day').length;
      return { done: Math.min(of, done), of };
    }
    case 'weakArea': {
      let done = 0;
      for (const date of days.keys()) {
        const periods = [...analysis.byActivity.values()].flatMap((a) =>
          a.periods.filter((p) => p.period.kind === 'day' && p.period.start === date && p.categoryId === test.categoryId && p.reason !== 'paused' && p.reason !== 'rest'),
        );
        if (periods.length && periods.every((p) => p.fulfilled)) done++;
      }
      return { done: Math.min(of, done), of };
    }
    case 'roundWeek': {
      const starts = new Set<LocalDate>();
      for (const a of analysis.byActivity.values())
        for (const p of a.periods) if (p.period.kind === 'week' && (days.has(p.period.start) || days.has(p.period.end))) starts.add(p.period.start);
      const done = [...starts].some((start) => {
        const periods = [...analysis.byActivity.values()].flatMap((a) => a.periods.filter((p) => p.period.kind === 'week' && p.period.start === start && p.reason !== 'paused' && p.reason !== 'rest'));
        return periods.length > 0 && periods.every((p) => p.fulfilled);
      });
      return { done: done ? 1 : 0, of: 1 };
    }
    case 'missionsOnTime': {
      const ids = test.missionIds ?? [];
      const done = ids.filter((id) => analysis.byMission.get(id)?.state === 'completedOnTime').length;
      return { done, of: ids.length };
    }
    case 'bestWeek': {
      let count = 0;
      for (const r of records) for (const c of r.completions) if (days.has(c.date)) count++;
      return { done: count > (test.threshold ?? 0) ? 1 : 0, of: 1 };
    }
  }
}

/** Resuelve lo que toque hoy: superada en cuanto se cumple; ignorada a los 3 días; no superada al vencer (PR-09). */
export function resolveTest(test: ProgramTest, records: readonly ActivityRecord[], analysis: Analysis, today: LocalDate, now: Date): ProgramTest {
  if (test.result) return test;
  const resolved = (result: TestResult): ProgramTest => ({ ...test, result, resolvedAt: now.toISOString() });
  if (!test.acceptedOn) return diffDays(test.offeredOn, today) >= IGNORE_DAYS ? resolved('ignored') : test;
  const { done, of } = testProgress(test, records, analysis, today);
  if (done >= of) return resolved('passed');
  if (test.deadline && compareDates(today, test.deadline) > 0) return resolved('failed');
  return test;
}

export const acceptTest = (test: ProgramTest, today: LocalDate): ProgramTest => ({ ...test, acceptedOn: today, deadline: addDays(today, TEST_DAYS - 1) });

/** Una prueba nueva no llega con un descanso planificado en los próximos 7 días (PR-01). */
export function restAhead(rests: readonly Rest[], today: LocalDate): boolean {
  const end = addDays(today, TEST_DAYS - 1);
  return rests.some((r) => compareDates(r.from, end) <= 0 && compareDates(r.to, today) >= 0);
}

/** Día del tramo (desde 0) en que llega su prueba: entre el segundo y el cuarto, fijo para cada tramo (PR-01). */
export const offerDay = (period: number) => 1 + (period % 3);
