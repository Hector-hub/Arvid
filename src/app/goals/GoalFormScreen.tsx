// Crear y editar objetivos (spec 12, OB-02, OB-07): datos del objetivo y sus hitos en orden. Al editar, los hitos ya
// activados se muestran fijos (se editan como misiones) y los pendientes se pueden cambiar, añadir, quitar y mover.
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { createGoal, updateGoal } from '../../data/goals';
import { DIFFICULTY_POINTS, type Difficulty } from '../../domain/config';
import {
  GOAL_DESCRIPTION_MAX,
  GOAL_TITLE_MAX,
  MILESTONES_MAX,
  type Goal,
  type GoalInputErrors,
  type MilestoneInput,
} from '../../domain/goals/goals';
import { isLocalDate, type LocalDate } from '../../domain/time/localDate';
import { t, useLocale } from '../../i18n';
import { useToday } from '../clock';
import { useCategories, useData, useGoals } from '../data';
import { CategoryIcon, Sprite } from '../design/components';
import { celebrate } from '../scene/engine';
import { categoryName, difficultyLabel, errorText } from '../text';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

type Row = { id?: string; title: string; difficulty: Difficulty; deadline: string; time: string; fixed: boolean };

export function GoalFormScreen() {
  useLocale();
  const { id } = useParams();
  const goals = useGoals();
  const categories = useCategories();
  if (!goals || !categories) return null;
  const goal = id ? goals.find((g) => g.id === id) : undefined;
  if (id && !goal) return <p>{t('goals.notFound')}</p>;
  const defaultCategoryId = goal?.categoryId ?? categories.find((c) => c.active && !c.archivedAt)?.id ?? '';
  return <GoalForm key={id ?? 'new'} goal={goal} defaultCategoryId={defaultCategoryId} />;
}

const date = (v: string) => (v && isLocalDate(v) ? (v as LocalDate) : undefined);

