import type { CSSProperties } from 'react';
import { Link, useLocation } from 'react-router';
import { FriendsIcon, GearIcon } from '../design/icons';
import { saveSetting } from '../../data/repository';
import { trend, type Score, type WindowDays } from '../../domain/attributes/attributes';
import { MIN_RADAR_AXES } from '../../domain/attributes/radar';
import { accountsEnabled } from '../account/account';
import { FinishedChallenges } from '../challenges/ChallengeScreens';
import { AchievementsSection } from '../achievements/AchievementsSection';
import { CITY_ITEMS } from '../../domain/scene/city';
import { useAnalysis } from '../analysis';
import { useData, useSettings } from '../data';
import { CategoryIcon, Panel, Sprite, categoryColor } from '../design/components';
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
      {/* Cabecera (D-198): el nivel en un anillo de XP, el alias y el progreso; ciudad y amigos como filas de lista */}
      <header className="profile-head">
        <div
          className="level-ring"
          role="progressbar"
          aria-label={t('level.xpBar')}
          aria-valuemin={p.levelStartXp}
          aria-valuemax={p.nextLevelXp}
          aria-valuenow={p.xp}
          style={{ '--v': `${Math.round(Math.max(0, Math.min(1, (p.xp - p.levelStartXp) / Math.max(1, p.nextLevelXp - p.levelStartXp))) * 100)}%` } as CSSProperties}
        >
          <span>
            <b>{p.level}</b>
            <small>{t('profile.levelShort')}</small>
          </span>
        </div>
        <div className="grow stack" style={{ gap: 2, minWidth: 0 }}>
          <h1 className="profile-alias">{settings.profile?.alias ?? t('profile.noAlias')}</h1>
          <p className="small muted">
            {t(`avatar.styles.${settings.avatar.cast}`)} · {levelTitle(p.level)}
          </p>
          <p className="small pixel" style={{ color: 'var(--xp)' }}>
            <span>{t('profile.xpOf', { xp: intText(p.xp), next: intText(p.nextLevelXp) })}</span>
            <span className="muted"> · {t('profile.left', { count: intText(p.nextLevelXp - p.xp) })}</span>
          </p>
        </div>
        <Link to="/ajustes" className="btn btn-icon btn-ghost" aria-label={t('nav.settings')} style={{ alignSelf: 'flex-start' }}>
          <span style={{ color: 'var(--xp)', display: 'grid' }}>
            <GearIcon />
          </span>
        </Link>
      </header>
      <p className="muted small">{p.xpCents === 0 ? t('profile.firstXp') : t('profile.totalXp', { xp: intText(p.xp) })}</p>

      <nav className="profile-links">
        <Link to="/perfil/ciudad" className="sound-row">
          <span className="profile-link-icon" aria-hidden="true">
            <Sprite name="crown" color="var(--xp)" />
          </span>
          <span className="grow sound-row-name">
            <b>{t('city.title')}</b>
            <span>{t('city.progress', { done: CITY_ITEMS.filter((u) => u.level <= p.level).length, total: CITY_ITEMS.length })}</span>
          </span>
          <span className="settings-card-go" aria-hidden="true">›</span>
        </Link>
        {/* Amigos (spec 15, AM-01) */}
        {accountsEnabled() && (
          <Link to="/perfil/amigos" className="sound-row">
            <span className="profile-link-icon" aria-hidden="true">
              <FriendsIcon />
            </span>
            <span className="grow sound-row-name">
              <b>{t('friends.link')}</b>
              <span>{t('profile.friendsHint')}</span>
            </span>
            <span className="settings-card-go" aria-hidden="true">›</span>
          </Link>
        )}
      </nav>

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
      {/* Retos cumplidos (spec 15, FN-04) */}
      <FinishedChallenges />
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
