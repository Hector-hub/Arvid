// Texto de cada notificación y número del badge (spec 10, RS, RA, PV-03, BG-01), calculados en el dispositivo con
// los datos locales: el servidor solo manda el tipo de aviso y, si es de una actividad, su referencia opaca.
import { evaluatePeriods } from '../activities/periods';
import { buildTodayView, type TodayItem } from '../activities/today';
import type { ActivityRecord } from '../activities/types';
import { analyzeMission, type MissionRecord } from '../missions/missions';
import { computeStreak } from '../progress/streaks';
import { toLocalDate } from '../time/localDate';
import { t } from '../../i18n';

export type PushKind = 'morning' | 'night' | 'activity';

export interface Digest {
  body: string;
  /** Pendientes de hoy para el icono (BG-01). */
  badge: number;
  /** No quedaba nada que avisar: mensaje breve de ánimo (PV-03). */
  calm: boolean;
}

export interface DigestInput {
  records: readonly ActivityRecord[];
  missions: readonly MissionRecord[];
  now: Date;
  kind: PushKind;
  /** `<idActividad>:<índice>` en los recordatorios por actividad. */
  ref?: string;
}

/** Nombres entre comillas latinas, separados con comas y «y»/«and» (lista del idioma activo). */
function names(list: readonly string[]): string {
  return list.map((n) => `«${n}»`).join(list.length > 2 ? ', ' : ` ${t('notifications.and')} `);
}

export function buildDigest({ records, missions, now, kind, ref }: DigestInput): Digest {
  const today = toLocalDate(now);
  const items: TodayItem[] = buildTodayView(records, today).sections.flatMap((s) => s.items);
  const dueToday = missions
    .filter((m) => {
      const a = analyzeMission(m, today);
      return a.state === 'pending' && a.deadline === today;
    })
    .map((m) => m.mission.title);
  // Lo que se tiene que hacer hoy: diarias pendientes, periodos que acaban hoy y misiones que vencen hoy; lo que
  // descansa hoy no cuenta (spec 12, DS-09)
  const endingToday = items.filter((i) => !i.done && !i.resting && i.daysRemaining <= 1);
  const allResting = items.length > 0 && items.every((i) => i.resting || i.done);
  const badge = endingToday.length + dueToday.length;
  const calm = (): Digest => ({ body: t('notifications.calm'), badge, calm: true });

  // Misión con hora (spec 12, MH-02): `mission:<id>`
  if (kind === 'activity' && ref?.startsWith('mission:')) {
    const record = missions.find((m) => m.mission.id === ref.slice('mission:'.length));
    if (!record || analyzeMission(record, today).state !== 'pending') return calm();
    return { body: t('notifications.mission', { name: record.mission.title }), badge, calm: false };
  }

  if (kind === 'activity') {
    const [id, index] = (ref ?? '').split(':');
    const item = items.find((i) => i.activityId === id);
    const reminder = records.find((r) => r.activity.id === id)?.activity.reminders?.[Number(index)];
    if (!item || item.done || item.resting || !reminder) return calm();
    return {
      body: t(`notifications.activity.${item.kind}`, { name: item.name, count: item.count + 1, target: item.target }),
      badge,
      calm: false,
    };
  }

  if (kind === 'morning') {
    const pending = items.filter((i) => !i.done && !i.resting).length;
    if (allResting && !dueToday.length) return { body: t('notifications.morning.rest'), badge, calm: false };
    if (!pending && !dueToday.length) return calm();
    const parts = [pending ? t('notifications.morning.activities', { count: pending }) : t('notifications.morning.noActivities')];
    if (dueToday.length === 1) parts.push(t('notifications.morning.missionDue', { name: dueToday[0]! }));
    else if (dueToday.length > 1) parts.push(t('notifications.morning.missionsDue', { count: dueToday.length }));
    return { body: parts.join(' '), badge, calm: false };
  }

  // Noche: lo que falta hoy y las rachas que se rompen a medianoche (sin comodín que las salve)
  if (!endingToday.length && !dueToday.length) return calm();
  const atRisk = endingToday
    .filter((i) => {
      const record = records.find((r) => r.activity.id === i.activityId);
      const streak = record && computeStreak(evaluatePeriods(record, today));
      return !!streak && streak.current > 0 && streak.wildcards === 0;
    })
    .map((i) => i.name);
  const parts = [];
  if (endingToday.length) parts.push(t('notifications.night.left', { count: endingToday.length }));
  if (dueToday.length) parts.push(t('notifications.night.missionsDue', { count: dueToday.length }));
  if (atRisk.length === 1) parts.push(t('notifications.night.streak', { name: atRisk[0]! }));
  else if (atRisk.length > 1) parts.push(t('notifications.night.streaks', { names: names(atRisk.slice(0, 3)) }));
  return { body: parts.join(' '), badge, calm: false };
}
