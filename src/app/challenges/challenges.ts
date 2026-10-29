// Retos en la app (spec 15, §3.2 a §3.6): crear, unirse, abandonar, cancelar y sincronizar. La copia local vive en la
// tabla `challenges`; al servidor solo van las fechas cumplidas de la actividad del reto (SY-02, NFR15-01).
import { changeStatus, createActivity, loadRecord, loadSettings, saveSetting, type DataContext } from '../../data/repository';
import {
  MARK_GRACE_DAYS,
  endDate,
  inRange,
  type Challenge,
  type ChallengeDifficulty,
  type ChallengeMode,
  type ChallengeView,
  type LocalChallenge,
} from '../../domain/challenges/challenges';
import { addDays, toLocalDate, type LocalDate } from '../../domain/time/localDate';
import type { DeviceAccount } from '../account/account';
import { social } from '../friends/friends';

export interface ChallengeInput {
  name: string;
  difficulty: ChallengeDifficulty;
  days: number;
  start: string;
  mode: ChallengeMode;
}

const todayOf = (ctx: DataContext) => toLocalDate(ctx.now());

/** Invitación a un reto en la bandeja (IN-14). */
export interface ChallengeInvite {
  challenge: Challenge;
  from: { id: string; alias: string; level: number };
  at: string;
  people: number;
}

/** Descarga las invitaciones pendientes y las guarda en el dispositivo para Hoy y Objetivos (IN-14). */
export async function refreshInvites(ctx: DataContext, account: DeviceAccount): Promise<ChallengeInvite[]> {
  const { invites } = await social<{ invites: ChallengeInvite[] }>(account, 'GET', 'invites');
  await saveSetting(ctx.db, 'challengeInvites', invites);
  return invites;
}

/** Rechazar no avisa a quien invitó (IN-14). */
export async function declineInvite(ctx: DataContext, account: DeviceAccount, id: string) {
  await social(account, 'POST', 'invites/decline', { id });
  const settings = await loadSettings(ctx.db);
  await saveSetting(ctx.db, 'challengeInvites', (settings.challengeInvites ?? []).filter((i) => i.challenge.id !== id));
}

export const getChallenge = (a: DeviceAccount, id: string) => social<ChallengeView>(a, 'GET', `challenges/${encodeURIComponent(id)}`);

async function saveView(ctx: DataContext, view: ChallengeView, patch: Partial<LocalChallenge> = {}) {
  const prev = await ctx.db.challenges.get(view.challenge.id);
  await ctx.db.challenges.put({ ...prev, ...patch, id: view.challenge.id, view, fetchedAt: ctx.now().toISOString() });
}

/** La actividad del reto: diaria, 1 vez, con el nombre y la dificultad del reto y el área elegida (RT-07). */
async function createChallengeActivity(ctx: DataContext, c: Challenge, categoryId: string) {
  return createActivity(ctx, { name: c.name, challengeId: c.id, config: { period: 'day', target: 1, difficulty: c.difficulty, categoryId } });
}

/** RT-03: el creador es el primer participante y se le crea su actividad. */
export async function createChallenge(ctx: DataContext, account: DeviceAccount, input: ChallengeInput, categoryId: string): Promise<string> {
  const view = await social<ChallengeView>(account, 'POST', 'challenges/create', { ...input, today: todayOf(ctx) });
  const activityId = await createChallengeActivity(ctx, view.challenge, categoryId);
  await saveView(ctx, view, { activityId, sent: [] });
  return view.challenge.id;
}

/** IN-04: unirse crea siempre una actividad nueva (D-145). */
export async function joinChallenge(ctx: DataContext, account: DeviceAccount, id: string, categoryId: string): Promise<ChallengeView> {
  const view = await social<ChallengeView>(account, 'POST', 'challenges/join', { id, today: todayOf(ctx) });
  const local = await ctx.db.challenges.get(id);
  const activityId = local?.activityId ?? (await createChallengeActivity(ctx, view.challenge, categoryId));
  await saveView(ctx, view, { activityId, sent: local?.sent ?? [] });
  const settings = await loadSettings(ctx.db);
  await saveSetting(ctx.db, 'challengeInvites', (settings.challengeInvites ?? []).filter((i) => i.challenge.id !== id));
  return view;
}

/**
 * MK-04 y D-186: abandonar archiva la actividad (su historial y su XP se quedan) y quita el reto de tu lista. Si eras
 * el último, el servidor lo borra del todo.
 */
