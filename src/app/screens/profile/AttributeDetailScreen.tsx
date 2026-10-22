import { Link, useParams } from 'react-router';
import { CompanionPreview } from '../../scene/Scene';
import { trend, type Score } from '../../../domain/attributes/attributes';
import { addDays, compareDates } from '../../../domain/time/localDate';
import { useAnalysis } from '../../analysis';
import { useToday } from '../../clock';
import { useMissions, useRecords, useSettings } from '../../data';
import { BackLink, CategoryIcon, Panel } from '../../design/components';
import { explanationText, penaltyText, pointsText, scoreValueText, trendText } from '../../profile/scoreText';
import { useProfile } from '../../profile/useProfile';
import { t } from '../../../i18n';
import { categoryName } from '../../text';

function useNames() {
  const records = useRecords();
  const missions = useMissions();
  const activityName = (id: string) => records?.find((r) => r.activity.id === id)?.activity.name ?? t('attribute.fallbackActivity');
  const missionTitle = (id: string) => missions?.find((m) => m.mission.id === id)?.mission.title ?? t('attribute.fallbackMission');
  return { activityName, missionTitle };
}

function ScoreHeader({ score, previous, window }: { score: Score; previous: Score; window: number }) {
  const tr = trendText(trend(score.value, previous.value));
  return (
    <p className="muted">
      <span className="pixel" style={{ fontSize: '1.5rem', color: score.value === undefined ? 'var(--text-muted)' : 'var(--text)' }}>
        {score.value ?? '—'}
      </span>{' '}
      {t('attribute.inLastDays', { count: window })}
      {previous.value !== undefined && t('attribute.before', { value: previous.value })}
      {tr && ` · ${tr}`}
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
  if (!category || !score) return <p>{t('attribute.notFound')}</p>;
  const previous = view.profile.previous.attributes.get(category.id)!;
  const from = addDays(today, -(window - 1));
  const completedMissions = missions.filter((m) => {
    const a = analysis.byMission.get(m.mission.id);
    return a?.category && m.mission.categoryId === category.id && compareDates(a.category.date, from) >= 0;
  });

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <BackLink to="/perfil" label={t('nav.profile')} />
      <header className="row">
        <CategoryIcon category={category} scale={3} />
        <h1 className="grow">{categoryName(category)}</h1>
      </header>
      <ScoreHeader score={score} previous={previous} window={window} />

      <Panel className="stack" labelledBy="explain-title">
        <h2 id="explain-title">{t('attribute.howCalculated')}</h2>
        <p>{explanationText({ label: categoryName(category), score, window, activityName })}</p>
        <p className="small muted">{t('attribute.measureNote')}</p>
        {window === 7 && <p className="small muted">{t('attribute.sevenDaysNote')}</p>}
      </Panel>

      <Panel className="stack" labelledBy="related-title">
        <h2 id="related-title">{t('attribute.whatCounts')}</h2>
        {score.breakdown.length === 0 && completedMissions.length === 0 && <p className="muted small">{t('attribute.nothing')}</p>}
        <ul className="stack small" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 'var(--s2)' }}>
          {score.breakdown.map((b) =>
            b.source === 'activity' ? (
              <li key={b.activityId} className="row">
                <Link to={`/actividades/${b.activityId}`} className="grow" style={{ color: 'var(--text)' }}>
                  {activityName(b.activityId)}
                </Link>
                <span className="muted">
                  {t('attribute.pointsOf', { earned: pointsText(b.earnedCents), possible: pointsText(b.possibleCents) })}
                </span>
              </li>
            ) : null,
          )}
          {completedMissions.map((m) => (
            <li key={m.mission.id} className="row">
              <Link to={`/actividades/misiones/${m.mission.id}`} className="grow" style={{ color: 'var(--text)' }}>
                {t('attribute.missionItem', { title: m.mission.title })}
              </Link>
              <span className="chip chip-done">{t('missions.chipOnTime')}</span>
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
  const today = useToday();
  const window = settings?.radarWindow ?? 30;
  const view = useProfile(window);
  const { activityName, missionTitle } = useNames();
  if (!view) return null;
  const score = view.profile.current.discipline;
  const penalties = score.breakdown.filter((b) => b.source === 'penalty');
  // Consejo del día con IA (D-097): solo el de hoy y con la IA activada
  const tip = settings?.arvidAi && settings.disciplineTip?.date === today ? settings.disciplineTip : undefined;

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <BackLink to="/perfil" label={t('nav.profile')} />
      <h1>{t('profile.discipline')}</h1>
      <ScoreHeader score={score} previous={view.profile.previous.discipline} window={window} />

      {tip && (
        <Panel className="stack" labelledBy="tip-title">
          <div className="row">
            <CompanionPreview companion={tip.companion} size={48} />
            <h2 id="tip-title" className="grow">
              {t('attribute.aiTipTitle')}
            </h2>
          </div>
          <p>{tip.text}</p>
          <p className="small muted">{t('attribute.aiTipToday')}</p>
        </Panel>
      )}

      <Panel className="stack" labelledBy="explain-title">
        <h2 id="explain-title">{t('attribute.howCalculated')}</h2>
        <p>
          {score.value === undefined
            ? t('attribute.notEnoughDiscipline', { value: scoreValueText(score) })
            : explanationText({ label: t('profile.discipline'), score, window, activityName })}
        </p>
        <p className="small muted">{t('attribute.disciplineNote')}</p>
      </Panel>

      {penalties.length > 0 && (
        <Panel className="stack" labelledBy="penalty-title">
          <h2 id="penalty-title">{t('attribute.whatSubtracts')}</h2>
          {penalties.map((p) => (
            <div key={p.reason} className="stack" style={{ gap: 'var(--s1)' }}>
              <p className="small">
                {penaltyText(p)}
                {p.reason === 'expired' && t('attribute.recover', { count: p.missionIds.length })}
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
