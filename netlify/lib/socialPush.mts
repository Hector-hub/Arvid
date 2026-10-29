// Avisos de amigos y retos (spec 15, §3.8): los de AV-01 salen al momento desde /api/social; los de AV-03 y AV-04 los
// calcula el cron de día. Cada cuenta guarda en su documento social los dispositivos con avisos (AV-05) y qué tipos
// quiere; el texto lo escribe el service worker en el idioma del dispositivo.
import { getStore } from '@netlify/blobs';
import webpush from 'web-push';
import {
  challengeResult,
  countedDays,
  endDate,
  ranking,
  resultDate,
  type Challenge,
  type ChallengeView,
  type Participant,
} from '../../src/domain/challenges/challenges.ts';
import { PUSH_TTL_S, type DeviceEntry } from './push.mts';
import type { Account, KV, ListKV } from './account.mts';

export type SocialPushType = 'friend-request' | 'friend-accepted' | 'challenge-invite' | 'challenge-progress' | 'challenge-overtaken' | 'challenge-end';
export type SocialPref = 'invites' | 'progress' | 'final';

export const PREF_OF: Record<SocialPushType, SocialPref> = {
  'friend-request': 'invites',
  'friend-accepted': 'invites',
  'challenge-invite': 'invites',
  'challenge-progress': 'progress',
  'challenge-overtaken': 'progress',
  'challenge-end': 'final',
};

export interface SocialPush {
  kind: 'social';
  type: SocialPushType;
  url: string;
  alias?: string;
  name?: string;
  done?: number;
  total?: number;
  success?: boolean;
  percent?: number;
  winners?: string[];
  place?: number;
}

export interface SocialDevice {
  id: string;
  prefs: Record<SocialPref, boolean>;
}

export type Notify = (accountId: string, push: Omit<SocialPush, 'kind'>) => Promise<void>;

/** Envía por Web Push a los dispositivos de la cuenta que quieren ese tipo de aviso. */
export function webNotifier(devicesOf: (accountId: string) => Promise<SocialDevice[]>): Notify {
  return async (accountId, push) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) return;
    webpush.setVapidDetails('https://arvid-app.netlify.app', publicKey, privateKey);
    const store = getStore('push');
    for (const device of await devicesOf(accountId)) {
      if (!device.prefs[PREF_OF[push.type]]) continue;
      const entry = (await store.get(device.id, { type: 'json' }).catch(() => null)) as DeviceEntry | null;
      if (!entry) continue;
      await webpush
        .sendNotification(entry.subscription, JSON.stringify({ kind: 'social', ...push, at: new Date().toISOString() }), { TTL: PUSH_TTL_S, urgency: 'normal' })
        .catch((e: { statusCode?: number }) => console.error(`push social ${e.statusCode ?? '?'}`));
    }
  };
}

/** Zona horaria del primer dispositivo con avisos de la cuenta (para saber qué es «hoy» para esa persona). */
export async function pushZone(devices: SocialDevice[]): Promise<string | undefined> {
  const store = getStore('push');
  for (const d of devices) {
    const entry = (await store.get(d.id, { type: 'json' }).catch(() => null)) as DeviceEntry | null;
    if (entry?.tz) return entry.tz;
  }
  return undefined;
}

const DEFAULT_TZ = 'America/Santo_Domingo';
const dateIn = (now: number, tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

/** Estado de los avisos de un reto: a quién ya se avisó hoy (AV-03), el último marcador y si se avisó el final. */
interface NoticeState {
  sent: Record<string, string>;
  counts: Record<string, number>;
  ended?: boolean;
}

export interface CronDeps {
  challenges: ListKV<unknown>;
  accounts: KV<Account>;
  notify: Notify;
  zoneOf: (accountId: string) => Promise<string | undefined>;
  now: number;
}

/**
 * AV-03 y AV-04 (lo ejecuta el cron de día): por cada reto activo, como mucho un aviso de avances al día por persona
 * y el resultado al terminar el margen de SY-04. Los retos ya avisados salen del índice `index:active`.
 */
export async function sendChallengePushes(deps: CronDeps): Promise<void> {
  const { challenges: cs, now } = deps;
  const index = ((await cs.get('index:active')) as string[] | null) ?? [];
  const keep: string[] = [];
  for (const id of index) {
    const c = (await cs.get(`c:${id}`)) as Challenge | null;
    if (!c || c.cancelled) continue;
    const keys = await cs.list(`c:${id}:p:`);
    const participants = (await Promise.all(keys.map((k) => cs.get(k)))).filter(Boolean) as Participant[];
    const accounts = await Promise.all(participants.map((p) => deps.accounts.get(p.id)));
    const view: ChallengeView = { challenge: c, participants: participants.map((p, i) => ({ ...p, alias: accounts[i]?.alias ?? p.alias })) };
    const state = ((await cs.get(`n:${id}`)) as NoticeState | null) ?? { sent: {}, counts: {} };
    const url = `/retos/${id}`;
    const serverToday = dateIn(now, 'UTC');

    // AV-04: el resultado, a todos (también a quien abandonó: verá su resultado)
    if (serverToday >= resultDate(c)) {
      for (const p of view.participants) {
        const r = challengeResult(view, p.id, serverToday);
        if (r.state === 'coop') await deps.notify(p.id, { type: 'challenge-end', url, name: c.name, success: r.success, percent: r.percent });
        if (r.state === 'versus') await deps.notify(p.id, { type: 'challenge-end', url, name: c.name, winners: r.winners.map((w) => w.alias), place: r.place });
      }
      await cs.set(`n:${id}`, { ...state, ended: true });
      continue;
    }
    keep.push(id);
    if (serverToday < c.start || endDate(c) < dateIn(now - 86_400_000, 'UTC')) continue;

    // AV-03: avances de otros, como mucho uno al día por reto y persona
    const active = view.participants.filter((p) => !p.left);
    if (active.length < 2) continue;
    const counts = Object.fromEntries(view.participants.map((p) => [p.id, countedDays(c, p).length]));
    for (const me of active) {
      const today = dateIn(now, (await deps.zoneOf(me.id)) ?? DEFAULT_TZ);
      if (state.sent[me.id] === today) continue;
      if (c.mode === 'coop') {
        const doneToday = active.filter((p) => p.done.includes(today)).length;
        if (!me.done.includes(today) && doneToday * 2 >= active.length && doneToday > 0) {
          await deps.notify(me.id, { type: 'challenge-progress', url, name: c.name, done: doneToday, total: active.length });
          state.sent[me.id] = today;
        }
      } else {
        const mine = counts[me.id] ?? 0;
        const passer = ranking(view).find(
          (r) => r.participant.id !== me.id && !r.participant.left && r.days > mine && (state.counts[r.participant.id] ?? 0) <= (state.counts[me.id] ?? 0),
        );
        if (passer && state.counts[me.id] !== undefined) {
          await deps.notify(me.id, { type: 'challenge-overtaken', url, name: c.name, alias: passer.participant.alias });
          state.sent[me.id] = today;
        }
      }
    }
    await cs.set(`n:${id}`, { ...state, counts });
  }
  if (keep.length !== index.length) await cs.set('index:active', keep);
}
