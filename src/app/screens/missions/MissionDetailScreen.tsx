import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  abandonMission,
  clearMissionDeadline,
  completeMission,
  deleteMission,
  rescheduleMission,
  uncompleteMission,
} from '../../../data/missions';
import { DIFFICULTY_POINTS } from '../../../domain/config';
import { missionActions, type MissionAnalysis, type MissionRecord } from '../../../domain/missions/missions';
import { addDays, compareDates, isLocalDate, type LocalDate } from '../../../domain/time/localDate';
import { useAnalysis } from '../../analysis';
import { useToday } from '../../clock';
import { useCategories, useData, useMissions } from '../../data';
import { BackLink, CategoryIcon, Panel } from '../../design/components';
import { DIFFICULTY_LABEL, dayMonth, missionDueText } from '../../text';
import { MISSION_STATE_CHIP } from './MissionRow';

/** Detalle de misión: historial, acciones y confirmaciones (MUI-03 a MUI-05). */
export function MissionDetailScreen() {
  const { id } = useParams();
  const missions = useMissions();
  const analysis = useAnalysis();
  if (!missions || !analysis) return null;
  const record = missions.find((m) => m.mission.id === id);
  const result = record && analysis.byMission.get(record.mission.id);
  if (!record || !result) return <p>Misión no encontrada.</p>;
  return <Detail record={record} analysis={result} />;
}

/** Historial legible: eventos y el vencimiento derivado (MUI-03). */
function history(record: MissionRecord, analysis: MissionAnalysis): { date: LocalDate; text: string }[] {
  const lines: { date: LocalDate; order: number; text: string }[] = [
    { date: record.mission.createdOn, order: 0, text: `Creada el ${dayMonth(record.mission.createdOn)}` },
  ];
  let hadDeadline = false;
  const sorted = [...record.events].sort((a, b) => a.at.localeCompare(b.at));
  sorted.forEach((e, i) => {
    const order = i + 1;
    switch (e.type) {
      case 'deadlineSet':
        lines.push({
          date: e.date,
          order,
          text: hadDeadline ? `Reprogramada al ${dayMonth(e.deadline!)}` : `Fecha límite: ${dayMonth(e.deadline!)}`,
        });
        hadDeadline = true;
        break;
      case 'deadlineCleared':
        lines.push({ date: e.date, order, text: 'Fecha límite quitada' });
        break;
      case 'completed':
        lines.push({ date: e.date, order, text: `Completada el ${dayMonth(e.date)}` });
        break;
      case 'uncompleted':
        lines.push({ date: e.date, order, text: `Desmarcada el ${dayMonth(e.date)}` });
        break;
      case 'abandoned':
        lines.push({ date: e.date, order, text: `Abandonada el ${dayMonth(e.date)}` });
        break;
    }
  });
  if (analysis.expiredOn)
    lines.push({ date: addDays(analysis.expiredOn, 1), order: -1, text: `Venció el ${dayMonth(analysis.expiredOn)}` });
  return lines.sort((a, b) => compareDates(a.date, b.date) || a.order - b.order);
}

type Confirm = 'abandon' | 'delete' | undefined;

function abandonText(analysis: MissionAnalysis): string {
  if (analysis.state === 'expired') return 'El fallo se mantiene. Abandonarla es definitivo.';
  if (analysis.deadline)
    return 'Abandonarla antes de la fecha cuesta la mitad de su valor en tu Disciplina. Es definitivo.';
  return 'No afecta a tus puntos. Abandonarla es definitivo.';
}

