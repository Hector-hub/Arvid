// Logros (spec 07, LO; game-design §9). Funciones puras sobre el estado derivado: qué logros se cumplen, su progreso
// y cuáles son nuevos. Los desbloqueados se guardan aparte y son permanentes (R-L1); no dan XP (R-L2).
import type { ActivityRecord } from '../activities/types';
import type { ProfileScores } from '../attributes/attributes';
import type { Analysis } from '../progress/progress';
import { diffDays, type LocalDate } from '../time/localDate';

export const ACHIEVEMENT_IDS = [
  'L-01',
  'L-02',
  'L-03',
  'L-04',
  'L-05',
  'L-06',
  'L-07',
  'L-08',
  'L-09',
  'L-10',
  'L-11',
] as const;
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export const isAchievementId = (id: string): id is AchievementId => (ACHIEVEMENT_IDS as readonly string[]).includes(id);

/** Metas de los logros con progreso medible (LO-04). */
export const GOALS = {
  'L-02': 7,
  'L-03': 30,
  'L-04': 100,
  'L-06': 10,
  'L-08': 7,
  'L-09': 4,
  'L-10': 80,
  'L-11': 10,
} as const;

/** Atributo mínimo de una categoría para contar en L-09. */
export const BALANCE_MIN = 60;

export interface AchievementInput {
  records: readonly ActivityRecord[];
  analysis: Analysis;
  /** Atributos (categorías activas) y Disciplina en la ventana de 30 días. */
  scores30: ProfileScores;
}

export interface AchievementStatus {
  id: AchievementId;
  met: boolean;
  /** Progreso hacia la meta, con tope en ella (LO-04); solo en los medibles. */
  progress?: { current: number; goal: number };
}

const progress = (current: number, goal: number) => ({ current: Math.max(0, Math.min(current, goal)), goal });

/** Huecos sin registros: ¿hay dos días con registro separados por `GOALS['L-08']` o más días completos sin ninguno? */
function hasComeback(records: readonly ActivityRecord[]): boolean {
  const days = [...new Set(records.flatMap((r) => r.completions.map((c) => c.date)))].sort() as LocalDate[];
  for (let i = 1; i < days.length; i++) if (diffDays(days[i - 1]!, days[i]!) - 1 >= GOALS['L-08']) return true;
  return false;
}

/** Estado de los 11 logros, en orden (LO-01, LO-04). */
export function evaluateAchievements({ records, analysis, scores30 }: AchievementInput): AchievementStatus[] {
  const completions = records.reduce((n, r) => n + r.completions.length, 0);

  // Rachas: las de actividades cuyo periodo actual es diario cuentan para L-02 (S7-01)
  let dailyBest = 0;
  let dailyCurrent = 0;
  let anyBest = 0;
  let anyCurrent = 0;
  for (const { periods, streak } of analysis.byActivity.values()) {
    anyBest = Math.max(anyBest, streak.best);
    anyCurrent = Math.max(anyCurrent, streak.current);
    if (periods.at(-1)?.period.kind === 'day') {
      dailyBest = Math.max(dailyBest, streak.best);
      dailyCurrent = Math.max(dailyCurrent, streak.current);
    }
  }

  // Misiones con fecha límite completadas a tiempo, y completadas tarde
  let onTime = 0;
  let late = false;
  for (const m of analysis.byMission.values()) {
    if (m.state === 'completedOnTime' && m.deadline !== undefined) onTime++;
    if (m.state === 'completedLate') late = true;
  }

  const balanced = [...scores30.attributes.values()].filter(
    (s) => s.value !== undefined && s.value >= BALANCE_MIN,
  ).length;
  const discipline = scores30.discipline.value;
  const level = analysis.progress.level;

  return [
    { id: 'L-01', met: completions >= 1 },
    { id: 'L-02', met: dailyBest >= GOALS['L-02'], progress: progress(dailyCurrent, GOALS['L-02']) },
    { id: 'L-03', met: anyBest >= GOALS['L-03'], progress: progress(anyCurrent, GOALS['L-03']) },
    { id: 'L-04', met: completions >= GOALS['L-04'], progress: progress(completions, GOALS['L-04']) },
    { id: 'L-05', met: onTime >= 1 },
    { id: 'L-06', met: onTime >= GOALS['L-06'], progress: progress(onTime, GOALS['L-06']) },
    { id: 'L-07', met: late },
    { id: 'L-08', met: hasComeback(records) },
    { id: 'L-09', met: balanced >= GOALS['L-09'], progress: progress(balanced, GOALS['L-09']) },
    {
      id: 'L-10',
      met: discipline !== undefined && discipline >= GOALS['L-10'],
      progress: progress(discipline ?? 0, GOALS['L-10']),
    },
    { id: 'L-11', met: level >= GOALS['L-11'], progress: progress(level, GOALS['L-11']) },
  ];
}

/** Logros que se cumplen y aún no están desbloqueados (LO-02). */
export function detectAchievements(
  statuses: readonly AchievementStatus[],
  unlocked: ReadonlySet<string>,
): AchievementId[] {
  return statuses.filter((s) => s.met && !unlocked.has(s.id)).map((s) => s.id);
}
