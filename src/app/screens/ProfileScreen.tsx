import { Link, useLocation } from 'react-router';
import { saveSetting } from '../../data/repository';
import { trend, type Score, type WindowDays } from '../../domain/attributes/attributes';
import { MIN_RADAR_AXES } from '../../domain/attributes/radar';
import { accountsEnabled } from '../account/account';
import { AchievementsSection } from '../achievements/AchievementsSection';
import { CITY_ITEMS } from '../../domain/scene/city';
import { useAnalysis } from '../analysis';
import { useData, useSettings } from '../data';
import { CategoryIcon, Panel, Sprite, XpBar, categoryColor } from '../design/components';
import { Radar } from '../profile/Radar';
import { Scene } from '../scene/Scene';
import { scoreValueText, trendText } from '../profile/scoreText';
import { useProfile } from '../profile/useProfile';
import { categoryName, intText, levelTitle } from '../text';
import { t } from '../../i18n';

const WINDOWS: WindowDays[] = [7, 30, 90];

/** Perfil (spec 06, PF): el usuario y su progreso; nivel, ventana, radar, Disciplina y atributos (PJ-01 a PJ-07). */
export function ProfileScreen() {
  const { db } = useData();
  const analysis = useAnalysis();
  const settings = useSettings();
  const window = settings?.radarWindow ?? 30;
  const view = useProfile(window);
  const location = useLocation();
  if (!analysis || !settings || !view) return null;
  const p = analysis.progress;
  const { profile, categories } = view;
  const hasData = analysis.byActivity.size > 0 || analysis.byMission.size > 0;

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      {/* La escena arriba del todo, como en Hoy (D-155) */}
      <div className="scene-sticky">
        <Scene overlay={<h2>{t('level.long', { level: p.level, title: levelTitle(p.level) })}</h2>} />
      </div>
      <header className="row">
        <h1 className="grow">
          {settings.profile ? `${settings.profile.alias} · ${t(`avatar.styles.${settings.avatar.cast}`)}` : t('profile.noAlias')}
        </h1>
        <Link to="/ajustes" className="btn btn-icon btn-ghost" aria-label={t('nav.settings')}>
          <Sprite name="nav-settings" />
        </Link>
      </header>

      <Panel className="stack">
        <XpBar xp={p.xp} start={p.levelStartXp} next={p.nextLevelXp} />
        <p className="row small">
          <span className="grow pixel" style={{ color: 'var(--xp)' }}>
            {t('profile.xpOf', { xp: intText(p.xp), next: intText(p.nextLevelXp) })}
          </span>
          <span className="muted">{t('profile.toNext', { count: intText(p.nextLevelXp - p.xp), level: p.level + 1 })}</span>
        </p>
        {p.xpCents === 0 ? (
          <p className="muted">{t('profile.firstXp')}</p>
        ) : (
          <p className="muted small">{t('profile.totalXp', { xp: intText(p.xp) })}</p>
        )}
        <Link to="/perfil/ciudad" className="btn">
          {t('city.title')} · {t('city.progress', { done: CITY_ITEMS.filter((u) => u.level <= p.level).length, total: CITY_ITEMS.length })}
        </Link>
        {/* Amigos (spec 15, AM-01): con la cuenta, oculta hasta la 2.0 */}
        {accountsEnabled() && (
          <Link to="/perfil/amigos" className="btn">
            {t('friends.link')}
          </Link>
        )}
      </Panel>

      <div className="tabs" role="group" aria-label={t('profile.windowLabel')}>
        {WINDOWS.map((w) => (
          <button
            key={w}
            type="button"
            className={w === window ? 'active' : undefined}
            aria-pressed={w === window}
            onClick={() => void saveSetting(db, 'radarWindow', w)}
          >
            {t('profile.days', { count: w })}
          </button>
        ))}
      </div>

      {!hasData ? (
        <Panel>
          <p className="muted">{t('profile.emptyAttributes')}</p>
        </Panel>
      ) : (
        <>
          <Panel className="stack" labelledBy="attrs-title">
            <h2 id="attrs-title">{t('profile.attributes')}</h2>
            {categories.length >= MIN_RADAR_AXES ? (
              <>
                <Radar categories={categories} current={profile.current} previous={profile.previous} />
                <p className="small muted row" style={{ gap: 'var(--s4)', justifyContent: 'center' }}>
                  <span>
                    <span aria-hidden="true" style={{ color: 'var(--xp)' }}>
                      ■{' '}
                    </span>
                    {t('profile.lastDays', { count: window })}
                  </span>
                  <span>
                    <span aria-hidden="true" style={{ color: 'var(--c-fog)' }}>
                      - -{' '}
                    </span>
                    {t('profile.previousDays', { count: window })}
                  </span>
                </p>
              </>
            ) : (
              <p className="small muted">{t('profile.needThree')}</p>
            )}
            <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 'var(--s3)' }} aria-label={t('profile.attributesList')}>
              {categories.map((c) => {
                const score = profile.current.attributes.get(c.id);
                const tr = trendText(trend(score?.value, profile.previous.attributes.get(c.id)?.value));
                return (
                  <li key={c.id} className="stack" style={{ gap: 'var(--s1)' }}>
                    <Link to={`/perfil/atributo/${c.id}`} className="row" style={{ color: 'var(--text)', textDecoration: 'none' }}>
                      <CategoryIcon category={c} />
                      <span className="grow">{categoryName(c)}</span>
                      {tr && <span className="small muted">{tr}</span>}
                      <span className="pixel" style={{ minWidth: 32, textAlign: 'right', color: score?.value === undefined ? 'var(--text-muted)' : 'var(--text)' }}>
                        {score?.value ?? '—'}
                      </span>
                    </Link>
                    <ScoreBar score={score} color={categoryColor(c)} />
                    {score?.value === undefined && <p className="small muted">{scoreValueText(score)}</p>}
                  </li>
                );
              })}
            </ul>
            <p className="small muted">{t('profile.attributesNote', { count: window })}</p>
          </Panel>

          <DisciplineMeter score={profile.current.discipline} previous={profile.previous.discipline} />
        </>
      )}

      {/* Al llegar desde el aviso de un logro se vuelve a montar para abrir su hoja (CE-01) */}
      <AchievementsSection key={location.key} />
    </div>
  );
}

function ScoreBar({ score, color }: { score?: Score; color: string }) {
  const filled = score?.value === undefined ? 0 : Math.round(score.value / 10);
  return (
    <div className="segments" aria-hidden="true" style={{ maxWidth: 'none', ['--seg-color' as string]: color }}>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={i < filled ? 'on' : undefined} />
      ))}
    </div>
  );
}

/** Medidor de Disciplina de 10 bloques (PJ-03, D-025). */
function DisciplineMeter({ score, previous }: { score: Score; previous: Score }) {
  const tr = trendText(trend(score.value, previous.value));
  return (
    <Panel className="stack" labelledBy="discipline-title">
      <div className="row">
        <h2 id="discipline-title" className="grow">
          {t('profile.discipline')}
        </h2>
        <span className="pixel" style={{ fontSize: '1.5rem', color: score.value === undefined ? 'var(--text-muted)' : 'var(--level)' }}>
          {score.value ?? '—'}
        </span>
      </div>
      <ScoreBar score={score} color="var(--level)" />
      <p className="small muted">
        {score.value === undefined ? scoreValueText(score) : t('profile.disciplineText')}
        {tr && ` · ${tr}`}
      </p>
      <Link to="/perfil/disciplina" className="btn">
        {t('profile.seeDetail')}
      </Link>
    </Panel>
  );
}
