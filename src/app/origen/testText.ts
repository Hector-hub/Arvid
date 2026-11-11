// Textos de la historia que dependen de tus datos: el objetivo de una prueba (nombres de actividades y categorías) y
// las variables `{tiempo}` y `{segundos}` de los capítulos (CA-07).
import { useCategories, useRecords } from '../data';
import { elapsed, sessionSeconds, type OrigenState, type VoiceId } from '../../domain/origen/origen';
import type { ProgramTest } from '../../domain/origen/programTests';
import { diffDays, toLocalDate } from '../../domain/time/localDate';
import { t, tDynamic } from '../../i18n';
import { categoryName } from '../text';

export const testNumber = (n: number) => String(n).padStart(2, '0');

export interface TestNames {
  activity: (id: string | undefined) => string;
  category: (id: string | undefined) => string;
}

export function useTestNames(): TestNames {
  const records = useRecords();
  const categories = useCategories();
  return {
    activity: (id) => records?.find((r) => r.activity.id === id)?.activity.name ?? '—',
    category: (id) => {
      const c = categories?.find((x) => x.id === id);
      return c ? categoryName(c) : '—';
    },
  };
}

export function testObjective(test: ProgramTest, names: TestNames): string {
  return tDynamic(`origen.test.objective.${test.type}`, {
    times: test.times,
    activity: names.activity(test.activityId),
    category: names.category(test.categoryId),
    threshold: test.threshold ?? 0,
  });
}

let vars: { tiempo: string; segundos: number } = { tiempo: '', segundos: 0 };

/** Variables de los textos de la historia; las fija el vigilante con tus datos. */
export function setOriginText(state: OrigenState | undefined, voice: VoiceId, now = new Date()): void {
  const days = state?.contactAt ? diffDays(toLocalDate(new Date(state.contactAt)), toLocalDate(now)) : 0;
  const { unit, count } = elapsed(days);
  vars = { tiempo: unit === 'year' ? t('origen.time.year') : tDynamic(`origen.time.${unit}`, { count }), segundos: sessionSeconds(3, voice) };
}

export const originText = () => vars;
