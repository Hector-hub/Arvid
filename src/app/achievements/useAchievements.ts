import { useMemo } from 'react';
import {
  evaluateAchievements,
  type AchievementId,
  type AchievementStatus,
} from '../../domain/achievements/achievements';
import { scoresFromAnalysis } from '../../domain/attributes/attributes';
import { t } from '../../i18n';
import { useAnalysis } from '../analysis';
import { useToday } from '../clock';
import { useCategories, useRecords } from '../data';

/** Estado de los 11 logros con los datos actuales (LO-01, LO-04); atributos de las categorías activas en 30 días. */
export function useAchievementStatuses(): AchievementStatus[] | undefined {
  const analysis = useAnalysis();
  const records = useRecords();
  const categories = useCategories();
  const today = useToday();
  return useMemo(() => {
    if (!analysis || !records || !categories) return undefined;
    const active = categories.filter((c) => c.active && !c.archivedAt).map((c) => c.id);
    return evaluateAchievements({ records, analysis, scores30: scoresFromAnalysis(analysis, today, 30, active) });
  }, [analysis, records, categories, today]);
}

export const achievementName = (id: AchievementId) => t(`achievements.items.${id}.name`);
export const achievementCondition = (id: AchievementId) => t(`achievements.items.${id}.condition`);
