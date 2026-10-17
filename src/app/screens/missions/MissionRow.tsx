import { Link } from 'react-router';
import type { MissionAnalysis, MissionRecord } from '../../../domain/missions/missions';
import type { Category } from '../../../domain/categories';
import type { LocalDate } from '../../../domain/time/localDate';
import { CategoryIcon } from '../../design/components';
import { missionDueText } from '../../text';

export const MISSION_STATE_CHIP: Partial<Record<MissionAnalysis['state'], { label: string; className: string }>> = {
  expired: { label: 'Vencida', className: 'chip-warn' },
  completedOnTime: { label: 'Cumplida', className: 'chip-done' },
  completedLate: { label: 'Recuperada', className: 'chip-done' },
  abandoned: { label: 'Abandonada', className: 'chip-muted' },
  abandonedExpired: { label: 'Abandonada', className: 'chip-muted' },
};

/** Contenido común de una fila de misión: icono, título, plazo y estado (MHOY-02). */
export function MissionSummary({
  record,
  analysis,
  category,
  today,
}: {
  record: MissionRecord;
  analysis: MissionAnalysis;
  category?: Category;
  today: LocalDate;
}) {
  const chip = MISSION_STATE_CHIP[analysis.state];
  const open = analysis.state === 'pending' || analysis.state === 'expired';
  return (
    <>
      <CategoryIcon category={category} />
      <div className="grow stack" style={{ gap: 'var(--s1)' }}>
        <Link
          to={`/actividades/misiones/${record.mission.id}`}
          style={{ color: 'var(--text)', textDecoration: 'none' }}
        >
          {record.mission.title}
        </Link>
        <div className="row" style={{ gap: 'var(--s2)' }}>
          {chip && <span className={`chip ${chip.className}`}>{chip.label}</span>}
          {open && analysis.state !== 'expired' && (
            <span className="small muted">{missionDueText(analysis.deadline, today)}</span>
          )}
        </div>
      </div>
    </>
  );
}
