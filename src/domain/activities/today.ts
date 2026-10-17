import { addDays, type LocalDate } from '../time/localDate';
import { daysRemaining, type PeriodKind } from '../time/period';
import { canLog, progressAt, statusAt, versionAt, yesterdayPeriodClosed } from './rules';
import type { ActivityRecord } from './types';

export interface TodayItem {
  activityId: string;
  name: string;
  categoryId: string;
  kind: PeriodKind;
  count: number;
  target: number;
  done: boolean;
  daysRemaining: number;
  order: number;
}

export interface TodaySection {
  kind: PeriodKind;
  items: TodayItem[];
}

export interface TodayView {
  date: LocalDate;
  /** Suma de lo que falta en las actividades diarias (HOY-01). */
  pendingToday: number;
  hasDaily: boolean;
  sections: TodaySection[];
  isEmpty: boolean;
}

const SECTION_ORDER: PeriodKind[] = ['day', 'week', 'month'];

function byPendingThenOrder(a: TodayItem, b: TodayItem): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  return a.order - b.order;
}

/** Modelo de la pantalla Hoy (HOY-01 a HOY-04). Solo incluye actividades activas hoy. */
export function buildTodayView(records: readonly ActivityRecord[], today: LocalDate): TodayView {
  const items: TodayItem[] = [];
  for (const record of records) {
    if (statusAt(record.events, today) !== 'active') continue;
    const version = versionAt(record.versions, today);
    const progress = progressAt(record, today);
    if (!version || !progress) continue;
    items.push({
      activityId: record.activity.id,
      name: record.activity.name,
      categoryId: version.categoryId,
      kind: version.period,
      count: Math.min(progress.count, progress.target),
      target: progress.target,
      done: progress.done,
      daysRemaining: daysRemaining(progress.period, today),
      order: record.activity.order,
    });
  }
  const sections = SECTION_ORDER.map((kind) => ({
    kind,
    items: items.filter((i) => i.kind === kind).sort(byPendingThenOrder),
  })).filter((s) => s.items.length > 0);
  const daily = items.filter((i) => i.kind === 'day');
  return {
    date: today,
    pendingToday: daily.reduce((sum, i) => sum + (i.target - i.count), 0),
    hasDaily: daily.length > 0,
    sections,
    isEmpty: items.length === 0,
  };
}

export interface ForgottenItem {
  activityId: string;
  name: string;
  categoryId: string;
  count: number;
  target: number;
}

/**
 * Actividades activas cuyo periodo de ayer ya cerró sin completarse y aún admiten un registro con fecha de ayer
 * (HOY-05). Las semanales o mensuales cuyo periodo sigue abierto se registran directamente desde Hoy.
 */
export function forgottenYesterday(records: readonly ActivityRecord[], today: LocalDate): ForgottenItem[] {
  const yesterday = addDays(today, -1);
  const result: ForgottenItem[] = [];
  for (const record of [...records].sort((a, b) => a.activity.order - b.activity.order)) {
    if (!yesterdayPeriodClosed(record, today)) continue;
    if (!canLog(record, yesterday, today).ok) continue;
    const progress = progressAt(record, yesterday);
    const version = versionAt(record.versions, yesterday);
    if (!progress || !version) continue;
    result.push({
      activityId: record.activity.id,
      name: record.activity.name,
      categoryId: version.categoryId,
      count: progress.count,
      target: progress.target,
    });
  }
  return result;
}