export async function leaveChallenge(ctx: DataContext, account: DeviceAccount, id: string) {
  await syncMarks(ctx, account).catch(() => undefined);
  await social(account, 'POST', 'challenges/leave', { id, today: todayOf(ctx) });
  await archiveActivity(ctx, id);
  await ctx.db.challenges.delete(id);
}

/** IN-01: invitar directamente a un amigo; le llega como aviso. */
export async function inviteFriend(ctx: DataContext, account: DeviceAccount, id: string, friendId: string) {
  await social(account, 'POST', 'challenges/invite', { id, friendId, today: todayOf(ctx) });
}

/** RT-04: solo el creador y antes de que empiece. */
export async function cancelChallenge(ctx: DataContext, account: DeviceAccount, id: string) {
  const view = await social<ChallengeView>(account, 'POST', 'challenges/cancel', { id, today: todayOf(ctx) });
  await saveView(ctx, view);
  await archiveActivity(ctx, id);
}

async function archiveActivity(ctx: DataContext, challengeId: string) {
  const local = await ctx.db.challenges.get(challengeId);
  if (local?.activityId) await changeStatus(ctx, local.activityId, 'archived');
}

/**
 * Descarga el progreso de todos los retos (SY-05) y archiva la actividad de los terminados o cancelados (RT-11). Un
 * reto que ya no está en tu lista (lo abandonaste desde otro dispositivo o se borró, D-186) sale también de este.
 */
export async function refreshChallenges(ctx: DataContext, account: DeviceAccount) {
  const { challenges } = await social<{ challenges: ChallengeView[] }>(account, 'GET', 'challenges/mine');
  const today = todayOf(ctx);
  const ids = new Set(challenges.map((v) => v.challenge.id));
  for (const local of await ctx.db.challenges.toArray()) {
    if (ids.has(local.id)) continue;
    await archiveIfActive(ctx, local.activityId);
    await ctx.db.challenges.delete(local.id);
  }
  for (const view of challenges) {
    const me = view.participants.find((p) => p.id === account.id);
    await saveView(ctx, view, { left: !!me?.left });
    if (view.challenge.cancelled || me?.left || endDate(view.challenge) < today) {
      const local = await ctx.db.challenges.get(view.challenge.id);
      await archiveIfActive(ctx, local?.activityId);
    }
  }
}

async function archiveIfActive(ctx: DataContext, activityId: string | undefined) {
  if (!activityId) return;
  const record = await loadRecord(ctx.db, activityId);
  if (record && !record.events.some((e) => e.type === 'archived')) await changeStatus(ctx, activityId, 'archived');
}

/** Refresca un reto (al entrar en él, SY-05). */
export async function refreshChallenge(ctx: DataContext, account: DeviceAccount, id: string) {
  const view = await getChallenge(account, id);
  await saveView(ctx, view);
  return view;
}

/**
 * Envía las fechas cumplidas que faltan y retira las deshechas (SY-02), dentro del margen de SY-04. Compara lo
 * registrado en la actividad con lo que el servidor ya tiene; sin cambios no llama al servidor.
 */
export async function syncMarks(ctx: DataContext, account: DeviceAccount) {
  const today = todayOf(ctx);
  const from = addDays(today as LocalDate, -MARK_GRACE_DAYS);
  for (const local of await ctx.db.challenges.toArray()) {
    const c = local.view.challenge;
    if (!local.activityId || local.left || c.cancelled) continue;
    const me = local.view.participants.find((p) => p.id === account.id);
    if (!me) continue;
    const record = await loadRecord(ctx.db, local.activityId);
    if (!record) continue;
    const window = (d: string) => inRange(c, d) && d >= from && d <= today;
    const logged = new Set(record.completions.map((x) => x.date as string).filter(window));
    const server = new Set(me.done.filter(window));
    let done = me.done;
    for (const date of logged) if (!server.has(date)) ({ done } = await social<{ done: string[] }>(account, 'POST', 'challenges/mark', { id: c.id, date }));
    for (const date of server) if (!logged.has(date)) ({ done } = await social<{ done: string[] }>(account, 'POST', 'challenges/unmark', { id: c.id, date }));
    if (done !== me.done) {
      const participants = local.view.participants.map((p) => (p.id === account.id ? { ...p, done } : p));
      await ctx.db.challenges.update(c.id, { view: { ...local.view, participants } });
    }
  }
}
