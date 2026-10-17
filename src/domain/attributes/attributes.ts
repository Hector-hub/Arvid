import type { ActivityRecord } from '../activities/types';
import type { MissionRecord } from '../missions/missions';
import { analyze, type Analysis } from '../progress/progress';
import { addDays, compareDates, type LocalDate } from '../time/localDate';
import type { PeriodKind } from '../time/period';

/** Parámetros ajustables (R-AT3, R-AT5, D-035). */
export const MIN_ITEMS = 3;
export const TREND_THRESHOLD = 5;
export type WindowDays = 7 | 30 | 90;

/** Desglose de una puntuación (ATR-06, game-design §10). */
export type BreakdownEntry =
  | { source: 'activity'; activityId: string; kind: PeriodKind; periods: number; earnedCents: number; possibleCents: number }
  | { source: 'missions'; count: number; earnedCents: number; possibleCents: number }
  | { source: 'penalty'; reason: 'expired' | 'abandoned'; missionIds: string[]; possibleCents: number };

export interface Score {
  earnedCents: number;
  possibleCents: number;
  items: number;
  /** 0–100, o `undefined` si hay menos de MIN_ITEMS elementos ("sin datos", R-AT3). */
  value?: number;
  breakdown: BreakdownEntry[];
}

export interface ProfileScores {
  attributes: Map<string, Score>;
  discipline: Score;
}

/** `round_half_up(100 × E / P)` en enteros. */
export function percent(earnedCents: number, possibleCents: number): number {
  return Math.floor((200 * earnedCents + possibleCents) / (2 * possibleCents));
}

class Accumulator {
  earned = 0;
  possible = 0;
  items = 0;
  private activities = new Map<string, Extract<BreakdownEntry, { source: 'activity' }>>();
  private missions: Extract<BreakdownEntry, { source: 'missions' }> = { source: 'missions', count: 0, earnedCents: 0, possibleCents: 0 };
  private penalties = new Map<'expired' | 'abandoned', Extract<BreakdownEntry, { source: 'penalty' }>>();

  addPeriod(activityId: string, kind: PeriodKind, earned: number, possible: number) {
    this.add(earned, possible);
    const entry = this.activities.get(activityId) ?? { source: 'activity', activityId, kind, periods: 0, earnedCents: 0, possibleCents: 0 };
    entry.periods++;
    entry.earnedCents += earned;
    entry.possibleCents += possible;
    this.activities.set(activityId, entry);
  }

  addMission(missionId: string, earned: number, possible: number, penalty?: 'expired' | 'abandoned') {
    this.add(earned, possible);
    if (penalty) {
      const entry = this.penalties.get(penalty) ?? { source: 'penalty', reason: penalty, missionIds: [], possibleCents: 0 };
      entry.missionIds.push(missionId);
      entry.possibleCents += possible;
      this.penalties.set(penalty, entry);
    } else {
      this.missions.count++;
      this.missions.earnedCents += earned;
      this.missions.possibleCents += possible;
    }
  }

  private add(earned: number, possible: number) {
    this.earned += earned;
    this.possible += possible;
    this.items++;
  }

  score(): Score {
    const breakdown: BreakdownEntry[] = [...this.activities.values()];
    if (this.missions.count > 0) breakdown.push(this.missions);
    breakdown.push(...this.penalties.values());
    return {
      earnedCents: this.earned,
      possibleCents: this.possible,
      items: this.items,
      value: this.items >= MIN_ITEMS && this.possible > 0 ? percent(this.earned, this.possible) : undefined,
      breakdown,
    };
  }
}

/**
 * Atributos por categoría y Disciplina en la ventana `[hoy − W + 1, hoy]` (R-AT1 a R-AT3, R-D1, R-AT8, R-AT9).
 * Los atributos se devuelven solo para `categoryIds` (las activas); Disciplina incluye todo.
 */
export function scoresFromAnalysis(analysis: Analysis, today: LocalDate, window: WindowDays, categoryIds: readonly string[]): ProfileScores {
  const from = addDays(today, -(window - 1));
  const inWindow = (date: LocalDate) => compareDates(from, date) <= 0 && compareDates(date, today) <= 0;
  const byCategory = new Map(categoryIds.map((id) => [id, new Accumulator()]));
  const discipline = new Accumulator();

  for (const [activityId, { periods }] of analysis.byActivity) {
    for (const p of periods) {
      if (!p.evaluable) continue;
      const date = p.closed ? p.period.end : today;
      if (!inWindow(date)) continue;
      byCategory.get(p.categoryId)?.addPeriod(activityId, p.period.kind, p.earnedCents, p.possibleCents);
      discipline.addPeriod(activityId, p.period.kind, p.earnedCents, p.possibleCents);
    }
  }
  for (const m of analysis.byMission.values()) {
    if (m.category && inWindow(m.category.date)) {
      byCategory.get(m.categoryId)?.addMission(m.missionId, m.category.earnedCents, m.category.possibleCents);
    }
    if (m.discipline && inWindow(m.discipline.date)) {
      const penalty = m.discipline.earnedCents > 0 ? undefined : m.state === 'abandoned' ? 'abandoned' : 'expired';
      discipline.addMission(m.missionId, m.discipline.earnedCents, m.discipline.possibleCents, penalty);
    }
  }
  return {
    attributes: new Map([...byCategory].map(([id, acc]) => [id, acc.score()])),
    discipline: discipline.score(),
  };
}

/** Datos tal como estaban al final de `ref`: registros, eventos y misiones con fecha ≤ ref (R-AT4). */
export function recordsAsOf(records: readonly ActivityRecord[], missions: readonly MissionRecord[], ref: LocalDate) {
  const upTo = (date: LocalDate) => compareDates(date, ref) <= 0;
  return {
    records: records.map((r) => ({
      ...r,
      versions: r.versions.filter((v) => upTo(v.effectiveFrom)),
      events: r.events.filter((e) => upTo(e.date)),
      completions: r.completions.filter((c) => upTo(c.date)),
    })),
    missions: missions
      .filter((m) => upTo(m.mission.createdOn))
      .map((m) => ({ ...m, events: m.events.filter((e) => upTo(e.date)) })),
  };
}

export type TrendDirection = 'up' | 'down' | 'stable';
export interface Trend {
  direction: TrendDirection;
  delta: number;
}

/** R-AT5: solo si ambas ventanas tienen datos. */
export function trend(current?: number, previous?: number): Trend | undefined {
  if (current === undefined || previous === undefined) return undefined;
  const delta = current - previous;
  return { delta, direction: delta >= TREND_THRESHOLD ? 'up' : delta <= -TREND_THRESHOLD ? 'down' : 'stable' };
}

export interface Profile {
  window: WindowDays;
  current: ProfileScores;
  previous: ProfileScores;
}

/** Ventana actual y anterior (ATR-01 a ATR-05). `analysis` es el de hoy, ya calculado. */
export function computeProfile(params: {
  analysis: Analysis;
  records: readonly ActivityRecord[];
  missions: readonly MissionRecord[];
  today: LocalDate;
  window: WindowDays;
  categoryIds: readonly string[];
}): Profile {
  const { analysis, records, missions, today, window, categoryIds } = params;
  const ref = addDays(today, -window);
  const past = recordsAsOf(records, missions, ref);
  return {
    window,
    current: scoresFromAnalysis(analysis, today, window, categoryIds),
    previous: scoresFromAnalysis(analyze(past.records, ref, past.missions), ref, window, categoryIds),
  };
}
