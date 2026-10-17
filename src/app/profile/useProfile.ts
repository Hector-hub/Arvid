import { useMemo } from 'react';
import { computeProfile, type Profile, type WindowDays } from '../../domain/attributes/attributes';
import type { Category } from '../../domain/categories';
import { useAnalysis } from '../analysis';
import { useToday } from '../clock';
import { useCategories, useMissions, useRecords } from '../data';

export interface ProfileView {
  profile: Profile;
  /** Categorías activas, en orden: ejes del radar y filas de la lista (R-AT9). */
  categories: Category[];
}

/** Atributos y Disciplina de la ventana elegida y de la anterior (ATR-01 a ATR-05). */
export function useProfile(window: WindowDays): ProfileView | undefined {
  const analysis = useAnalysis();
  const records = useRecords();
  const missions = useMissions();
  const allCategories = useCategories();
  const today = useToday();
  return useMemo(() => {
    if (!analysis || !records || !missions || !allCategories) return undefined;
    const categories = allCategories.filter((c) => c.active && !c.archivedAt);
    const profile = computeProfile({ analysis, records, missions, today, window, categoryIds: categories.map((c) => c.id) });
    return { profile, categories };
  }, [analysis, records, missions, allCategories, today, window]);
}
