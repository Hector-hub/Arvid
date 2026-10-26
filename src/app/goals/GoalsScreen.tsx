// Pestaña Objetivos (spec 12, OB-01): activos con su progreso y su hito actual; debajo, completados y abandonados.
import { Link } from 'react-router';
import { goalStatus, type Goal, type GoalStatus } from '../../domain/goals/goals';
import type { Category } from '../../domain/categories';
import { t, useLocale } from '../../i18n';
import { useToday } from '../clock';
import { useCategories, useGoals, useMissions } from '../data';
import { CategoryIcon, Panel, Segments, Sprite, categoryColor } from '../design/components';
import { dayMonth } from '../text';

export function GoalsScreen() {
  useLocale();
  const today = useToday();
  const goals = useGoals();
  const missions = useMissions();
  const categories = useCategories();
  if (!goals || !missions || !categories) return null;
  const byId = new Map(missions.map((m) => [m.mission.id, m]));
  const rows = goals
    .map((goal) => ({ goal, status: goalStatus(goal, byId, today) }))
    .sort((a, b) => b.goal.createdAt.localeCompare(a.goal.createdAt));
  const active = rows.filter((r) => r.status.state === 'active');
  const closed = rows.filter((r) => r.status.state !== 'active');

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <header className="row">
        <h1 className="grow">{t('goals.title')}</h1>
        <Link to="/objetivos/nuevo" className="btn btn-primary btn-icon" aria-label={t('goals.new')} title={t('goals.new')}>
          <Sprite name="plus" />
        </Link>
      </header>

      {active.length === 0 ? (
        <Panel className="stack">
          <h2>{t('goals.emptyTitle')}</h2>
          <p className="muted">{t('goals.emptyText')}</p>
          <Link to="/objetivos/nuevo" className="btn btn-primary">
            {t('goals.new')}
          </Link>
        </Panel>
      ) : (
        <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {active.map(({ goal, status }) => (
            <GoalRow key={goal.id} goal={goal} status={status} category={categories.find((c) => c.id === goal.categoryId)} />
          ))}
        </ul>
      )}

      {closed.length > 0 && (
        <section className="stack">
          <h2>{t('goals.history')}</h2>
          <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {closed.map(({ goal, status }) => (
              <GoalRow key={goal.id} goal={goal} status={status} category={categories.find((c) => c.id === goal.categoryId)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function GoalRow({
  goal,
  status,
  category,
}: {
  goal: Goal;
  status: GoalStatus;
  category?: Category;
}) {
  const current = status.activeIndex !== undefined ? goal.milestones[status.activeIndex] : undefined;
  return (
    <li className="panel row" style={{ padding: 'var(--s3)' }}>
      <CategoryIcon category={category} />
      <div className="grow stack" style={{ gap: 'var(--s1)' }}>
        <Link to={`/objetivos/${goal.id}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>
          {goal.title}
        </Link>
        <div className="row" style={{ gap: 'var(--s2)' }}>
          <Segments count={status.done} target={status.total} color={categoryColor(category)} />
          {status.state === 'completed' && <span className="chip chip-done">{t('goals.completed')}</span>}
          {status.state === 'abandoned' && <span className="chip chip-muted">{t('goals.abandoned')}</span>}
        </div>
        <p className="small muted">
          {t('goals.progress', { done: status.done, total: status.total })}
          {current ? ` · ${t('goals.current', { title: current.title })}` : ''}
          {goal.targetDate ? ` · ${t('goals.target', { date: dayMonth(goal.targetDate) })}` : ''}
        </p>
        {status.overdue && <p className="small field-error">{t('goals.overdue')}</p>}
      </div>
    </li>
  );
}
