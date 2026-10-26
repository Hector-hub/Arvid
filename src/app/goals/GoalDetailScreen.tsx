// Detalle de un objetivo (spec 12, OB): progreso, hitos (completados, el activo y los bloqueados), editar y abandonar.
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { abandonGoal } from '../../data/goals';
import { goalStatus, isCompletedState, milestoneAnalysis } from '../../domain/goals/goals';
import { t, useLocale } from '../../i18n';
import { useToday } from '../clock';
import { useCategories, useData, useGoals, useMissions } from '../data';
import { BackLink, CategoryIcon, Panel, Segments, Sprite, categoryColor } from '../design/components';
import { categoryName, dayMonth, difficultyLabel, missionDueText } from '../text';

export function GoalDetailScreen() {
  useLocale();
  const { id } = useParams();
  const ctx = useData();
  const today = useToday();
  const goals = useGoals();
  const missions = useMissions();
  const categories = useCategories();
  const [confirm, setConfirm] = useState(false);
  if (!goals || !missions || !categories) return null;
  const goal = goals.find((g) => g.id === id);
  if (!goal) return <p>{t('goals.notFound')}</p>;
  const byId = new Map(missions.map((m) => [m.mission.id, m]));
  const status = goalStatus(goal, byId, today);
  const category = categories.find((c) => c.id === goal.categoryId);

  return (
    <div className="stack" style={{ gap: 'var(--s4)' }}>
      <BackLink to="/objetivos" label={t('goals.title')} />
      <header className="row">
        <CategoryIcon category={category} />
        <h1 className="grow">{goal.title}</h1>
        {status.state === 'active' && (
          <Link to={`/objetivos/${goal.id}/editar`} className="btn">
            {t('common.edit')}
          </Link>
        )}
      </header>
      {goal.description && <p className="muted">{goal.description}</p>}

      <Panel className="stack">
        <div className="row" style={{ gap: 'var(--s2)' }}>
          <Segments count={status.done} target={status.total} color={categoryColor(category)} />
          {status.state === 'completed' && <span className="chip chip-done">{t('goals.completed')}</span>}
          {status.state === 'abandoned' && <span className="chip chip-muted">{t('goals.abandoned')}</span>}
        </div>
        <p className="pixel">{t('goals.progress', { done: status.done, total: status.total })}</p>
        <p className="small muted">
          {category ? categoryName(category) : ''}
          {goal.targetDate ? ` · ${t('goals.target', { date: dayMonth(goal.targetDate) })}` : ''}
        </p>
        {status.overdue && <p className="small field-error">{t('goals.overdue')}</p>}
      </Panel>

      <Panel className="stack">
        <h2>{t('goals.milestones')}</h2>
        <ol className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 'var(--s2)' }}>
          {goal.milestones.map((m, i) => {
            const analysis = milestoneAnalysis(m, byId, today);
            const done = isCompletedState(analysis?.state);
            const active = i === status.activeIndex;
            const locked = !m.missionId;
            return (
              <li key={m.id} className="row" style={{ opacity: locked ? 0.55 : 1 }}>
                <span className="pixel" style={{ width: '2ch' }}>
                  {i + 1}
                </span>
                <div className="grow stack" style={{ gap: 2 }}>
                  {m.missionId ? (
                    <Link to={`/actividades/misiones/${m.missionId}`} style={{ color: 'var(--text)' }}>
                      {m.title}
                    </Link>
                  ) : (
                    <span>{m.title}</span>
                  )}
                  <span className="small muted">
                    {difficultyLabel(m.difficulty)}
                    {active && analysis ? ` · ${missionDueText(analysis.deadline, today)}` : ''}
                    {active && analysis?.deadline && byId.get(m.missionId!)?.mission.time ? ` · ${byId.get(m.missionId!)!.mission.time}` : ''}
                    {locked && m.deadline ? ` · ${dayMonth(m.deadline)}${m.time ? ` ${m.time}` : ''}` : ''}
                  </span>
                  {active && m.deadlineDropped && !analysis?.deadline && <span className="small field-error">{t('goals.deadlineDropped')}</span>}
                </div>
                {done && <span className="chip chip-done">{t('goals.done')}</span>}
                {active && !done && analysis?.state !== 'abandoned' && <span className="chip chip-warn">{t('goals.activeChip')}</span>}
                {locked && <Sprite name="hourglass" color="var(--text-muted)" />}
              </li>
            );
          })}
        </ol>
      </Panel>

      {status.state === 'active' &&
        (confirm ? (
          <div className="banner stack" role="alertdialog" aria-label={t('goals.abandon')}>
            <p>{t('goals.abandonConfirm')}</p>
            <div className="row">
              <button type="button" className="btn btn-danger grow" onClick={() => void abandonGoal(ctx, goal.id).then(() => setConfirm(false))}>
                {t('goals.abandonYes')}
              </button>
              <button type="button" className="btn grow" onClick={() => setConfirm(false)}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setConfirm(true)}>
            {t('goals.abandon')}
          </button>
        ))}
    </div>
  );
}
