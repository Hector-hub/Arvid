import { useEffect, useRef, useState } from 'react';
import { saveSetting } from '../../data/repository';
import { markSaid, pickLine } from '../../domain/arvid/arvid';
import { toLocalDate } from '../../domain/time/localDate';
import { t } from '../../i18n';
import { line, lineCount } from '../arvid/lines';
import { levelTitle } from '../text';
import { useAnalysis } from '../analysis';
import { useData, useSettings } from '../data';
import { CompanionPreview } from '../scene/Scene';
import { celebrate } from '../scene/engine';

/**
 * Celebra cada nivel una sola vez (PRG-06). Si no hay nivel celebrado guardado (primer uso o datos previos), se fija
 * el actual sin celebrar (PRG-07).
 */
export function LevelUpWatcher() {
  const { db } = useData();
  const settings = useSettings();
  const analysis = useAnalysis();
  const level = analysis?.progress.level;
  const celebrated = settings?.lastCelebratedLevel;

  useEffect(() => {
    if (settings && level !== undefined && celebrated === undefined) void saveSetting(db, 'lastCelebratedLevel', level);
  }, [db, settings, level, celebrated]);

  if (level === undefined || celebrated === undefined || level <= celebrated || !settings) return null;
  return (
    <LevelUpModal
      key={level}
      level={level}
      newTitle={levelTitle(level) !== levelTitle(celebrated) ? levelTitle(level) : undefined}
      lastLine={settings.arvidSeen?.lastLine?.levelUp}
      say={(index) =>
        line('lines.levelUp', index, settings.profile?.gender, { level, title: levelTitle(level), alias: settings.profile?.alias ?? '' })
      }
      onClose={(index) => {
        void saveSetting(db, 'lastCelebratedLevel', level);
        void saveSetting(db, 'arvidSeen', markSaid(settings.arvidSeen, 'levelUp', index, toLocalDate(new Date())));
      }}
    />
  );
}

function LevelUpModal({
  level,
  newTitle,
  lastLine,
  say,
  onClose: close,
}: {
  level: number;
  newTitle?: string;
  lastLine?: number;
  say: (index: number) => string;
  onClose: (index: number) => void;
}) {
  // ARVID celebra el nivel en el aviso, en lugar del personaje (DL-01, prioridad 1); la frase se elige una vez
  const [index] = useState(() => pickLine(lineCount('lines.levelUp'), lastLine, Math.random));
  const arvidSays = say(index);
  const onClose = () => close(index);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus(), []);
  // Ráfaga grande en la escena (PAR-02); si la escena no está a la vista, espera a que vuelva (PAR-03)
  const celebrated = useRef(0);
  useEffect(() => {
    if (celebrated.current === level) return;
    celebrated.current = level;
    celebrate('big');
  }, [level]);
  return (
    <div className="sheet-backdrop" style={{ alignItems: 'center' }} onClick={onClose}>
      <div
        className="panel sheet levelup stack"
        role="dialog"
        aria-modal="true"
        aria-labelledby="levelup-title"
        style={{ maxWidth: 360, gap: 'var(--s4)' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <div className="row" style={{ justifyContent: 'center' }}>
          <CompanionPreview size={96} talking />
        </div>
        <h2 id="levelup-title" style={{ fontSize: '1.75rem', color: 'var(--level)' }}>
          {t('levelUp.title', { level })}
        </h2>
        {newTitle && (
          <p className="pixel">
            {t('levelUp.newTitle')} <span style={{ color: 'var(--xp)' }}>{newTitle}</span>
          </p>
        )}
        <p className="pixel" aria-label={`${t('scene.arvidSays')}: ${arvidSays}`}>
          {arvidSays}
        </p>
        <p className="muted">{t('levelUp.keep')}</p>
        <button ref={button} type="button" className="btn btn-primary btn-block" onClick={onClose}>
          {t('common.continue')}
        </button>
      </div>
    </div>
  );
}
