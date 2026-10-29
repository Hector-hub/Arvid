// Lo que hace el service worker al recibir un aviso (spec 10, PV-02, PV-03, BG-02): lee los datos del dispositivo,
// escribe el texto en la voz del compañero y calcula el número del icono.
import { loadMissions } from '../../data/missions';
import { loadRecords, loadSettings } from '../../data/repository';
import type { ArvidDB } from '../../data/db';
import { COMPANION_NAME, COMPANION_SELF_O } from '../../domain/arvid/companion';
import { buildDigest, type PushKind } from '../../domain/notifications/digest';
import { detectLocale, setGlobalVars, setLocale, t } from '../../i18n';
import { inRange } from '../../domain/challenges/challenges';
import { toLocalDate } from '../../domain/time/localDate';

/** Un aviso que llega más de 2 h tarde (p. ej. el móvil estaba apagado) ya no dice lo de su hora. */
export const LATE_MS = 2 * 60 * 60 * 1000;

export interface PushData {
  kind: PushKind | 'social';
  ref?: string;
  at?: string;
}

/** Aviso de amigos y retos (spec 15, AV-01, AV-03, AV-04): los datos los manda el servidor. */
export interface SocialPushData {
  kind: 'social';
  type: 'friend-request' | 'friend-accepted' | 'challenge-invite' | 'challenge-progress' | 'challenge-overtaken' | 'challenge-end';
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

export interface PushNotice {
  title: string;
  body: string;
  /** Número del icono, o `undefined` si el usuario lo desactivó (BG-03). */
  badge: number | undefined;
}

export async function noticeFor(db: ArvidDB, data: PushData | SocialPushData, now: Date): Promise<PushNotice> {
  const [records, missions, settings] = await Promise.all([loadRecords(db), loadMissions(db), loadSettings(db)]);
  setLocale(settings.locale ?? detectLocale());
  setGlobalVars({ companion: COMPANION_NAME[settings.companion], selfO: COMPANION_SELF_O[settings.companion] });
  if (data.kind === 'social') return { title: COMPANION_NAME[settings.companion], body: socialText(data as SocialPushData), badge: undefined };
  const digest = buildDigest({ records, missions, now, kind: data.kind, ref: data.ref });
  const late = data.at !== undefined && now.getTime() - new Date(data.at).getTime() > LATE_MS;
  let body = late ? t('notifications.calm') : digest.body;
  // AV-02: el reto de hoy sin marcar entra en el resumen de la tarde, sin aviso aparte
  if (data.kind === 'night' && !late && settings.notifications?.social?.reminder !== false) {
    const today = toLocalDate(now);
    const doneToday = new Set(records.flatMap((r) => (r.completions.some((c) => c.date === today) ? [r.activity.id] : [])));
    const pending = (await db.challenges.toArray())
      .filter((l) => l.activityId && !l.left && !l.view.challenge.cancelled && inRange(l.view.challenge, today) && !doneToday.has(l.activityId))
      .map((l) => l.view.challenge.name);
    if (pending.length) body = `${body} ${t('notifications.night.challenge', { names: pending.slice(0, 3).join(', ') })}`;
  }
  return {
    title: COMPANION_NAME[settings.companion],
    body,
    badge: settings.notifications?.badge === false ? undefined : digest.badge,
  };
}

function socialText(d: SocialPushData): string {
  const vars = { alias: d.alias ?? '', name: d.name ?? '', done: d.done ?? 0, total: d.total ?? 0, percent: d.percent ?? 0 };
  if (d.type !== 'challenge-end') return t(`notifications.social.${d.type}`, vars);
  if (d.success !== undefined) return t(d.success ? 'notifications.social.coopWon' : 'notifications.social.coopLost', vars);
  const winners = d.winners ?? [];
  const head = winners.length > 1 ? t('notifications.social.tie', { ...vars, names: winners.join(', ') }) : t('notifications.social.won', { ...vars, alias: winners[0] ?? '' });
  return d.place ? `${head} ${t('notifications.social.place', { place: d.place })}` : head;
}
