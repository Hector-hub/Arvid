// Retos entre amigos (spec 15, §3.2 a §3.7): tipos compartidos por la app y el servidor y la lógica pura de fechas,
// meta del grupo y clasificación. Las fechas son locales de cada participante (SY-03), en `YYYY-MM-DD`.
import { addDays, diffDays, isLocalDate, type LocalDate } from '../time/localDate';

export type ChallengeMode = 'coop' | 'versus';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export const MIN_DAYS = 3;
export const MAX_DAYS = 60;
export const QUICK_DAYS = [7, 14, 21, 30] as const;
export const MAX_START_DAYS = 30;
export const MAX_PARTICIPANTS = 20; // RT-05, D-145
export const MAX_ACTIVE = 5; // RT-05
/** Días de margen para marcar sin conexión (SY-04). */
export const MARK_GRACE_DAYS = 2;
/** Meta del grupo en el cooperativo y umbral de «cumplido» en el competitivo (MK-02, S15-06). */
export const GOAL_RATIO = 0.8;

export interface Challenge {
  id: string;
  owner: string;
  name: string;
  difficulty: ChallengeDifficulty;
  days: number;
  start: string;
  mode: ChallengeMode;
  createdAt: string;
  cancelled?: boolean;
}

export interface Participant {
  id: string;
  alias: string;
  level: number;
  joinedAt: string;
  done: string[];
  /** Fecha en que abandonó (MK-04): sus días hasta entonces se quedan. */
  left?: string;
}

/** Lo que devuelve el servidor de un reto. */
export interface ChallengeView {
  challenge: Challenge;
  participants: Participant[];
  /** Si quien pregunta es amigo del creador (AM-03). */
  ownerFriend?: boolean;
}

/** Copia local (Dexie, tabla `challenges`): el reto, la actividad que creó al unirse y el último marcador descargado. */
export interface LocalChallenge {
  id: string;
  activityId?: string;
  view: ChallengeView;
  fetchedAt: string;
  /** Fechas cumplidas que el servidor ya tiene de este dispositivo (SY-02). */
  sent?: string[];
  left?: boolean;
}

export const endDate = (c: Pick<Challenge, 'start' | 'days'>): string => addDays(c.start as LocalDate, c.days - 1);

/** Día del reto (1 = el primero); 0 si aún no empezó y `days + 1` si ya terminó. */
export function challengeDay(c: Pick<Challenge, 'start' | 'days'>, today: string): number {
  const d = diffDays(c.start as LocalDate, today as LocalDate) + 1;
  return Math.max(0, Math.min(c.days + 1, d));
}

export const inRange = (c: Pick<Challenge, 'start' | 'days'>, date: string) =>
  isLocalDate(date) && date >= c.start && date <= endDate(c);

/** Fechas que cuentan de un participante: dentro del reto y antes de abandonar. */
export function countedDays(c: Challenge, p: Participant): string[] {
  return [...new Set(p.done)].filter((d) => inRange(c, d) && (!p.left || d < p.left)).sort();
}

/** Cooperativo (MK-02): días cumplidos del grupo frente a la meta del 80 % del total; quien abandona deja de sumar. */
export function groupGoal(view: ChallengeView): { done: number; total: number; goal: number; ratio: number } {
  const c = view.challenge;
  let total = 0;
  let done = 0;
  for (const p of view.participants) {
    total += p.left ? Math.max(0, Math.min(c.days, diffDays(c.start as LocalDate, p.left as LocalDate))) : c.days;
    done += countedDays(c, p).length;
  }
  const goal = Math.ceil(total * GOAL_RATIO);
  return { done, total, goal, ratio: total ? done / total : 0 };
}

/** Competitivo (MK-03): por días cumplidos; los empates comparten puesto. */
export function ranking(view: ChallengeView): { participant: Participant; days: number; place: number }[] {
  const rows = view.participants
    .map((participant) => ({ participant, days: countedDays(view.challenge, participant).length }))
    .sort((a, b) => b.days - a.days || a.participant.alias.localeCompare(b.participant.alias));
  return rows.map((r) => ({ ...r, place: rows.findIndex((x) => x.days === r.days) + 1 }));
}

/** Reto en curso o por empezar para esa persona (RT-05). */
export const isActive = (c: Challenge, today: string, left?: string) => !c.cancelled && !left && endDate(c) >= today;

// ---------- El final (FN, D-146, D-148) ----------

export type ChallengeResult =
  | { state: 'running' }
  /** Terminado, dentro del margen de SY-04: marcador provisional (FN-01). */
  | { state: 'pending'; resultOn: string }
  | { state: 'coop'; success: boolean; percent: number }
  | { state: 'versus'; winners: Participant[]; place: number | undefined; days: number };

/** Día en que se calcula el resultado: el siguiente al último día del margen (FN-01). */
export const resultDate = (c: Pick<Challenge, 'start' | 'days'>) => addDays(endDate(c) as LocalDate, MARK_GRACE_DAYS + 1);

/** El resultado del reto para `me` (FN-02, FN-03). */
export function challengeResult(view: ChallengeView, me: string, today: string): ChallengeResult {
  const c = view.challenge;
  if (endDate(c) >= today || c.cancelled) return { state: 'running' };
  if (today < resultDate(c)) return { state: 'pending', resultOn: resultDate(c) };
  if (c.mode === 'coop') {
    const g = groupGoal(view);
    return { state: 'coop', success: g.done >= g.goal && g.total > 0, percent: Math.round(g.ratio * 100) };
  }
  const rows = ranking(view);
  const best = rows[0]?.days ?? 0;
  const mine = rows.find((r) => r.participant.id === me);
  return { state: 'versus', winners: best > 0 ? rows.filter((r) => r.days === best).map((r) => r.participant) : [], place: mine?.place, days: mine?.days ?? 0 };
}

/**
 * Cuenta como reto cumplido en el Perfil (FN-04): en el cooperativo, si el grupo lo logró y no abandonaste; en el
 * competitivo, si cumpliste al menos el 80 % de los días, ganes o no (S15-06).
 */
export function fulfilled(view: ChallengeView, me: string, today: string): boolean {
  const result = challengeResult(view, me, today);
  const p = view.participants.find((x) => x.id === me);
  if (!p) return false;
  if (result.state === 'coop') return result.success && !p.left;
  if (result.state === 'versus') return result.days >= Math.ceil(view.challenge.days * GOAL_RATIO);
  return false;
}
