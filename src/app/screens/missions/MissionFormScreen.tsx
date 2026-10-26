import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { createMission, updateMission } from '../../../data/missions';
import { celebrate } from '../../scene/engine';
import { DIFFICULTY_POINTS, type Difficulty } from '../../../domain/config';
import { MISSION_TITLE_MAX, missionActions, type MissionInputErrors, type MissionRecord } from '../../../domain/missions/missions';
import { isLocalDate, type LocalDate } from '../../../domain/time/localDate';
import { useAnalysis } from '../../analysis';
import { useToday } from '../../clock';
import { useCategories, useData, useMissions } from '../../data';
import { CategoryIcon } from '../../design/components';
import { categoryName, difficultyLabel, errorText } from '../../text';
import { t } from '../../../i18n';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Crear y editar misiones (MUI-02, MIS-06, MIS-07). */
export function MissionFormScreen() {
  const { id } = useParams();
  const missions = useMissions();
  const categories = useCategories();
  if (!missions || !categories) return null;
  const record = id ? missions.find((m) => m.mission.id === id) : undefined;
  if (id && !record) return <p>{t('missions.notFound')}</p>;
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
  const [time, setTime] = useState(record?.mission.time ?? '');
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
        ? await updateMission(ctx, record.mission.id, { title, categoryId, difficulty, time: time || undefined })
        : await createMission(ctx, { title, categoryId, difficulty, deadline: date, time: date && time ? time : undefined });
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
      <h1>{record ? t('missionForm.editTitle') : t('missionForm.newTitle')}</h1>

      <div className="field">
        <label htmlFor="mission-title">{t('missionForm.title')}</label>
        <input
          id="mission-title"
          type="text"
          value={title}
          maxLength={80}
          autoComplete="off"
          placeholder={t('missionForm.titlePlaceholder')}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'mission-title-error' : undefined}
          onChange={(e) => setTitle(e.target.value)}
        />
        {errors.title && (
          <p id="mission-title-error" className="field-error">
            {errorText(errors.title, { max: MISSION_TITLE_MAX })}
          </p>
        )}
      </div>

      <fieldset className="field" disabled={locked}>
        <legend>{t('missionForm.category')}</legend>
        <div className="choice-group">
          {options.map((c) => (
            <label key={c.id} className="choice">
              <input type="radio" name="category" checked={categoryId === c.id} onChange={() => setCategoryId(c.id)} />
              <CategoryIcon category={c} />
              {categoryName(c)}
            </label>
          ))}
        </div>
        {errors.categoryId && <p className="field-error">{errorText(errors.categoryId)}</p>}
      </fieldset>

      <fieldset className="field" disabled={locked}>
        <legend>{t('missionForm.difficulty')}</legend>
        <div className="choice-group">
          {DIFFICULTIES.map((d) => (
            <label key={d} className="choice">
              <input type="radio" name="difficulty" checked={difficulty === d} onChange={() => setDifficulty(d)} />
              {difficultyLabel(d)}
              <span className="small muted">{t('difficulty.xp', { points: DIFFICULTY_POINTS[d] })}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {locked && (
        <p className="small muted">{t('missionForm.locked')}</p>
      )}

      {!record && (
        <div className="field">
          <label htmlFor="mission-deadline">{t('missionForm.deadline')}</label>
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
              {errorText(errors.deadline)}
            </p>
          ) : (
            <p id="mission-deadline-hint" className="small muted">
              {t('missionForm.deadlineHint')}
            </p>
          )}
        </div>
      )}

      {/* Hora del aviso (spec 12, MH-01): con fecha límite (al crear, la elegida; al editar, la vigente) */}
      {(record ? !!missionAnalysis?.deadline : !!deadline) && (
        <div className="field">
          <label htmlFor="mission-time">{t('missionForm.time')}</label>
          <input
            id="mission-time"
            type="time"
            className="time-input"
            value={time}
            aria-describedby="mission-time-hint"
            onChange={(e) => setTime(e.target.value)}
            style={{ maxWidth: 160 }}
          />
          {errors.time ? (
            <p className="field-error">{errorText(errors.time)}</p>
          ) : (
            <p id="mission-time-hint" className="small muted">
              {t('missionForm.timeHint')}
            </p>
          )}
        </div>
      )}

      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          {t('common.cancel')}
        </button>
        <button type="submit" className="btn btn-primary grow" disabled={saving}>
          {record ? t('common.save') : t('missionForm.create')}
        </button>
      </div>
    </form>
  );
}
