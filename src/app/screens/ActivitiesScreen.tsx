import { useMemo } from 'react';
import { Link } from 'react-router';
import { moveActivity } from '../../data/repository';
import { statusAt, versionAt } from '../../domain/activities/rules';
import type { ActivityRecord, ActivityStatus } from '../../domain/activities/types';
import type { Category } from '../../domain/categories';
import { useToday } from '../clock';
import { useCategories, useData, useRecords } from '../data';
import { CategoryIcon, Panel, Sprite } from '../design/components';
import { frequencyText } from '../text';
import { ActivitiesTabs } from './ActivitiesTabs';

const GROUPS: { status: ActivityStatus; title: string }[] = [
  { status: 'active', title: 'Activas' },
  { status: 'paused', title: 'Pausadas' },
  { status: 'archived', title: 'Archivadas' },
];

/** Lista de actividades por estado (ACT-07) con reordenación accesible (ACT-08). */
export function ActivitiesScreen() {
  const today = useToday();
  const records = useRecords();
  const categories = useCategories();
  const categoryById = useMemo(() => new Map(categories?.map((c) => [c.id, c])), [categories]);

  if (!records) return null;

  const grouped = GROUPS.map((g) => ({
    ...g,
    records: records.filter((r) => statusAt(r.events, today) === g.status),
  }));

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <header className="row">
        <h1 className="grow">Actividades</h1>
        <Link to="/actividades/nueva" className="btn btn-primary">
          <Sprite name="plus" />
          Nueva actividad
        </Link>
      </header>
      <ActivitiesTabs />

      {records.length === 0 && (
        <Panel className="stack">
          <h2>Aún no tienes actividades</h2>
          <p className="muted">Crea una con la frecuencia que te parezca sostenible.</p>
        </Panel>
      )}

      {grouped
        .filter((g) => g.records.length > 0)
        .map((g) => (
          <section key={g.status} className="stack" aria-labelledby={`grp-${g.status}`}>
            <h2 id={`grp-${g.status}`}>{g.title}</h2>
            <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {g.records.map((r, i) => (
                <ActivityItem
                  key={r.activity.id}
                  record={r}
                  category={categoryById.get(versionAt(r.versions, today)?.categoryId ?? '')}
                  reorder={g.status === 'active' ? { first: i === 0, last: i === g.records.length - 1 } : undefined}
                />
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

function ActivityItem({
  record,
  category,
  reorder,
}: {
  record: ActivityRecord;
  category?: Category;
  reorder?: { first: boolean; last: boolean };
}) {
  const ctx = useData();
  const today = useToday();
  const version = versionAt(record.versions, today);
  const name = record.activity.name;

  return (
    <li className="panel row" style={{ padding: 'var(--s3)' }}>
      <CategoryIcon category={category} />
      <Link
        to={`/actividades/${record.activity.id}`}
        className="grow"
        style={{ color: 'var(--text)', textDecoration: 'none' }}
      >
        <span>{name}</span>
        {version && (
          <span className="small muted" style={{ display: 'block' }}>
            {frequencyText(version.target, version.period)}
          </span>
        )}
      </Link>
      {reorder && (
        <>
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            aria-label={`Subir ${name}`}
            disabled={reorder.first}
            onClick={() => void moveActivity(ctx, record.activity.id, -1)}
          >
            <Sprite name="arrow-up" />
          </button>
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            aria-label={`Bajar ${name}`}
            disabled={reorder.last}
            onClick={() => void moveActivity(ctx, record.activity.id, 1)}
          >
            <Sprite name="arrow-down" />
          </button>
        </>
      )}
    </li>
  );
}