function Detail({ record, analysis }: { record: MissionRecord; analysis: MissionAnalysis }) {
  const ctx = useData();
  const navigate = useNavigate();
  const today = useToday();
  const categories = useCategories();
  const [confirm, setConfirm] = useState<Confirm>();
  const [newDeadline, setNewDeadline] = useState('');
  const [message, setMessage] = useState<string>();
  const id = record.mission.id;
  const actions = missionActions(record, analysis, today);
  const category = categories?.find((c) => c.id === record.mission.categoryId);
  const chip = MISSION_STATE_CHIP[analysis.state];
  const value = DIFFICULTY_POINTS[record.mission.difficulty];

  async function run(action: () => Promise<boolean>, done: string) {
    setMessage((await action()) ? done : 'No se pudo completar la acción.');
  }

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <BackLink to="/actividades/misiones" label="Misiones" />
      <header className="stack" style={{ gap: 'var(--s2)' }}>
        <div className="row">
          <CategoryIcon category={category} scale={3} />
          <h1 className="grow">{record.mission.title}</h1>
          {chip && <span className={`chip ${chip.className}`}>{chip.label}</span>}
        </div>
        <p className="muted">
          {category?.name} · {DIFFICULTY_LABEL[record.mission.difficulty]} · {value} XP
          {(analysis.state === 'pending' || analysis.state === 'expired') &&
            ` · ${missionDueText(analysis.deadline, today)}`}
        </p>
      </header>

      {analysis.state === 'expired' && analysis.expiredOn && (
        <div className="banner">
          <p className="small">
            Venció el {dayMonth(analysis.expiredOn)}. Complétala cuando puedas para recuperar lo perdido.
          </p>
        </div>
      )}

      {message && (
        <p role="status" className="small" style={{ color: 'var(--success)' }}>
          {message}
        </p>
      )}

      <div className="stack">
        {actions.complete && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void run(() => completeMission(ctx, id, today), 'Misión completada.')}
          >
            Completar
          </button>
        )}
        {actions.completeYesterday && (
          <button
            type="button"
            className="btn"
            onClick={() => void run(() => completeMission(ctx, id, addDays(today, -1)), 'Misión completada ayer.')}
          >
            La hice ayer
          </button>
        )}
        {actions.uncomplete && (
          <button
            type="button"
            className="btn"
            onClick={() => void run(() => uncompleteMission(ctx, id), 'Misión desmarcada.')}
          >
            Desmarcar
          </button>
        )}
      </div>

      {actions.reschedule && (
        <Panel className="stack">
          <h2>{analysis.deadline ? 'Reprogramar' : 'Poner fecha límite'}</h2>
          <div className="field">
            <label htmlFor="new-deadline">Nueva fecha límite</label>
            <input
              id="new-deadline"
              type="date"
              min={today}
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              style={{ maxWidth: 220 }}
            />
          </div>
          {analysis.state === 'expired' && (
            <p className="small muted">La nueva fecha es orientativa: el fallo se anula al completarla.</p>
          )}
          <button
            type="button"
            className="btn"
            disabled={!isLocalDate(newDeadline) || newDeadline < today}
            onClick={() =>
              void run(() => rescheduleMission(ctx, id, newDeadline as LocalDate), 'Fecha límite actualizada.').then(
                () => setNewDeadline(''),
              )
            }
          >
            Guardar fecha
          </button>
          {actions.clearDeadline && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void run(() => clearMissionDeadline(ctx, id), 'Fecha límite quitada.')}
            >
              Quitar fecha límite
            </button>
          )}
        </Panel>
      )}

      <Panel className="stack" labelledBy="history-title">
        <h2 id="history-title">Historial</h2>
        <ul className="stack small" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 'var(--s1)' }}>
          {history(record, analysis).map((line, i) => (
            <li key={i}>{line.text}</li>
          ))}
        </ul>
      </Panel>

      <div className="stack">
        <Link to={`/actividades/misiones/${id}/editar`} className="btn">
          Editar
        </Link>
        {actions.abandon && confirm !== 'abandon' && (
          <button type="button" className="btn btn-danger" onClick={() => setConfirm('abandon')}>
            Abandonar
          </button>
        )}
        {actions.delete && confirm !== 'delete' && (
          <button type="button" className="btn btn-ghost" onClick={() => setConfirm('delete')}>
            Eliminar (creada por error)
          </button>
        )}
        {confirm && (
          <div
            className="banner stack"
            role="alertdialog"
            aria-labelledby="confirm-title"
            style={{ alignItems: 'stretch' }}
          >
            <h3 id="confirm-title">{confirm === 'abandon' ? '¿Abandonar la misión?' : '¿Eliminar la misión?'}</h3>
            <p className="small">
              {confirm === 'abandon'
                ? abandonText(analysis)
                : 'Se borrará sin dejar rastro. Solo es posible el día en que la creaste.'}
            </p>
            <div className="row">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirm(undefined)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger grow"
                onClick={() => {
                  setConfirm(undefined);
                  if (confirm === 'abandon') void run(() => abandonMission(ctx, id), 'Misión abandonada.');
                  else
                    void deleteMission(ctx, id).then(
                      (ok) => ok && navigate('/actividades/misiones', { replace: true }),
                    );
                }}
              >
                {confirm === 'abandon' ? 'Abandonar' : 'Eliminar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
