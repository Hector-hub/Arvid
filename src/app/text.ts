// Textos y formatos de la interfaz en el idioma activo (spec 06, I18N). Los textos están en src/i18n/*.json.
import { createElement, Fragment, type ReactNode } from 'react';
import type { Difficulty } from '../domain/config';
import { DIFFICULTY_POINTS } from '../domain/config';
import type { LogDenial } from '../domain/activities/rules';
import { CATEGORY_PRESETS, type Category } from '../domain/categories';
import { TITLES } from '../domain/progress/progress';
import { asLocalDate, type LocalDate } from '../domain/time/localDate';
import type { PeriodKind } from '../domain/time/period';
import { getLocale, t, tDynamic, type TKey } from '../i18n';

export function periodLabel(kind: PeriodKind): string {
  return t(`period.label.${kind}`);
}

export function sectionTitle(kind: PeriodKind): string {
  return t(`period.section.${kind}`);
}

export function difficultyLabel(d: Difficulty): string {
  return t(`difficulty.${d}`);
}

export function difficultyText(d: Difficulty): string {
  return t('difficulty.text', { label: difficultyLabel(d), points: DIFFICULTY_POINTS[d] });
}

/** Unidad del periodo en singular o plural: "día" / "días". */
export function periodUnit(kind: PeriodKind, n: number): string {
  return t(`units.${kind}`, { count: n });
}

/** "4 veces/semana", "1 vez/día". */
export function frequencyText(target: number, period: PeriodKind): string {
  return t('format.frequency', { count: target, unit: t(`period.per.${period}`) });
}

export function progressText(count: number, target: number): string {
  return t('format.progress', { count, target });
}

export function daysLeftText(days: number): string {
  return days === 1 ? t('format.lastDay') : t('format.daysLeft', { count: days });
}

function toDate(date: LocalDate): Date {
  return new Date(`${date}T12:00:00`);
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Sábado, 17 oct" / "Saturday, Oct 17". */
export function longDate(date: LocalDate): string {
  const d = toDate(date);
  const locale = getLocale();
  if (locale === 'en') return new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric' }).format(d);
  const weekday = new Intl.DateTimeFormat('es', { weekday: 'long' }).format(d);
  const month = new Intl.DateTimeFormat('es', { month: 'short' }).format(d).replace('.', '');
  return `${capitalize(weekday)}, ${d.getDate()} ${month}`;
}

/** "lun 19" / "Mon 19". */
export function shortDay(date: LocalDate): string {
  const d = toDate(date);
  const weekday = new Intl.DateTimeFormat(getLocale(), { weekday: 'short' }).format(d).replace('.', '');
  return `${weekday} ${d.getDate()}`;
}

/** "12 oct" / "Oct 12". */
export function dayMonth(date: LocalDate): string {
  return new Intl.DateTimeFormat(getLocale(), { day: 'numeric', month: 'short' }).format(toDate(date)).replace('.', '');
}

/** "oct 2026" / "Oct 2026". */
export function monthYear(date: LocalDate): string {
  return new Intl.DateTimeFormat(getLocale(), { month: 'short', year: 'numeric' }).format(toDate(date)).replace('.', '');
}

/** "17 oct 2026" / "Oct 17, 2026". */
export function fullDate(date: Date): string {
  return new Intl.DateTimeFormat(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function pendingTodayText(pending: number): string {
  return pending === 0 ? t('format.dayComplete') : t('format.pendingToday', { count: pending });
}

export function logDenialText(reason: LogDenial): string {
  return t(`logDenial.${reason}`);
}

export function parseLocalDate(value: string | undefined): LocalDate | undefined {
  try {
    return value ? asLocalDate(value) : undefined;
  } catch {
    return undefined;
  }
}

/** "racha 6 días" / "6-day streak" (STR-02). */
export function streakText(n: number, kind: PeriodKind): string {
  return t('format.streak', { count: n, unit: getLocale() === 'en' ? t(`units.${kind}`, { count: 1 }) : periodUnit(kind, n) });
}

/** "+2,5 XP" / "−2,5 XP" a partir de centésimas. */
export function xpDeltaText(cents: number): string {
  const sign = cents < 0 ? '−' : '+';
  return `${sign}${new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }).format(Math.abs(cents) / 100)} XP`;
}

export function intText(n: number): string {
  return new Intl.NumberFormat(getLocale()).format(n);
}

export function decimalText(n: number): string {
  return new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }).format(n);
}

/** "hoy", "ayer", "hace 3 días". */
export function daysAgoText(days: number): string {
  if (days <= 0) return t('format.today');
  if (days === 1) return t('format.yesterday');
  return t('format.daysAgo', { count: days });
}

/** Plazo de una misión (MHOY-02): "vence hoy", "vence mañana", "vence el vie 23", "vence el 30 nov", "sin fecha". */
export function missionDueText(deadline: LocalDate | undefined, today: LocalDate): string {
  if (!deadline) return t('format.dueNone');
  const days = Math.round((Date.parse(`${deadline}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  if (days === 0) return t('format.dueToday');
  if (days === 1) return t('format.dueTomorrow');
  return t('format.dueOn', { date: days > 1 && days <= 6 ? shortDay(deadline) : dayMonth(deadline) });
}

export function missionsDueText(n: number): string {
  return t('format.missionsDue', { count: n });
}

/** Nombre de una categoría: las predefinidas sin renombrar se traducen (I18N-04). */
export function categoryName(category: Pick<Category, 'name' | 'presetKey'> | undefined): string {
  if (!category) return '';
  const preset = CATEGORY_PRESETS.find((p) => p.key === category.presetKey);
  return preset && preset.name === category.name ? tDynamic(`categories.${preset.key}`) : category.name;
}

/** Título del nivel traducido (las claves siguen los umbrales de game-design). */
export function levelTitle(level: number): string {
  let threshold = TITLES[0]!.level;
  for (const tt of TITLES) if (level >= tt.level) threshold = tt.level;
  return tDynamic(`titles.l${threshold}`);
}

/** Código de error del dominio → texto (`errors.<código>`). */
export function errorText(code: string | undefined, vars?: Record<string, number | string>): string | undefined {
  return code ? tDynamic(`errors.${code}`, vars) : undefined;
}

/** Une una lista: "a, b y c" / "a, b and c". */
export function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(t('common.listJoin'))}${t('common.andJoin')}${parts.at(-1)}`;
}

/** Texto con **negritas** marcadas en el JSON. */
export function rich(key: TKey): ReactNode {
  const parts = t(key).split('**');
  return createElement(
    Fragment,
    null,
    ...parts.map((p, i) => (i % 2 === 1 ? createElement('strong', { key: i }, p) : p)),
  );
}
