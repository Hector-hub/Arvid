import { useEffect, useRef } from 'react';
import { saveSetting } from '../../data/repository';
import { titleForLevel } from '../../domain/progress/progress';
import { useAnalysis } from '../analysis';
import { useData, useSettings } from '../data';
import { AvatarPreview } from '../scene/Scene';
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

  if (level === undefined || celebrated === undefined || level <= celebrated) return null;
  return (
    <LevelUpModal
      level={level}
      newTitle={titleForLevel(level) !== titleForLevel(celebrated) ? titleForLevel(level) : undefined}
      onClose={() => void saveSetting(db, 'lastCelebratedLevel', level)}
    />
  );
}

function LevelUpModal({ level, newTitle, onClose }: { level: number; newTitle?: string; onClose: () => void }) {
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
          <AvatarPreview scale={2} />
        </div>
        <h2 id="levelup-title" style={{ fontSize: '1.75rem', color: 'var(--level)' }}>
          ¡Nivel {level}!
        </h2>
        {newTitle && (
          <p className="pixel">
            Nuevo título: <span style={{ color: 'var(--xp)' }}>{newTitle}</span>
          </p>
        )}
        <p className="muted">Lo que has hecho no se pierde. Sigue así.</p>
        <button ref={button} type="button" className="btn btn-primary btn-block" onClick={onClose}>
          Continuar
        </button>
      </div>
    </div>
  );
}
