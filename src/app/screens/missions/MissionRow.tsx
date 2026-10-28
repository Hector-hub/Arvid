import { Link } from 'react-router';
import type { MissionAnalysis, MissionRecord } from '../../../domain/missions/missions';
import type { Category } from '../../../domain/categories';
import type { LocalDate } from '../../../domain/time/localDate';
import { CategoryIcon } from '../../design/components';
import { missionDueText } from '../../text';
import { t } from '../../../i18n';
import { useGoals } from '../../data';

export const MISSION_STATE_CHIP: Partial<Record<MissionAnalysis['state'], { label: () => string; className: string }>> = {
  expired: { label: () => t('missions.chipExpired'), className: 'chip-warn' },
  completedOnTime: { label: () => t('missions.chipOnTime'), className: 'chip-done' },
  completedLate: { label: () => t('missions.chipLate'), className: 'chip-done' },
  abandoned: { label: () => t('missions.chipAbandoned'), className: 'chip-muted' },
  abandonedExpired: { label: () => t('missions.chipAbandoned'), className: 'chip-muted' },
};

/** «Objetivo: X · hito 2/5» en las misiones que son hitos (spec 12, OB-04). */
export function GoalLabel({ record }: { record: MissionRecord }) {
  const goals = useGoals();
  const goal = record.mission.goalId ? goals?.find((g) => g.id === record.mission.goalId) : undefined;
  if (!goal) return null;
  const index = goal.milestones.findIndex((m) => m.missionId === record.mission.id);
  return (
    <Link to={`/objetivos/${goal.id}`} className="small" style={{ color: 'var(--level)' }}>
      {t('goals.missionLabel', { goal: goal.title, n: index + 1, total: goal.milestones.length })}
    </Link>
  );
}

/** Contenido común de una fila de misión: icono, título, plazo y estado (MHOY-02). */
export function MissionSummary({
  record,
  analysis,
  category,
  today,
  chipAside = false,
  note,
}: {
  record: MissionRecord;
  analysis: MissionAnalysis;
  category?: Category;
  today: LocalDate;
  /** La etiqueta de estado la pone quien llama, en su propia columna (Hoy, D-160). */
  chipAside?: boolean;
  /** Aviso bajo el título (p. ej. una acción que no se pudo hacer). */
  note?: string;
}) {
  const chip = MISSION_STATE_CHIP[analysis.state];
  const open = analysis.state === 'pending' || analysis.state === 'expired';
  return (
    <>
      <CategoryIcon category={category} />
      <div className="grow stack" style={{ gap: 'var(--s1)' }}>
        <Link to={`/actividades/misiones/${record.mission.id}`} className="activity-name">
          {record.mission.title}
        </Link>
        <div className="row" style={{ gap: 'var(--s2)' }}>
          {chip && !chipAside && <span className={`chip ${chip.className}`}>{chip.label()}</span>}
          {open && analysis.state !== 'expired' && (
            <span className="small muted">
              {missionDueText(analysis.deadline, today)}
              {analysis.deadline && record.mission.time ? ` · ${record.mission.time}` : ''}
            </span>
          )}
        </div>
        <GoalLabel record={record} />
        {note && (
          <p className="small" style={{ color: 'var(--warning)' }}>
            {note}
          </p>
        )}
      </div>
    </>
  );
}
