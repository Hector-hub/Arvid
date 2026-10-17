import { evaluatePeriods, type EvaluatedPeriod } from '../activities/periods';
import type { ActivityRecord } from '../activities/types';
import type { LocalDate } from '../time/localDate';
import { computeStreak, type StreakState } from './streaks';

/** Títulos por nivel (R-X4, D-035). */
export const TITLES: readonly { level: number; title: string }[] = [
  { level: 1, title: 'Recluta' },
  { level: 5, title: 'Aprendiz' },
  { level: 10, title: 'Vigía' },
  { level: 15, title: 'Centinela' },
  { level: 20, title: 'Estratega' },
  { level: 30, title: 'Élite' },
  { level: 40, title: 'Leyenda' },
];

/** XP acumulada (en centésimas) necesaria para alcanzar el nivel `level`: 50 × L × (L − 1) (R-X3). */
export function levelThresholdCents(level: number): number {
  return 5_000 * level * (level - 1);
}

export function levelForCents(cents: number): number {
  let level = 1;
  while (levelThresholdCents(level + 1) <= cents) level++;
  return level;
}

export function titleForLevel(level: number): string {
  let title = TITLES[0]!.title;
  for (const t of TITLES) if (level >= t.level) title = t.title;
  return title;
}

export interface Progress {
  xpCents: number;
  /** XP mostrada: entera, redondeada hacia abajo (R-X2). */
  xp: number;
  level: number;
  title: string;
  /** XP (entera) al inicio del nivel actual y para alcanzar el siguiente. */
  levelStartXp: number;
  nextLevelXp: number;
}

export function progressFromCents(xpCents: number): Progress {
  const level = levelForCents(xpCents);
  return {
    xpCents,
    xp: Math.floor(xpCents / 100),
    level,
    title: titleForLevel(level),
    levelStartXp: levelThresholdCents(level) / 100,
    nextLevelXp: levelThresholdCents(level + 1) / 100,
  };
}

/** XP de todas las actividades: Σ E de todos los periodos (R-X1, PRG-01). Las misiones se sumarán en el inc. 3. */
export function computeXpCents(records: readonly ActivityRecord[], today: LocalDate): number {
  let total = 0;
  for (const record of records) for (const p of evaluatePeriods(record, today)) total += p.earnedCents;
  return total;
}

export function computeProgress(records: readonly ActivityRecord[], today: LocalDate): Progress {
  return progressFromCents(computeXpCents(records, today));
}

export interface ActivityAnalysis {
  activityId: string;
  periods: EvaluatedPeriod[];
  streak: StreakState;
}

export interface Analysis {
  progress: Progress;
  byActivity: Map<string, ActivityAnalysis>;
}

/** Una sola pasada por actividad: periodos, rachas y XP total (NFR2-01). */
export function analyze(records: readonly ActivityRecord[], today: LocalDate): Analysis {
  const byActivity = new Map<string, ActivityAnalysis>();
  let xpCents = 0;
  for (const record of records) {
    const periods = evaluatePeriods(record, today);
    for (const p of periods) xpCents += p.earnedCents;
    byActivity.set(record.activity.id, { activityId: record.activity.id, periods, streak: computeStreak(periods) });
  }
  return { progress: progressFromCents(xpCents), byActivity };
}
