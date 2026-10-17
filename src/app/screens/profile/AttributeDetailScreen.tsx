import { Link, useParams } from 'react-router';
import { trend, type Score } from '../../../domain/attributes/attributes';
import { addDays, compareDates } from '../../../domain/time/localDate';
import { useAnalysis } from '../../analysis';
import { useToday } from '../../clock';
import { useMissions, useRecords, useSettings } from '../../data';
import { BackLink, CategoryIcon, Panel } from '../../design/components';
import { explanationText, penaltyText, pointsText, scoreValueText, trendText } from '../../profile/scoreText';
import { useProfile } from '../../profile/useProfile';

function useNames() {
  const records = useRecords();
  const missions = useMissions();
  const activityName = (id: string) => records?.find((r) => r.activity.id === id)?.activity.name ?? 'actividad';
  const missionTitle = (id: string) => missions?.find((m) => m.mission.id === id)?.mission.title ?? 'misión';
  return { activityName, missionTitle };
}

function ScoreHeader({ score, previous, window }: { score: Score; previous: Score; window: number }) {
  const t = trendText(trend(score.value, previous.value));
  return (
    <p className="muted">
      <span className="pixel" style={{ fontSize: '1.5rem', color: score.value === undefined ? 'var(--text-muted)' : 'var(--text)' }}>
        {score.value ?? '—'}
      </span>{' '}
      en los últimos {window} días
      {previous.value !== undefined && ` · antes: ${previous.value}`}
      {t && ` · ${t}`}
    </p>
  );
}

/** Detalle de un atributo (DA-01 a DA-04). */
export function AttributeDetailScreen() {
  const { categoryId } = useParams();
  const settings = useSettings();
  const window = settings?.radarWindow ?? 30;
  const view = useProfile(window);
  const analysis = useAnalysis();
  const today = useToday();
  const missions = useMissions();
  const { activityName } = useNames();
  if (!view || !analysis || !missions) return null;
  const category = view.categories.find((c) => c.id === categoryId);
  const score = category && view.profile.current.attributes.get(category.id);
  if (!category || !score) return <p>Categoría no encontrada o inactiva.</p>;
  const previous = view.profile.previous.attributes.get(category.id)!;
  const from = addDays(today, -(window - 1));
  const completedMissions = missions.filter((m) => {
    const a = analysis.byMission.get(m.mission.id);
    return a?.category && m.mission.categoryId === category.id && compareDates(a.category.date, from) >= 0;
  });

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <BackLink to="/personaje" label="Personaje" />
      <header className="row">
        <CategoryIcon category={category} scale={3} />
        <h1 className="grow">{category.name}</h1>
      </header>
      <ScoreHeader score={score} previous={previous} window={window} />

      <Panel className="stack" labelledBy="explain-title">
        <h2 id="explain-title">Cómo se calcula</h2>
        <p>{explanationText({ label: category.name, score, window, activityName })}</p>
        <p className="small muted">Mide cuánto cumpliste lo que te propusiste en esta área, no tu salud ni tu capacidad.</p>
        {window === 7 && <p className="small muted">Con 7 días, las actividades mensuales solo cuentan si el mes en curso ya está completo.</p>}
      </Panel>

      <Panel className="stack" labelledBy="related-title">
        <h2 id="related-title">Qué cuenta</h2>
        {score.breakdown.length === 0 && completedMissions.length === 0 && (
          <p className="muted small">No hay actividades ni misiones de esta categoría en el periodo.</p>
        )}
        <ul className="stack small" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 'var(--s2)' }}>
          {score.breakdown.map((b) =>
            b.source === 'activity' ? (
              <li key={b.activityId} className="row">
                <Link to={`/actividades/${b.activityId}`} className="grow" style={{ color: 'var(--text)' }}>
                  {activityName(b.activityId)}
                </Link>
                <span className="muted">
                  {pointsText(b.earnedCents)} de {pointsText(b.possibleCents)}
                </span>
              </li>
            ) : null,
          )}
          {completedMissions.map((m) => (
            <li key={m.mission.id} className="row">
              <Link to={`/actividades/misiones/${m.mission.id}`} className="grow" style={{ color: 'var(--text)' }}>
                Misión: {m.mission.title}
              </Link>
              <span className="chip chip-done">Cumplida</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/** Detalle de Disciplina (DA-05). */
export function DisciplineDetailScreen() {
  const settings = useSettings();
  const window = settings?.radarWindow ?? 30;
  const view = useProfile(window);
  const { activityName, missionTitle } = useNames();
  if (!view) return null;
  const score = view.profile.current.discipline;
  const penalties = score.breakdown.filter((b) => b.source === 'penalty');

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <BackLink to="/personaje" label="Personaje" />
      <h1>Disciplina</h1>
      <ScoreHeader score={score} previous={view.profile.previous.discipline} window={window} />

      <Panel className="stack" labelledBy="explain-title">
        <h2 id="explain-title">Cómo se calcula</h2>
        <p>
          {score.value === undefined
            ? `Aún no hay suficiente información: ${scoreValueText(score)}.`
            : explanationText({ label: 'Disciplina', score, window, activityName })}
        </p>
        <p className="small muted">
          Cuenta todo lo que te propusiste en todas tus áreas, incluidas las misiones con fecha límite. Las misiones sin fecha no
          cuentan.
        </p>
      </Panel>

      {penalties.length > 0 && (
        <Panel className="stack" labelledBy="penalty-title">
          <h2 id="penalty-title">Lo que resta</h2>
          {penalties.map((p) => (
            <div key={p.reason} className="stack" style={{ gap: 'var(--s1)' }}>
              <p className="small">
                {penaltyText(p)}
                {p.reason === 'expired' && (p.missionIds.length === 1 ? '; complétala para recuperarlos.' : '; complétalas para recuperarlos.')}
              </p>
              <ul className="small" style={{ margin: 0, paddingLeft: 'var(--s5)' }}>
                {p.missionIds.map((id) => (
                  <li key={id}>
                    <Link to={`/actividades/misiones/${id}`} style={{ color: 'var(--text)' }}>
                      {missionTitle(id)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
