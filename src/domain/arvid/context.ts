// Contexto del usuario para ARVID con IA (spec 06, IA-04): perfil, progreso, atributos, actividades e historial
// reciente y misiones. Sin identificadores internos ni horas exactas de los registros. Puro: lo calcula el dispositivo.
import { trend, type Profile } from '../attributes/attributes';
import { progressAt, statusAt, versionAt } from '../activities/rules';
import type { ActivityRecord } from '../activities/types';
import type { MissionRecord } from '../missions/missions';
import type { Analysis } from '../progress/progress';
import { addDays, compareDates, type LocalDate } from '../time/localDate';
import { daysRemaining } from '../time/period';
import type { Gender } from './arvid';

const RECENT_DAYS = 30;

export interface AiContextInput {
  user: { alias?: string; gender?: Gender; locale: 'es' | 'en' };
  today: LocalDate;
  /** Hora local "HH:MM" (para saludar según el momento del día). */
  time: string;
  analysis: Analysis;
  /** Título del nivel ya traducido. */
  levelTitle: string;
  records: readonly ActivityRecord[];
  missions: readonly MissionRecord[];
  profile7: Profile;
  profile30: Profile;
  /** Categorías activas con su nombre ya traducido. */
  categories: readonly { id: string; name: string }[];
  /** Nombre de cualquier categoría (también las desactivadas). */
  categoryName: (id: string) => string;
}

export function buildAiContext(input: AiContextInput): Record<string, unknown> {
  const { analysis, today, profile7, profile30 } = input;
  const since = addDays(today, -RECENT_DAYS);
  const p = analysis.progress;

  const activities = input.records.flatMap((record) => {
    const status = statusAt(record.events, today);
    const version = versionAt(record.versions, today);
    if (!status || status === 'archived' || !version) return [];
    const a = analysis.byActivity.get(record.activity.id);
    const progress = progressAt(record, today);
    const recent = (a?.periods ?? []).filter((x) => x.closed && x.evaluable && compareDates(x.period.end, since) >= 0);
    return [
      {
        name: record.activity.name,
        category: input.categoryName(version.categoryId),
        frequency: `${version.target} per ${version.period}`,
        difficulty: version.difficulty,
        status,
        thisPeriod: progress && {
          done: progress.count,
          target: progress.target,
          complete: progress.done,
          daysLeft: daysRemaining(progress.period, today),
        },
        streak: a?.streak.current ?? 0,
        bestStreak: a?.streak.best ?? 0,
        wildcards: a?.streak.wildcards ?? 0,
        last30Days: { periodsFulfilled: recent.filter((x) => x.fulfilled).length, periodsEvaluated: recent.length },
      },
    ];
  });

  const missions = input.missions.flatMap((m) => {
    const a = analysis.byMission.get(m.mission.id);
    if (!a) return [];
    const open = a.state === 'pending' || a.state === 'expired';
    const recentlyClosed = [a.completedOn, a.abandonedOn].some((d) => d && compareDates(d, since) >= 0);
    if (!open && !recentlyClosed) return [];
    return [
      {
        title: m.mission.title,
        category: input.categoryName(m.mission.categoryId),
        difficulty: m.mission.difficulty,
        state: a.state,
        ...(a.deadline && { deadline: a.deadline }),
        ...(a.completedOn && { completedOn: a.completedOn }),
      },
    ];
  });

  const attributes = input.categories.map((c) => {
    const now30 = profile30.current.attributes.get(c.id)?.value;
    return {
      category: c.name,
      last7Days: profile7.current.attributes.get(c.id)?.value ?? null,
      last30Days: now30 ?? null,
      trend30: trend(now30, profile30.previous.attributes.get(c.id)?.value)?.direction ?? null,
    };
  });

  return {
    user: { alias: input.user.alias ?? null, gender: input.user.gender ?? 'x', language: input.user.locale },
    now: { date: today, time: input.time },
    level: { level: p.level, title: input.levelTitle, xp: p.xp, xpForNextLevel: p.nextLevelXp },
    discipline: {
      last7Days: profile7.current.discipline.value ?? null,
      last30Days: profile30.current.discipline.value ?? null,
      trend30: trend(profile30.current.discipline.value, profile30.previous.discipline.value)?.direction ?? null,
    },
    attributes,
    activities,
    missions,
  };
}
