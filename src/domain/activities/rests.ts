// Descansos planificados (spec 12, DS): validación y a qué actividades y días afectan.
import { compareDates, type LocalDate } from '../time/localDate';
import type { DateRange, Rest } from './types';

export const REST_NOTE_MAX = 40;

export type RestError = 'from-past' | 'to-before-from' | 'no-activities' | 'note-too-long';

/** DS-01, DS-02: desde hoy en adelante, fin no anterior al inicio, al menos una actividad si se eligen. */
export function validateRest(input: { from: LocalDate; to: LocalDate; activityIds?: string[]; note?: string }, today: LocalDate): RestError | undefined {
  if (compareDates(input.from, today) < 0) return 'from-past';
  if (compareDates(input.to, input.from) < 0) return 'to-before-from';
  if (input.activityIds && input.activityIds.length === 0) return 'no-activities';
  if ((input.note ?? '').trim().length > REST_NOTE_MAX) return 'note-too-long';
  return undefined;
}

export const restCovers = (rest: Rest, activityId: string) => !rest.activityIds || rest.activityIds.includes(activityId);

/** Rangos de descanso de una actividad (para su `ActivityRecord`). */
export function restsFor(rests: readonly Rest[], activityId: string): DateRange[] {
  return rests.filter((r) => restCovers(r, activityId)).map(({ from, to }) => ({ from, to }));
}

export const inRange = (range: DateRange, date: LocalDate) => compareDates(range.from, date) <= 0 && compareDates(date, range.to) <= 0;

/** ¿Descansa la actividad ese día? */
export function restingOn(rests: readonly DateRange[] | undefined, date: LocalDate): boolean {
  return (rests ?? []).some((r) => inRange(r, date));
}

/** Descansos que aún importan (en curso o futuros), ordenados por inicio. */
export function upcomingRests(rests: readonly Rest[], today: LocalDate): Rest[] {
  return rests.filter((r) => compareDates(r.to, today) >= 0).sort((a, b) => compareDates(a.from, b.from));
}
