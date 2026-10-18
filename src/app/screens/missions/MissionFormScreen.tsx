import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { createMission, updateMission } from '../../../data/missions';
import { celebrate } from '../../scene/engine';
import { DIFFICULTY_POINTS, type Difficulty } from '../../../domain/config';
import { missionActions, type MissionInputErrors, type MissionRecord } from '../../../domain/missions/missions';
import { isLocalDate, type LocalDate } from '../../../domain/time/localDate';
import { useAnalysis } from '../../analysis';
import { useToday } from '../../clock';
import { useCategories, useData, useMissions } from '../../data';
import { CategoryIcon } from '../../design/components';
import { DIFFICULTY_LABEL } from '../../text';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Crear y editar misiones (MUI-02, MIS-06, MIS-07). */
export function MissionFormScreen() {
  const { id } = useParams();
  const missions = useMissions();
  const categories = useCategories();
  if (!missions || !categories) return null;
  const record = id ? missions.find((m) => m.mission.id === id) : undefined;
  if (id && !record) return <p>Misión no encontrada.</p>;
  // La categoría por defecto se calcula aquí, con las categorías ya cargadas.
  const defaultCategoryId = record?.mission.categoryId ?? categories.find((c) => c.active && !c.archivedAt)?.id ?? '';
  return <MissionForm key={id ?? 'new'} record={record} defaultCategoryId={defaultCategoryId} />;
}

function MissionForm({ record, defaultCategoryId }: { record?: MissionRecord; defaultCategoryId: string }) {
  const ctx = useData();
  const navigate = useNavigate();
  const today = useToday();
  const analysis = useAnalysis();
  const categories = useCategories() ?? [];
  const [title, setTitle] = useState(record?.mission.title ?? '');
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [difficulty, setDifficulty] = useState<Difficulty>(record?.mission.difficulty ?? 'medium');
  const [deadline, setDeadline] = useState('');
  const [errors, setErrors] = useState<MissionInputErrors>({});
  const [saving, setSaving] = useState(false);

  const missionAnalysis = record ? analysis?.byMission.get(record.mission.id) : undefined;
  const locked =
    !!record && !!missionAnalysis && !missionActions(record, missionAnalysis, today).editCategoryAndDifficulty;
  const options = categories.filter((c) => (c.active && !c.archivedAt) || c.id === record?.mission.categoryId);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const date = deadline && isLocalDate(deadline) ? (deadline as LocalDate) : undefined;
      const result = record
        ? await updateMission(ctx, record.mission.id, { title, categoryId, difficulty })
        : await createMission(ctx, { title, categoryId, difficulty, deadline: date });
      if (!result.ok) {
        setErrors(result.errors);
        document
          .getElementById(
            result.errors.title ? 'mission-title' : result.errors.deadline ? 'mission-deadline' : 'mission-title',
          )
          ?.focus();
        return;
      }
      if (!record) celebrate('small');
      navigate(record ? `/actividades/misiones/${record.mission.id}` : '/actividades/misiones', { replace: !!record });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack" style={{ gap: 'var(--s5)' }} onSubmit={(e) => void submit(e)} noValidate>
      <h1>{record ? 'Editar misión' : 'Nueva misión'}</h1>

      <div className="field">
        <label htmlFor="mission-title">Título</label>
        <input
          id="mission-title"
          type="text"
          value={title}
          maxLength={80}
          autoComplete="off"
          placeholder="Pedir cita con el médico"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'mission-title-error' : undefined}
          onChange={(e) => setTitle(e.target.value)}
        />
        {errors.title && (
          <p id="mission-title-error" className="field-error">
            {errors.title}
          </p>
        )}
      </div>

      <fieldset className="field" disabled={locked}>
        <legend>Categoría</legend>
        <div className="choice-group">
          {options.map((c) => (
            <label key={c.id} className="choice">
              <input type="radio" name="category" checked={categoryId === c.id} onChange={() => setCategoryId(c.id)} />
              <CategoryIcon category={c} />
              {c.name}
            </label>
          ))}
        </div>
        {errors.categoryId && <p className="field-error">{errors.categoryId}</p>}
      </fieldset>

      <fieldset className="field" disabled={locked}>
        <legend>Dificultad</legend>
        <div className="choice-group">
          {DIFFICULTIES.map((d) => (
            <label key={d} className="choice">
              <input type="radio" name="difficulty" checked={difficulty === d} onChange={() => setDifficulty(d)} />
              {DIFFICULTY_LABEL[d]}
              <span className="small muted">{DIFFICULTY_POINTS[d]} XP</span>
            </label>
          ))}
        </div>
      </fieldset>
      {locked && (
        <p className="small muted">
          La categoría y la dificultad solo se pueden cambiar mientras la misión está pendiente.
        </p>
      )}

      {!record && (
        <div className="field">
          <label htmlFor="mission-deadline">Fecha límite (opcional)</label>
          <input
            id="mission-deadline"
            type="date"
            min={today}
            value={deadline}
            aria-invalid={!!errors.deadline}
            aria-describedby={errors.deadline ? 'mission-deadline-error' : 'mission-deadline-hint'}
            onChange={(e) => setDeadline(e.target.value)}
            style={{ maxWidth: 220 }}
          />
          {errors.deadline ? (
            <p id="mission-deadline-error" className="field-error">
              {errors.deadline}
            </p>
          ) : (
            <p id="mission-deadline-hint" className="small muted">
              Si la dejas vencer, resta en tu Disciplina. Sin fecha, nunca penaliza.
            </p>
          )}
        </div>
      )}

      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary grow" disabled={saving}>
          {record ? 'Guardar' : 'Crear misión'}
        </button>
      </div>
    </form>
  );
}
