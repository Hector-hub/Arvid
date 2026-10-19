// Un año de datos realistas para las pruebas de rendimiento (spec 07, RE-02): 12 actividades (8 diarias, 3 semanales
// y 1 mensual) registradas durante 365 días y 60 misiones con fecha límite.
import type { ActivityRecord, Completion } from '../activities/types';
import type { MissionEvent, MissionRecord } from '../missions/missions';
import { addDays, type LocalDate } from '../time/localDate';
import type { PeriodKind } from '../time/period';

const ACTIVITIES: { name: string; period: PeriodKind; target: number }[] = [
  ...['Caminar', 'Leer', 'Meditar', 'Agua', 'Estirar', 'Diario', 'Idiomas', 'Dormir pronto'].map((name) => ({
    name,
    period: 'day' as const,
    target: 1,
  })),
  { name: 'Gym', period: 'week', target: 3 },
  { name: 'Llamar a la familia', period: 'week', target: 1 },
  { name: 'Cocinar', period: 'week', target: 2 },
  { name: 'Revisar finanzas', period: 'month', target: 1 },
];

export const YEAR_DAYS = 365;

/** Datos de un año que termina `today`, repartidos entre `categoryIds`. Deterministas. */
export function yearData(
  today: LocalDate,
  categoryIds: readonly string[],
): { records: ActivityRecord[]; missions: MissionRecord[] } {
  const start = addDays(today, -(YEAR_DAYS - 1));
  const records = ACTIVITIES.map((a, i): ActivityRecord => {
    const id = `year-a${i}`;
    const completions: Completion[] = [];
    for (let day = 0; day < YEAR_DAYS; day++) {
      const date = addDays(start, day);
      // Diarias: 4 de cada 5 días; semanales y mensual: los primeros días de cada semana o mes, hasta su objetivo
      const logged =
        a.period === 'day'
          ? (day + i) % 5 !== 0
          : a.period === 'week'
            ? day % 7 < a.target
            : Number(date.slice(8)) === 3;
      if (logged)
        completions.push({ id: `${id}-c${day}`, activityId: id, date, at: `${date}T19:00:00.000Z`, tzOffsetMin: 120 });
    }
    return {
      activity: { id, name: a.name, order: i },
      versions: [
        {
          id: `${id}-v0`,
          activityId: id,
          effectiveFrom: start,
          period: a.period,
          target: a.target,
          difficulty: (['easy', 'medium', 'hard'] as const)[i % 3]!,
          categoryId: categoryIds[i % categoryIds.length]!,
        },
      ],
      events: [{ id: `${id}-e0`, activityId: id, date: start, type: 'created', at: `${start}T09:00:00.000Z` }],
      completions,
    };
  });

  const missions = Array.from({ length: 60 }, (_, i): MissionRecord => {
    const id = `year-m${i}`;
    const created = addDays(start, i * 6);
    const deadline = addDays(created, 10);
    const events: MissionEvent[] = [
      { id: `${id}-e0`, missionId: id, type: 'deadlineSet', date: created, deadline, at: `${created}T08:00:00.000Z` },
    ];
    // 4 de cada 5 se completan a tiempo; el resto vence
    if (i % 5 !== 4) {
      const done = addDays(created, 5);
      events.push({ id: `${id}-e1`, missionId: id, type: 'completed', date: done, at: `${done}T18:00:00.000Z` });
    }
    return {
      mission: {
        id,
        title: `Misión ${i + 1}`,
        categoryId: categoryIds[i % categoryIds.length]!,
        difficulty: 'medium',
        createdAt: `${created}T08:00:00.000Z`,
        createdOn: created,
      },
      events,
    };
  });
  return { records, missions };
}
