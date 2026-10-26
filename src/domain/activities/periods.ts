import { DIFFICULTY_POINTS } from '../config';
import { addDays, compareDates, type LocalDate } from '../time/localDate';
import { isClosed, periodOf, type Period, type PeriodKind } from '../time/period';
import { createdOn, sortEvents, statusAt, versionAt } from './rules';
import type { ActivityRecord, ActivityVersion, DateRange } from './types';

export type NotEvaluableReason = 'truncated' | 'paused' | 'grace' | 'rest' | 'open';

/** Un periodo de una actividad con sus puntos y su evaluabilidad (game-design §3.3–§3.4). */
export interface EvaluatedPeriod {
  /** Extremos reales del periodo; `end` es anterior al natural si está truncado (R-A9). */
  period: Period;
  /** Categoría de la versión vigente en el periodo (R-AT8). */
  categoryId: string;
  count: number;
  target: number;
  /** Puntos ganados y posibles en centésimas enteras (ENG-02). */
  earnedCents: number;
  possibleCents: number;
  closed: boolean;
  fulfilled: boolean;
  evaluable: boolean;
  reason?: NotEvaluableReason;
}

/** `round_half_up(value × 100 × min(c, N) / N)` sin coma flotante. */
export function earnedCents(value: number, count: number, target: number): number {
  const numerator = value * 100 * Math.min(count, target);
  return Math.floor((2 * numerator + target) / (2 * target));
}

const GRACE_EVENTS = new Set(['created', 'resumed', 'unarchived']);

function maxDate(a: LocalDate, b: LocalDate): LocalDate {
  return compareDates(a, b) >= 0 ? a : b;
}

/**
 * Todos los periodos de la actividad, desde el que contiene su creación hasta el que contiene hoy, con la versión
 * vigente en cada tramo (ENG-01 a ENG-06).
 */
export function evaluatePeriods(record: ActivityRecord, today: LocalDate): EvaluatedPeriod[] {
  const created = createdOn(record.events);
  if (!created) return [];
  const versions = [...record.versions].sort((a, b) => compareDates(a.effectiveFrom, b.effectiveFrom));
  // Fechas ordenadas para contar por búsqueda binaria; eventos ordenados una sola vez (NFR2-01).
  const completionDates = record.completions.map((c) => c.date).sort();
  const ctx: EvalContext = { record, events: sortEvents(record.events), completionDates, today, rests: record.rests ?? [] };
  const result: EvaluatedPeriod[] = [];

  versions.forEach((version, i) => {
    const next: ActivityVersion | undefined = versions[i + 1];
    const previous: ActivityVersion | undefined = versions[i - 1];
    const segmentEnd = next ? addDays(next.effectiveFrom, -1) : undefined;
    const typeChanged = !!previous && previous.period !== version.period;
    let natural = periodOf(version.period, maxDate(version.effectiveFrom, created));
    let first = true;

    while (compareDates(natural.start, today) <= 0 && (!segmentEnd || compareDates(natural.start, segmentEnd) <= 0)) {
      const truncated = !!segmentEnd && compareDates(natural.end, segmentEnd) > 0;
      const period: Period = { kind: version.period, start: natural.start, end: truncated ? segmentEnd! : natural.end };
      result.push(evaluateOne(ctx, version, period, { truncated, graceByType: first && typeChanged }));
      natural = periodOf(version.period, addDays(natural.end, 1));
      first = false;
    }
  });
  return result;
}

interface EvalContext {
  record: ActivityRecord;
  events: ActivityRecord['events'];
  completionDates: LocalDate[];
  today: LocalDate;
  rests: readonly DateRange[];
}

/** Primer índice con `dates[i] > date` (o `>=` si `inclusive` es falso). */
function bound(dates: readonly LocalDate[], date: LocalDate, inclusive: boolean): number {
  let lo = 0;
  let hi = dates.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const cmp = compareDates(dates[mid]!, date);
    if (cmp < 0 || (inclusive && cmp === 0)) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function evaluateOne(
  { events, completionDates, today, rests }: EvalContext,
  version: ActivityVersion,
  period: Period,
  flags: { truncated: boolean; graceByType: boolean },
): EvaluatedPeriod {
  const inPeriod = (d: LocalDate) => compareDates(period.start, d) <= 0 && compareDates(d, period.end) <= 0;
  const count = bound(completionDates, period.end, true) - bound(completionDates, period.start, false);
  const target = version.target;
  const value = DIFFICULTY_POINTS[version.difficulty];
  const closed = isClosed(period, today);
  const fulfilled = count >= target;
  const status = statusAt(events, closed ? period.end : today, true);
  const grace = flags.graceByType || events.some((e) => GRACE_EVENTS.has(e.type) && inPeriod(e.date));
  // Descanso (spec 12, DS-05): como la gracia, el periodo solo cuenta si se cumple
  const rest = rests.some((r) => compareDates(r.from, period.end) <= 0 && compareDates(period.start, r.to) <= 0);

  let reason: NotEvaluableReason | undefined;
  if (flags.truncated) reason = 'truncated';
  else if (status !== 'active') reason = 'paused';
  else if (grace && !fulfilled) reason = 'grace';
  else if (rest && !fulfilled) reason = 'rest';
  else if (!closed && !fulfilled) reason = 'open';

  return {
    period,
    categoryId: version.categoryId,
    count,
    target,
    earnedCents: earnedCents(value, count, target),
    possibleCents: value * 100,
    closed,
    fulfilled,
    evaluable: reason === undefined,
    reason,
  };
}

/** Tipo de periodo vigente hoy, para textos ("racha 6 semanas"). */
export function currentKind(periods: readonly EvaluatedPeriod[]): PeriodKind | undefined {
  return periods.at(-1)?.period.kind;
}

/** XP que gana (+1) o pierde (−1) un registro en `date`, para el feedback de Hoy (PRG-05). */
export function logDeltaCents(record: ActivityRecord, date: LocalDate, direction: 1 | -1): number {
  const version = versionAt(record.versions, date);
  if (!version) return 0;
  const natural = periodOf(version.period, date);
  const count = record.completions.filter((c) => compareDates(natural.start, c.date) <= 0 && compareDates(c.date, natural.end) <= 0).length;
  const value = DIFFICULTY_POINTS[version.difficulty];
  return earnedCents(value, Math.max(0, count + direction), version.target) - earnedCents(value, count, version.target);
}
