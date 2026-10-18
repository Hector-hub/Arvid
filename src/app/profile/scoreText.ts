import { MIN_ITEMS, type BreakdownEntry, type Score, type Trend } from '../../domain/attributes/attributes';
import { t } from '../../i18n';
import { decimalText, joinList, periodUnit } from '../text';

export function pointsText(cents: number): string {
  return decimalText(cents / 100);
}

export function scoreValueText(score: Score | undefined): string {
  if (!score || score.value === undefined) return t('score.noData', { items: score?.items ?? 0, min: MIN_ITEMS });
  return String(score.value);
}

/** "↑ subiendo 6", "estable", "↓ bajando 8" (R-AT5). */
export function trendText(tr: Trend | undefined): string | undefined {
  if (!tr) return undefined;
  if (tr.direction === 'up') return t('score.up', { delta: tr.delta });
  if (tr.direction === 'down') return t('score.down', { delta: Math.abs(tr.delta) });
  return t('score.stable');
}

/** "4 semanas de Gym, 29 días de Caminar y 1 misión" (ATR-06, game-design §10). */
export function breakdownText(breakdown: BreakdownEntry[], activityName: (id: string) => string): string {
  const parts = breakdown.flatMap((b) => {
    if (b.source === 'activity')
      return [t('score.activityPart', { count: b.periods, unit: periodUnit(b.kind, b.periods), name: activityName(b.activityId) })];
    if (b.source === 'missions') return [t('score.missions', { count: b.count })];
    return [];
  });
  return joinList(parts);
}

/** "1 misión vencida resta 10 puntos posibles" (ATR-06). */
export function penaltyText(b: Extract<BreakdownEntry, { source: 'penalty' }>): string {
  const vars = { count: b.missionIds.length, points: pointsText(b.possibleCents) };
  return b.reason === 'expired' ? t('score.expired', vars) : t('score.abandoned', vars);
}

/** Explicación de un atributo o de Disciplina (DA-02, DA-05, game-design §10). */
export function explanationText(params: {
  label: string;
  score: Score;
  window: number;
  activityName: (id: string) => string;
}): string {
  const { label, score, window, activityName } = params;
  if (score.value === undefined) return t('score.notEnough', { items: score.items, min: MIN_ITEMS });
  const detail = breakdownText(score.breakdown, activityName);
  return t('score.explanation', {
    label,
    value: score.value,
    earned: pointsText(score.earnedCents),
    possible: pointsText(score.possibleCents),
    window,
    detail: detail ? ` (${detail})` : '',
  });
}
