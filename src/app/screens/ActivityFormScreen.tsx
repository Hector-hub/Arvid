import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { createActivity, renameActivity, setReminders, updateActivityConfig } from '../../data/repository';
import { RemindersField, toReminders, type ReminderSlot } from '../notifications/RemindersField';
import { celebrate } from '../scene/engine';
import { validateActivityInput, versionAt, type ConfigErrors } from '../../domain/activities/rules';
import type { ActivityConfig } from '../../domain/activities/types';
import { ACTIVITY_NAME_MAX, TARGET_LIMITS, type Difficulty } from '../../domain/config';
import type { PeriodKind } from '../../domain/time/period';
import { useToday } from '../clock';
import { useCategories, useData, useRecord, useRecords } from '../data';
import { CategoryIcon } from '../design/components';
import { categoryName, difficultyLabel, errorText, periodLabel } from '../text';
import { DIFFICULTY_POINTS } from '../../domain/config';
import { t } from '../../i18n';
import { flagFirstActivity } from '../arvid/moments';

const PERIODS: PeriodKind[] = ['day', 'week', 'month'];
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Crear y editar actividades (ACT-01, ACT-03, ACT-04, CAT-03). */
export function ActivityFormScreen() {
  const { id } = useParams();
  const record = useRecord(id);
  const categories = useCategories();
  const today = useToday();

  if (id && record === null) return null;
  if (id && !record) return <p>{t('activities.notFound')}</p>;
  if (!categories) return null;

  const version = record ? versionAt(record.versions, today) : undefined;
  return (
    <ActivityForm
      key={id ?? 'new'}
      activityId={id}
      initialName={record?.activity.name ?? ''}
      initialReminders={record?.activity.reminders ?? []}
      initialConfig={
        version ?? {
          period: 'day',
          target: 1,
          difficulty: 'medium',
          categoryId: categories.find((c) => c.active)?.id ?? '',
        }
      }
    />
  );
}

function ActivityForm({
  activityId,
  initialName,
  initialConfig,
  initialReminders,
}: {
  activityId?: string;
  initialName: string;
  initialConfig: ActivityConfig;
  initialReminders: ReminderSlot[];
}) {
  const ctx = useData();
  const navigate = useNavigate();
  const categories = useCategories() ?? [];
  const records = useRecords();
  const [name, setName] = useState(initialName);
  const [config, setConfig] = useState<ActivityConfig>({
    period: initialConfig.period,
    target: initialConfig.target,
    difficulty: initialConfig.difficulty,
    categoryId: initialConfig.categoryId,
  });
  const [reminders, setReminderSlots] = useState<ReminderSlot[]>(initialReminders);
  const [errors, setErrors] = useState<ConfigErrors>({});
  const [saving, setSaving] = useState(false);

  // Solo categorías activas; al editar se conserva la actual aunque esté desactivada.
  const options = categories.filter((c) => (c.active && !c.archivedAt) || c.id === initialConfig.categoryId);
  const max = TARGET_LIMITS[config.period];
  const set = (patch: Partial<ActivityConfig>) => setConfig((c) => ({ ...c, ...patch }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = validateActivityInput(name, config);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Accesibilidad: llevar el foco al primer campo con error.
      const first = found.name ? 'name' : found.categoryId ? 'category' : 'target';
      (document.getElementById(first) ?? document.querySelector<HTMLInputElement>(`input[name="${first}"]`))?.focus();
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      if (!activityId) {
        const first = (records?.length ?? 0) === 0;
        await createActivity(ctx, { name, config, reminders: toReminders(reminders, config.period, config.target) });
        if (first) flagFirstActivity();
        celebrate('small');
        navigate('/hoy');
        return;
      }
      if (name.trim() !== initialName) await renameActivity(ctx, activityId, name);
      const changed = (Object.keys(config) as (keyof ActivityConfig)[]).some((k) => config[k] !== initialConfig[k]);
      if (changed) await updateActivityConfig(ctx, activityId, config);
      const saved = toReminders(reminders, config.period, config.target);
      if (JSON.stringify(saved) !== JSON.stringify(initialReminders)) await setReminders(ctx, activityId, saved);
      navigate(`/actividades/${activityId}`, { replace: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack" style={{ gap: 'var(--s5)' }} onSubmit={(e) => void submit(e)} noValidate>
      <h1>{activityId ? t('activityForm.editTitle') : t('activityForm.newTitle')}</h1>

      <div className="field">
        <label htmlFor="name">{t('activityForm.name')}</label>
        <input
          id="name"
          type="text"
          value={name}
          maxLength={60}
          autoComplete="off"
          placeholder={t('activityForm.namePlaceholder')}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name && (
          <p id="name-error" className="field-error">
            {errorText(errors.name, { max: ACTIVITY_NAME_MAX })}
          </p>
        )}
      </div>

      <fieldset className="field" aria-describedby={errors.categoryId ? 'cat-error' : undefined}>
        <legend>{t('activityForm.category')}</legend>
        <div className="choice-group">
          {options.map((c) => (
            <label key={c.id} className="choice">
              <input
                type="radio"
                name="category"
                value={c.id}
                checked={config.categoryId === c.id}
                onChange={() => set({ categoryId: c.id })}
              />
              <CategoryIcon category={c} />
              {categoryName(c)}
            </label>
          ))}
        </div>
        {errors.categoryId && (
          <p id="cat-error" className="field-error">
            {errorText(errors.categoryId)}
          </p>
        )}
      </fieldset>

      <fieldset className="field">
        <legend>{t('activityForm.frequency')}</legend>
        <div className="choice-group">
          {PERIODS.map((p) => (
            <label key={p} className="choice">
              <input
                type="radio"
                name="period"
                value={p}
                checked={config.period === p}
                onChange={() => {
                  set({ period: p, target: Math.min(config.target, TARGET_LIMITS[p]) });
                  // El día de cada recordatorio depende de la frecuencia: se conserva solo la hora
                  setReminderSlots((r) => r.map((slot) => ({ time: slot.time })));
                }}
              />
              {periodLabel(p)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="target">
          {t('activityForm.timesPer', { unit: t(`period.per.${config.period}`) })}
        </label>
        <input
          id="target"
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          value={Number.isNaN(config.target) ? '' : config.target}
          aria-invalid={!!errors.target}
          aria-describedby={errors.target ? 'target-error' : 'target-hint'}
          onChange={(e) => set({ target: e.target.valueAsNumber })}
          style={{ maxWidth: 120 }}
        />
        {errors.target ? (
          <p id="target-error" className="field-error">
            {errorText(errors.target, { max })}
          </p>
        ) : (
          <p id="target-hint" className="small muted">
            {t('errors.targetRange', { max })}
          </p>
        )}
      </div>

      <RemindersField period={config.period} target={config.target} value={reminders} onChange={setReminderSlots} />

      <fieldset className="field">
        <legend>{t('activityForm.difficulty')}</legend>
        <div className="choice-group">
          {DIFFICULTIES.map((d) => (
            <label key={d} className="choice">
              <input
                type="radio"
                name="difficulty"
                value={d}
                checked={config.difficulty === d}
                onChange={() => set({ difficulty: d })}
              />
              {difficultyLabel(d)}
              <span className="small muted">{t('difficulty.pts', { points: DIFFICULTY_POINTS[d] })}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {activityId && (
        <p className="small muted">{t('activityForm.changesNote')}</p>
      )}

      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          {t('common.cancel')}
        </button>
        <button type="submit" className="btn btn-primary grow" disabled={saving}>
          {activityId ? t('common.save') : t('activityForm.create')}
        </button>
      </div>
    </form>
  );
}