function GoalForm({ goal, defaultCategoryId }: { goal?: Goal; defaultCategoryId: string }) {
  const ctx = useData();
  const navigate = useNavigate();
  const today = useToday();
  const categories = useCategories() ?? [];
  const [title, setTitle] = useState(goal?.title ?? '');
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [targetDate, setTargetDate] = useState<string>(goal?.targetDate ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [rows, setRows] = useState<Row[]>(
    goal?.milestones.map((m) => ({ id: m.id, title: m.title, difficulty: m.difficulty, deadline: m.deadline ?? '', time: m.time ?? '', fixed: !!m.missionId })) ?? [
      { title: '', difficulty: 'medium', deadline: '', time: '', fixed: false },
    ],
  );
  const [errors, setErrors] = useState<GoalInputErrors>({});
  const [saving, setSaving] = useState(false);
  const options = categories.filter((c) => (c.active && !c.archivedAt) || c.id === goal?.categoryId);
  const firstEditable = rows.findIndex((r) => !r.fixed);

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, delta: -1 | 1) =>
    setRows((rs) => {
      const j = i + delta;
      if (j < 0 || j >= rs.length || rs[j]!.fixed) return rs;
      const next = [...rs];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const milestones: MilestoneInput[] = rows.map((r) => ({
        id: r.id,
        title: r.title,
        difficulty: r.difficulty,
        deadline: date(r.deadline),
        time: r.deadline && r.time ? r.time : undefined,
      }));
      const input = { title, categoryId, targetDate: date(targetDate), description, milestones };
      const result = goal ? await updateGoal(ctx, goal.id, input) : await createGoal(ctx, input);
      if (!result.ok) {
        setErrors(result.errors);
        const bad = result.errors.milestone ? Number(Object.keys(result.errors.milestone)[0]) : undefined;
        document.getElementById(result.errors.title ? 'goal-title' : bad !== undefined ? `milestone-${bad}` : 'goal-title')?.focus();
        return;
      }
      if (!goal) celebrate('small');
      navigate(`/objetivos/${result.id}`, { replace: !!goal });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack" style={{ gap: 'var(--s5)' }} onSubmit={(e) => void submit(e)} noValidate>
      <h1>{goal ? t('goals.editTitle') : t('goals.newTitle')}</h1>

      <div className="field">
        <label htmlFor="goal-title">{t('goals.fieldTitle')}</label>
        <input
          id="goal-title"
          type="text"
          value={title}
          maxLength={GOAL_TITLE_MAX}
          placeholder={t('goals.titlePlaceholder')}
          aria-invalid={!!errors.title}
          onChange={(e) => setTitle(e.target.value)}
        />
        {errors.title && <p className="field-error">{errorText(errors.title, { max: GOAL_TITLE_MAX })}</p>}
      </div>

      <fieldset className="field">
        <legend>{t('goals.category')}</legend>
        <div className="choice-group">
          {options.map((c) => (
            <label key={c.id} className="choice">
              <input type="radio" name="goal-category" checked={categoryId === c.id} onChange={() => setCategoryId(c.id)} />
              <CategoryIcon category={c} />
              {categoryName(c)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="goal-target">{t('goals.targetDate')}</label>
        <input id="goal-target" type="date" min={today} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} style={{ maxWidth: 220 }} />
        <p className="small muted">{t('goals.targetHint')}</p>
      </div>

      <div className="field">
        <label htmlFor="goal-description">{t('goals.description')}</label>
        <textarea
          id="goal-description"
          rows={2}
          maxLength={GOAL_DESCRIPTION_MAX}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <fieldset className="field">
        <legend>{t('goals.milestones')}</legend>
        <p className="small muted">{t('goals.milestonesHint')}</p>
        {errors.milestones && <p className="field-error">{errorText(errors.milestones, { max: MILESTONES_MAX })}</p>}
        <ol className="stack" style={{ paddingLeft: 0, listStyle: 'none', gap: 'var(--s3)' }}>
          {rows.map((r, i) => {
            const label = t('goals.milestoneN', { n: i + 1 });
            const error = errors.milestone?.[i];
            return (
              <li key={r.id ?? `new-${i}`} className="panel stack" style={{ padding: 'var(--s3)', gap: 'var(--s2)' }} role="group" aria-label={label}>
                <div className="row">
                  <span className="pixel grow">{label}</span>
                  {r.fixed ? (
                    <span className="chip chip-muted">{t('goals.activated')}</span>
                  ) : (
                    <>
                      <button type="button" className="btn btn-ghost btn-icon" aria-label={t('goals.moveUp', { n: i + 1 })} disabled={i === firstEditable} onClick={() => move(i, -1)}>
                        <Sprite name="arrow-up" />
                      </button>
                      <button type="button" className="btn btn-ghost btn-icon" aria-label={t('goals.moveDown', { n: i + 1 })} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                        <Sprite name="arrow-down" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        aria-label={t('goals.remove', { n: i + 1 })}
                        disabled={rows.length === 1}
                        onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                      >
                        <Sprite name="close" />
                      </button>
                    </>
                  )}
                </div>
                <input
                  id={`milestone-${i}`}
                  type="text"
                  value={r.title}
                  maxLength={GOAL_TITLE_MAX}
                  disabled={r.fixed}
                  aria-label={`${label} · ${t('goals.fieldTitle')}`}
                  aria-invalid={!!error}
                  onChange={(e) => update(i, { title: e.target.value })}
                />
                {!r.fixed && (
                  <>
                    <div className="choice-group">
                      {DIFFICULTIES.map((d) => (
                        <label key={d} className="choice">
                          <input type="radio" name={`milestone-${i}-difficulty`} checked={r.difficulty === d} onChange={() => update(i, { difficulty: d })} />
                          {difficultyLabel(d)}
                          <span className="small muted">{t('difficulty.pts', { points: DIFFICULTY_POINTS[d] })}</span>
                        </label>
                      ))}
                    </div>
                    <div className="row" style={{ flexWrap: 'wrap' }}>
                      <input
                        type="date"
                        min={today}
                        value={r.deadline}
                        aria-label={`${label} · ${t('goals.deadline')}`}
                        onChange={(e) => update(i, { deadline: e.target.value, time: e.target.value ? r.time : '' })}
                      />
                      <input
                        type="time"
                        className="time-input"
                        value={r.time}
                        disabled={!r.deadline}
                        aria-label={`${label} · ${t('goals.time')}`}
                        onChange={(e) => update(i, { time: e.target.value })}
                      />
                    </div>
                  </>
                )}
                {error && <p className="field-error">{errorText(error, { max: GOAL_TITLE_MAX })}</p>}
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          className="btn"
          disabled={rows.length >= MILESTONES_MAX}
          onClick={() => setRows((rs) => [...rs, { title: '', difficulty: 'medium', deadline: '', time: '', fixed: false }])}
        >
          <Sprite name="plus" />
          {t('goals.addMilestone')}
        </button>
      </fieldset>

      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          {t('common.cancel')}
        </button>
        <button type="submit" className="btn btn-primary grow" disabled={saving}>
          {goal ? t('common.save') : t('goals.create')}
        </button>
      </div>
    </form>
  );
}
