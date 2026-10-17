import { useMemo } from 'react';
import { Link } from 'react-router';
import type { MissionAnalysis } from '../../../domain/missions/missions';
import { compareOpenMissions, type MissionItem } from '../../../domain/missions/today';
import { addDays, compareDates, type LocalDate } from '../../../domain/time/localDate';
import { useAnalysis } from '../../analysis';
import { useToday } from '../../clock';
import { useCategories, useMissions } from '../../data';
import { Panel, Sprite } from '../../design/components';
import { ActivitiesTabs } from '../ActivitiesTabs';
import { MissionSummary } from './MissionRow';

const RECENT_DAYS = 30;

/** Actividades → Misiones (MUI-01). */
export function MissionsScreen() {
  const today = useToday();
  const missions = useMissions();
  const analysis = useAnalysis();
  const categories = useCategories();
  const categoryById = useMemo(() => new Map(categories?.map((c) => [c.id, c])), [categories]);

  if (!missions || !analysis) return null;
  const items: MissionItem[] = missions.flatMap((record) => {
    const a = analysis.byMission.get(record.mission.id);
    return a ? [{ record, analysis: a }] : [];
  });
  const since = addDays(today, -RECENT_DAYS);
  const recent = (date: LocalDate | undefined) => !!date && compareDates(date, since) >= 0;
  const is =
    (...states: MissionAnalysis['state'][]) =>
    (i: MissionItem) =>
      states.includes(i.analysis.state);

  const groups = [
    {
      title: 'Pendientes',
      items: items.filter(is('pending', 'expired')).sort((a, b) => compareOpenMissions(a, b, today)),
    },
    {
      title: 'Completadas',
      items: items
        .filter((i) => is('completedOnTime', 'completedLate')(i) && recent(i.analysis.completedOn))
        .sort((a, b) => (b.analysis.completedOn ?? '').localeCompare(a.analysis.completedOn ?? '')),
    },
    {
      title: 'Abandonadas',
      items: items.filter((i) => is('abandoned', 'abandonedExpired')(i) && recent(i.analysis.abandonedOn)),
    },
  ];

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <header className="row">
        <h1 className="grow">Actividades</h1>
        <Link to="/actividades/misiones/nueva" className="btn btn-primary">
          <Sprite name="plus" />
          Nueva misión
        </Link>
      </header>
      <ActivitiesTabs />

      {items.length === 0 && (
        <Panel className="stack">
          <h2>Crea una misión</h2>
          <p className="muted">Algo puntual que quieras cumplir, con fecha límite o sin ella.</p>
        </Panel>
      )}

      {groups
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <section key={g.title} className="stack" aria-labelledby={`mgrp-${g.title}`}>
            <h2 id={`mgrp-${g.title}`}>{g.title}</h2>
            <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {g.items.map((i) => (
                <li key={i.record.mission.id} className="panel row" style={{ padding: 'var(--s3)' }}>
                  <MissionSummary
                    record={i.record}
                    analysis={i.analysis}
                    category={categoryById.get(i.record.mission.categoryId)}
                    today={today}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
