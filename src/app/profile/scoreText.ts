import { MIN_ITEMS, type BreakdownEntry, type Score, type Trend } from '../../domain/attributes/attributes';
import { periodUnit } from '../text';

const NUMBER = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });

export function pointsText(cents: number): string {
  return NUMBER.format(cents / 100);
}

export function scoreValueText(score: Score | undefined): string {
  if (!score || score.value === undefined) return `sin datos (${score?.items ?? 0} de ${MIN_ITEMS})`;
  return String(score.value);
}

/** "↑ subiendo 6", "estable", "↓ bajando 8" (R-AT5). */
export function trendText(t: Trend | undefined): string | undefined {
  if (!t) return undefined;
  if (t.direction === 'up') return `↑ subiendo ${t.delta}`;
  if (t.direction === 'down') return `↓ bajando ${Math.abs(t.delta)}`;
  return 'estable';
}

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}`;
}

/** "4 semanas de Gym, 29 días de Caminar y 1 misión" (ATR-06, game-design §10). */
export function breakdownText(breakdown: BreakdownEntry[], activityName: (id: string) => string): string {
  const parts = breakdown.flatMap((b) => {
    if (b.source === 'activity') return [`${b.periods} ${periodUnit(b.kind, b.periods)} de ${activityName(b.activityId)}`];
    if (b.source === 'missions') return [`${b.count} ${b.count === 1 ? 'misión' : 'misiones'}`];
    return [];
  });
  return joinList(parts);
}

/** "1 misión vencida resta 10 puntos posibles" (ATR-06). */
export function penaltyText(b: Extract<BreakdownEntry, { source: 'penalty' }>): string {
  const n = b.missionIds.length;
  const what = b.reason === 'expired' ? (n === 1 ? 'misión vencida resta' : 'misiones vencidas restan') : n === 1 ? 'misión abandonada resta' : 'misiones abandonadas restan';
  return `${n} ${what} ${pointsText(b.possibleCents)} puntos posibles`;
}

/** Explicación de un atributo o de Disciplina (DA-02, DA-05, game-design §10). */
export function explanationText(params: {
  label: string;
  score: Score;
  window: number;
  activityName: (id: string) => string;
}): string {
  const { label, score, window, activityName } = params;
  if (score.value === undefined) return `Aún no hay suficiente información: ${score.items} de ${MIN_ITEMS} elementos necesarios.`;
  const detail = breakdownText(score.breakdown, activityName);
  return `${label} ${score.value}: ganaste ${pointsText(score.earnedCents)} de ${pointsText(score.possibleCents)} puntos posibles en los últimos ${window} días${detail ? ` (${detail})` : ''}.`;
}
