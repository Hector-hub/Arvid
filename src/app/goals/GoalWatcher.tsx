// Celebración al cumplir un objetivo (spec 12, OB-08): partículas grandes, salto de DARIS y una frase del compañero,
// una sola vez. Los cumplidos hace más de un día (p. ej. al importar un backup) se marcan sin celebrar.
import { useEffect } from 'react';
import { markGoalCelebrated } from '../../data/goals';
import { goalStatus } from '../../domain/goals/goals';
import { addDays, compareDates } from '../../domain/time/localDate';
import { t } from '../../i18n';
import { speak } from '../arvid/voice';
import { useToday } from '../clock';
import { useData, useGoals, useMissions, useSettings } from '../data';
import { celebrate, cheer } from '../scene/engine';
import { playSfx } from '../sound/sfx';

export function GoalWatcher() {
  const { db } = useData();
  const today = useToday();
  const goals = useGoals();
  const missions = useMissions();
  const talks = useSettings()?.arvidTalks !== false;

  useEffect(() => {
    if (!goals || !missions) return;
    const byId = new Map(missions.map((m) => [m.mission.id, m]));
    for (const goal of goals) {
      if (goal.celebrated) continue;
      const status = goalStatus(goal, byId, today);
      if (status.state !== 'completed') continue;
      void markGoalCelebrated(db, goal.id);
      if (compareDates(status.completedOn!, addDays(today, -1)) < 0) continue;
      celebrate('big');
      playSfx('mission');
      cheer();
      if (talks) void speak(t('goals.celebrate', { title: goal.title }));
    }
  }, [db, goals, missions, today, talks]);

  return null;
}
