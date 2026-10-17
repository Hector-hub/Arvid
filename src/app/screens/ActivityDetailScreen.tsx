import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { changeStatus, logCompletion, undoCompletion } from '../../data/repository';
import { canLog, detailDays, progressAt, statusAt, versionAt, type DayCell } from '../../domain/activities/rules';
import type { ActivityRecord } from '../../domain/activities/types';
import { daysRemaining } from '../../domain/time/period';
import { useToday } from '../clock';
import { useCategories, useData, useRecord } from '../data';
import { BackLink, CategoryIcon, Panel, Segments, Sprite, categoryColor } from '../design/components';
import { LOG_DENIAL_TEXT, daysLeftText, difficultyText, frequencyText, progressText, shortDay } from '../text';

const STATUS_CHIP = {
  active: null,
  paused: { label: 'Pausada', className: 'chip-muted' },
  archived: { label: 'Archivada', className: 'chip-muted' },
} as const;

/** Detalle de actividad con la tira de días editable (DET-01 a DET-03). */
export function ActivityDetailScreen() {
  const { id } = useParams();
  const record = useRecord(id);
  if (record === null) return null;
  if (!record) return <p>Actividad no encontrada.</p>;
  return <Detail record={record} />;
}

function Detail({ record }: { record: ActivityRecord }) {
  const ctx = useData();
  const today = useToday();
  const categories = useCategories();
  const [message, setMessage] = useState<string>();

  const version = versionAt(record.versions, today);
  const status = statusAt(record.events, today) ?? 'active';
  const progress = progressAt(record, today);
  const days = useMemo(() => detailDays(record, today), [record, today]);
  const category = categories?.find((c) => c.id === version?.categoryId);
  const id = record.activity.id;

  async function add(day: DayCell) {
    const result = await logCompletion(ctx, id, day.date);
    setMessage(result.ok ? undefined : LOG_DENIAL_TEXT[result.reason]);
  }

  async function remove(day: DayCell) {
    await undoCompletion(ctx, id, day.date);
    setMessage(undefined);
  }

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <BackLink to="/actividades" label="Actividades" />
      <header className="stack" style={{ gap: 'var(--s2)' }}>
        <div className="row">
          <CategoryIcon category={category} scale={3} />
          <h1 className="grow">{record.activity.name}</h1>
          {STATUS_CHIP[status] && <span className={`chip ${STATUS_CHIP[status].className}`}>{STATUS_CHIP[status].label}</span>}
        </div>
        {version && (
          <p className="muted">
            {category?.name} · {frequencyText(version.target, version.period)} · {difficultyText(version.difficulty)}
          </p>
        )}
      </header>

      {progress && (
        <Panel className="stack">
          <h2>{version?.period === 'day' ? 'Hoy' : version?.period === 'week' ? 'Esta semana' : 'Este mes'}</h2>
          <div className="row">
            <Segments count={progress.count} target={progress.target} color={categoryColor(category)} />
            {progress.done && <span className="chip chip-done">Completada</span>}
          </div>
          <p className="small muted">
            {progressText(Math.min(progress.count, progress.target), progress.target)}
            {version?.period !== 'day' && ` · ${daysLeftText(daysRemaining(progress.period, today))}`}
          </p>

          <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 'var(--s2)' }} aria-label="Registros por día">
            {days.map((day) => {
              const loggable = status === 'active' && canLog(record, day.date, today).ok;
              return (
                <li key={day.date} className="row" style={{ opacity: day.future ? 0.6 : 1 }}>
                  <span className="pixel" style={{ width: 72 }}>
                    {day.date === today ? 'hoy' : shortDay(day.date)}
                  </span>
                  <span className="grow small muted">
                    {day.count > 0 ? `${day.count} ${day.count === 1 ? 'registro' : 'registros'}` : day.future ? '' : 'sin registro'}
                  </span>
                  {day.editable && day.count > 0 && (
                    <button type="button" className="btn btn-icon" aria-label={`Quitar registro del ${shortDay(day.date)}`} onClick={() => void remove(day)}>
                      <Sprite name="minus" />
                    </button>
                  )}
                  {day.editable && loggable && (
                    <button type="button" className="btn btn-icon btn-primary" aria-label={`Registrar el ${shortDay(day.date)}`} onClick={() => void add(day)}>
                      <Sprite name="plus" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {status !== 'active' && <p className="small muted">Reanuda la actividad para registrar.</p>}
          {message && (
            <p role="alert" className="field-error">
              {message}
            </p>
          )}
        </Panel>
      )}

      <div className="stack">
        <Link to={`/actividades/${id}/editar`} className="btn">
          Editar
        </Link>
        {status === 'active' && (
          <button type="button" className="btn" onClick={() => void changeStatus(ctx, id, 'paused')}>
            Pausar
          </button>
        )}
        {status === 'paused' && (
          <button type="button" className="btn" onClick={() => void changeStatus(ctx, id, 'resumed')}>
            Reanudar
          </button>
        )}
        {status !== 'archived' ? (
          <button type="button" className="btn btn-danger" onClick={() => void changeStatus(ctx, id, 'archived')}>
            Archivar
          </button>
        ) : (
          <button type="button" className="btn" onClick={() => void changeStatus(ctx, id, 'unarchived')}>
            Restaurar
          </button>
        )}
      </div>
    </div>
  );
}
