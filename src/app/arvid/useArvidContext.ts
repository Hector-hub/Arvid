import { useCallback } from 'react';
import { computeProfile } from '../../domain/attributes/attributes';
import { buildAiContext } from '../../domain/arvid/context';
import { getLocale } from '../../i18n';
import { useAnalysis } from '../analysis';
import { useToday } from '../clock';
import { useCategories, useMissions, useRecords, useSettings } from '../data';
import { categoryName, levelTitle } from '../text';

/**
 * Calcula el contexto para ARVID con IA (IA-04) en el momento de preguntar, con los datos actuales. Devuelve un
 * contexto mínimo mientras los datos cargan.
 */
export function useArvidContext(): () => Record<string, unknown> {
  const settings = useSettings();
  const records = useRecords();
  const missions = useMissions();
  const categories = useCategories();
  const analysis = useAnalysis();
  const today = useToday();

  return useCallback(() => {
    const user = { alias: settings?.profile?.alias, gender: settings?.profile?.gender, locale: getLocale() };
    if (!analysis || !records || !missions || !categories) return { user };
    const active = categories.filter((c) => c.active && !c.archivedAt);
    const byId = new Map(categories.map((c) => [c.id, c]));
    const params = { analysis, records, missions, today, categoryIds: active.map((c) => c.id) };
    const now = new Date();
    return buildAiContext({
      user,
      today,
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      analysis,
      levelTitle: levelTitle(analysis.progress.level),
      records,
      missions,
      profile7: computeProfile({ ...params, window: 7 }),
      profile30: computeProfile({ ...params, window: 30 }),
      categories: active.map((c) => ({ id: c.id, name: categoryName(c) })),
      categoryName: (id) => categoryName(byId.get(id)),
    });
  }, [settings, records, missions, categories, analysis, today]);
}
