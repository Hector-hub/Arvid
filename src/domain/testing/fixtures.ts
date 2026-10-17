// Constructores de datos para tests del dominio.
import type { Difficulty } from '../config';
import type { ActivityRecord, ActivityStatusType, Completion } from '../activities/types';
import { addDays, asLocalDate, type LocalDate } from '../time/localDate';
import type { PeriodKind } from '../time/period';

export const d = (s: string): LocalDate => asLocalDate(s);

let seq = 0;

export interface FixtureOptions {
  period: PeriodKind;
  target: number;
  createdOn: string;
  effectiveFrom?: string;
  difficulty?: Difficulty;
  logs?: string[];
  events?: [string, ActivityStatusType][];
  versions?: { effectiveFrom: string; period: PeriodKind; target: number; difficulty?: Difficulty }[];
  order?: number;
}

export function activity(name: string, opts: FixtureOptions): ActivityRecord {
  const id = `a-${name}`;
  const completions: Completion[] = (opts.logs ?? []).map((date) => ({
    id: `c-${++seq}`,
    activityId: id,
    date: d(date),
    at: `${date}T10:00:00.${String(seq % 1000).padStart(3, '0')}Z`,
    tzOffsetMin: 120,
  }));
  const base = { effectiveFrom: opts.effectiveFrom ?? opts.createdOn, period: opts.period, target: opts.target, difficulty: opts.difficulty };
  return {
    activity: { id, name, order: opts.order ?? 0 },
    versions: [base, ...(opts.versions ?? [])].map((v, i) => ({
      id: `v-${name}-${i}`,
      activityId: id,
      effectiveFrom: d(v.effectiveFrom),
      period: v.period,
      target: v.target,
      difficulty: v.difficulty ?? 'medium',
      categoryId: 'body',
    })),
    events: [
      { id: `e-${name}`, activityId: id, date: d(opts.createdOn), type: 'created', at: `${opts.createdOn}T09:00:00.000Z` },
      ...(opts.events ?? []).map(([date, type], i) => ({
        id: `e-${name}-${i}`,
        activityId: id,
        date: d(date),
        type,
        at: `${date}T12:00:00.000Z`,
      })),
    ],
    completions,
  };
}

/** Fechas consecutivas desde `from` (incluida), `count` días. */
export function days(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(d(from), i));
}
