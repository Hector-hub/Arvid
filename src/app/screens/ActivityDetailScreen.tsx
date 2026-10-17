import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { changeStatus, logCompletion, undoCompletion } from '../../data/repository';
import { canLog, detailDays, progressAt, statusAt, versionAt, type DayCell } from '../../domain/activities/rules';
import type { ActivityRecord } from '../../domain/activities/types';
import type { EvaluatedPeriod } from '../../domain/activities/periods';
import { MAX_WILDCARDS, WILDCARD_EVERY, type StreakState } from '../../domain/progress/streaks';
import { daysRemaining, type PeriodKind } from '../../domain/time/period';
import { useAnalysis } from '../analysis';
import { useToday } from '../clock';
import { useCategories, useData, useRecord } from '../data';
import { BackLink, CategoryIcon, Panel, Segments, Sprite, categoryColor } from '../design/components';
import {
  LOG_DENIAL_TEXT,
  daysLeftText,
  difficultyText,
  frequencyText,
  periodUnit,
  progressText,
  shortDay,
} from '../text';

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
  const analysis = useAnalysis()?.byActivity.get(id);

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
          {STATUS_CHIP[status] && (
            <span className={`chip ${STATUS_CHIP[status].className}`}>{STATUS_CHIP[status].label}</span>
          )}
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

          <ul
            className="stack"
            style={{ listStyle: 'none', margin: 0, padding: 0, gap: 'var(--s2)' }}
            aria-label="Registros por día"
          >
            {days.map((day) => {
              const loggable = status === 'active' && canLog(record, day.date, today).ok;
              return (
                <li key={day.date} className="row" style={{ opacity: day.future ? 0.6 : 1 }}>
                  <span className="pixel" style={{ width: 72 }}>
                    {day.date === today ? 'hoy' : shortDay(day.date)}
                  </span>
                  <span className="grow small muted">
                    {day.count > 0
                      ? `${day.count} ${day.count === 1 ? 'registro' : 'registros'}`
                      : day.future
                        ? ''
                        : 'sin registro'}
                  </span>
                  {day.editable && day.count > 0 && (
                    <button
                      type="button"
                      className="btn btn-icon"
                      aria-label={`Quitar registro del ${shortDay(day.date)}`}
                      onClick={() => void remove(day)}
                    >
                      <Sprite name="minus" />
                    </button>
                  )}
                  {day.editable && loggable && (
                    <button
                      type="button"
                      className="btn btn-icon btn-primary"
                      aria-label={`Registrar el ${shortDay(day.date)}`}
                      onClick={() => void add(day)}
                    >
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

      {analysis && version && <StreakPanel streak={analysis.streak} kind={version.period} />}
      {analysis && <RecentPeriods periods={analysis.periods} protectedStarts={analysis.streak.protectedPeriods} />}

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

/** Racha actual, mejor racha y comodines (STR-03). */
function StreakPanel({ streak, kind }: { streak: StreakState; kind: PeriodKind }) {
  return (
    <Panel className="stack">
      <h2>Racha</h2>
      <div className="row">
        <Sprite name="flame" color={streak.current > 0 ? 'var(--warning)' : 'var(--text-muted)'} />
        <p className="pixel grow" style={{ fontSize: '1.25rem' }}>
          {streak.current} {periodUnit(kind, streak.current)}
        </p>
        <p className="small muted">Mejor: {streak.best}</p>
      </div>
      <p className="small">
        Comodines {streak.wildcards} de {MAX_WILDCARDS}
      </p>
      <p className="small muted">
        Ganas un comodín cada {WILDCARD_EVERY} {periodUnit(kind, WILDCARD_EVERY)} cumplidos seguidos. Si fallas uno, se
        usa solo y tu racha se mantiene.
      </p>
    </Panel>
  );
}

const MONTH = new Intl.DateTimeFormat('es', { month: 'short', year: 'numeric' });
const DAY_MONTH = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });
const asDate = (date: string) => new Date(`${date}T12:00:00`);

/** "lun 19", "sem. 12 oct", "oct 2026". */
function periodLabel(p: EvaluatedPeriod): string {
  if (p.period.kind === 'day') return shortDay(p.period.start);
  if (p.period.kind === 'week') return `sem. ${DAY_MONTH.format(asDate(p.period.start)).replace('.', '')}`;
  return MONTH.format(asDate(p.period.start)).replace('.', '');
}

const REASON_TEXT = { grace: 'Gracia', paused: 'Pausa', truncated: 'Cambio de frecuencia', open: '' } as const;

/** Últimos periodos cerrados con su resultado (STR-04). */
function RecentPeriods({ periods, protectedStarts }: { periods: EvaluatedPeriod[]; protectedStarts: string[] }) {
  const recent = periods
    .filter((p) => p.closed)
    .slice(-8)
    .reverse();
  if (recent.length === 0) return null;
  return (
    <Panel className="stack">
      <h2>Últimos periodos</h2>
      <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 'var(--s2)' }}>
        {recent.map((p) => {
          const isProtected = protectedStarts.includes(p.period.start);
          return (
            <li key={p.period.start} className="row small">
              <span className="pixel" style={{ width: 96 }}>
                {periodLabel(p)}
              </span>
              <span className="grow muted">{progressText(Math.min(p.count, p.target), p.target)}</span>
              {p.evaluable && p.fulfilled && <span className="chip chip-done">Cumplido</span>}
              {isProtected && (
                <span className="chip" style={{ background: 'var(--level)', color: 'var(--c-ink)' }}>
                  Comodín usado
                </span>
              )}
              {!p.evaluable && p.reason && <span className="chip chip-muted">{REASON_TEXT[p.reason]}</span>}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
