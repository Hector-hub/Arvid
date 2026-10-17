import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { createActivity, renameActivity, updateActivityConfig } from '../../data/repository';
import { validateActivityInput, versionAt, type ConfigErrors } from '../../domain/activities/rules';
import type { ActivityConfig } from '../../domain/activities/types';
import { TARGET_LIMITS, type Difficulty } from '../../domain/config';
import type { PeriodKind } from '../../domain/time/period';
import { useToday } from '../clock';
import { useCategories, useData, useRecord } from '../data';
import { CategoryIcon } from '../design/components';
import { DIFFICULTY_LABEL, PERIOD_LABEL } from '../text';
import { DIFFICULTY_POINTS } from '../../domain/config';

const PERIODS: PeriodKind[] = ['day', 'week', 'month'];
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Crear y editar actividades (ACT-01, ACT-03, ACT-04, CAT-03). */
export function ActivityFormScreen() {
  const { id } = useParams();
  const record = useRecord(id);
  const categories = useCategories();
  const today = useToday();

  if (id && record === null) return null;
  if (id && !record) return <p>Actividad no encontrada.</p>;
  if (!categories) return null;

  const version = record ? versionAt(record.versions, today) : undefined;
  return (
    <ActivityForm
      key={id ?? 'new'}
      activityId={id}
      initialName={record?.activity.name ?? ''}
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
}: {
  activityId?: string;
  initialName: string;
  initialConfig: ActivityConfig;
}) {
  const ctx = useData();
  const navigate = useNavigate();
  const categories = useCategories() ?? [];
  const [name, setName] = useState(initialName);
  const [config, setConfig] = useState<ActivityConfig>({
    period: initialConfig.period,
    target: initialConfig.target,
    difficulty: initialConfig.difficulty,
    categoryId: initialConfig.categoryId,
  });
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
        await createActivity(ctx, { name, config });
        navigate('/hoy');
        return;
      }
      if (name.trim() !== initialName) await renameActivity(ctx, activityId, name);
      const changed = (Object.keys(config) as (keyof ActivityConfig)[]).some((k) => config[k] !== initialConfig[k]);
      if (changed) await updateActivityConfig(ctx, activityId, config);
      navigate(`/actividades/${activityId}`, { replace: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack" style={{ gap: 'var(--s5)' }} onSubmit={(e) => void submit(e)} noValidate>
      <h1>{activityId ? 'Editar actividad' : 'Nueva actividad'}</h1>

      <div className="field">
        <label htmlFor="name">Nombre</label>
        <input
          id="name"
          type="text"
          value={name}
          maxLength={60}
          autoComplete="off"
          placeholder="Caminar 20 minutos"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name && (
          <p id="name-error" className="field-error">
            {errors.name}
          </p>
        )}
      </div>

      <fieldset className="field" aria-describedby={errors.categoryId ? 'cat-error' : undefined}>
        <legend>Categoría</legend>
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
              {c.name}
            </label>
          ))}
        </div>
        {errors.categoryId && (
          <p id="cat-error" className="field-error">
            {errors.categoryId}
          </p>
        )}
      </fieldset>

      <fieldset className="field">
        <legend>Frecuencia</legend>
        <div className="choice-group">
          {PERIODS.map((p) => (
            <label key={p} className="choice">
              <input
                type="radio"
                name="period"
                value={p}
                checked={config.period === p}
                onChange={() => set({ period: p, target: Math.min(config.target, TARGET_LIMITS[p]) })}
              />
              {PERIOD_LABEL[p]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="target">Veces por {config.period === 'day' ? 'día' : config.period === 'week' ? 'semana' : 'mes'}</label>
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
            {errors.target}
          </p>
        ) : (
          <p id="target-hint" className="small muted">
            Entre 1 y {max}
          </p>
        )}
      </div>

      <fieldset className="field">
        <legend>Dificultad</legend>
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
              {DIFFICULTY_LABEL[d]}
              <span className="small muted">{DIFFICULTY_POINTS[d]} pts</span>
            </label>
          ))}
        </div>
      </fieldset>

      {activityId && (
        <p className="small muted">Los cambios de categoría, frecuencia o dificultad se aplican desde el inicio del periodo actual.</p>
      )}

      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary grow" disabled={saving}>
          {activityId ? 'Guardar' : 'Crear actividad'}
        </button>
      </div>
    </form>
  );
}
