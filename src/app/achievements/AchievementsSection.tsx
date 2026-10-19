// Sección de logros en Perfil (spec 07, LP): contador, cuadrícula de insignias y hoja de detalle.
import { useState } from 'react';
import { useLocation } from 'react-router';
import {
  ACHIEVEMENT_IDS,
  isAchievementId,
  type AchievementId,
  type AchievementStatus,
} from '../../domain/achievements/achievements';
import { t } from '../../i18n';
import { useAchievements } from '../data';
import { Panel, Sprite } from '../design/components';
import { fullDate } from '../text';
import { Badge } from './Badge';
import { achievementCondition, achievementName, useAchievementStatuses } from './useAchievements';

function accessibleName(id: AchievementId, earned: boolean, status?: AchievementStatus): string {
  const name = achievementName(id);
  if (earned) return t('achievements.a11yEarned', { name });
  if (status?.progress) return t('achievements.a11yProgress', { name, ...status.progress });
  return t('achievements.a11yPending', { name });
}

export function AchievementsSection() {
  const rows = useAchievements();
  const statuses = useAchievementStatuses();
  const location = useLocation();
  // Desde el aviso de logro se llega con el logro a abrir (CE-01)
  const requested = (location.state as { achievement?: string } | null)?.achievement;
  const [open, setOpen] = useState<AchievementId | undefined>(
    requested && isAchievementId(requested) ? requested : undefined,
  );
  if (!rows || !statuses) return null;
  const unlocked = new Map(rows.map((r) => [r.id, r.unlockedAt]));
  const byId = new Map(statuses.map((s) => [s.id, s]));

  return (
    <>
      <Panel className="stack" labelledBy="achievements-title">
        <div className="row">
          <h2 id="achievements-title" className="grow">
            {t('achievements.title')}
          </h2>
          <span className="pixel" style={{ color: 'var(--level)' }}>
            {t('achievements.count', { count: unlocked.size, total: ACHIEVEMENT_IDS.length })}
          </span>
        </div>
        <ul className="badge-grid">
          {ACHIEVEMENT_IDS.map((id) => {
            const earned = unlocked.has(id);
            const progress = byId.get(id)?.progress;
            return (
              <li key={id}>
                <button
                  type="button"
                  className="badge-cell"
                  aria-label={accessibleName(id, earned, byId.get(id))}
                  onClick={() => setOpen(id)}
                >
                  <Badge id={id} earned={earned} />
                  {/* Siempre ocupa su sitio, para que los nombres queden alineados */}
                  <span
                    className="badge-progress"
                    aria-hidden="true"
                    style={{ visibility: !earned && progress ? 'visible' : 'hidden' }}
                  >
                    <i style={{ width: `${progress ? (100 * progress.current) / progress.goal : 0}%` }} />
                  </span>
                  <span className="badge-name">{achievementName(id)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>
      {/* Fuera del panel: su recorte de esquinas recortaría también la hoja */}
      {open && (
        <AchievementSheet
          id={open}
          unlockedAt={unlocked.get(open)}
          status={byId.get(open)}
          onClose={() => setOpen(undefined)}
        />
      )}
    </>
  );
}

/** Hoja de un logro: insignia grande, nombre, condición y fecha o progreso (LP-03). */
function AchievementSheet({
  id,
  unlockedAt,
  status,
  onClose,
}: {
  id: AchievementId;
  unlockedAt?: string;
  status?: AchievementStatus;
  onClose: () => void;
}) {
  const earned = unlockedAt !== undefined;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="panel sheet stack"
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievement-title"
        style={{ alignItems: 'center', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <div className="row" style={{ alignSelf: 'stretch', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            aria-label={t('common.close')}
            onClick={onClose}
            autoFocus
          >
            <Sprite name="close" />
          </button>
        </div>
        <Badge id={id} earned={earned} size={128} />
        <h2 id="achievement-title">{achievementName(id)}</h2>
        <p>{achievementCondition(id)}</p>
        {earned ? (
          <p className="pixel" style={{ color: 'var(--level)' }}>
            {t('achievements.earnedOn', { date: fullDate(new Date(unlockedAt)) })}
          </p>
        ) : status?.progress ? (
          <p className="pixel" style={{ color: 'var(--xp)' }}>
            {t('achievements.progress', status.progress)}
          </p>
        ) : (
          <p className="pixel muted">{t('achievements.pending')}</p>
        )}
      </div>
    </div>
  );
}
