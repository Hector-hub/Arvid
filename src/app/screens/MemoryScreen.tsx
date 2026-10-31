// Lo que el compañero sabe de ti (spec 13, MI-02): sus notas, de la más reciente a la más antigua, para borrarlas una a
// una (con deshacer) o todas.
import { useEffect, useRef, useState } from 'react';
import { clearMemories, deleteMemory, restoreMemory } from '../../data/memory';
import { MEMORY_MAX, type Memory } from '../../domain/arvid/memory';
import { toLocalDate } from '../../domain/time/localDate';
import { t, useLocale } from '../../i18n';
import { useData, useMemories } from '../data';
import { Panel } from '../design/components';
import { Link, useNavigate } from 'react-router';
import { TrashIcon } from '../design/icons';
import { dayMonth } from '../text';

const UNDO_MS = 5000;

export function MemoryScreen() {
  const navigate = useNavigate();
  useLocale();
  const { db } = useData();
  const memories = useMemories();
  const [undo, setUndo] = useState<Memory>();
  const [confirm, setConfirm] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function remove(id: string) {
    const deleted = await deleteMemory(db, id);
    setUndo(deleted);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setUndo(undefined), UNDO_MS);
  }

  if (!memories) return null;
  const list = [...memories].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="stack" style={{ gap: 'var(--s4)' }}>
      {/* Vuelve atrás en el historial (no abre el chat otra vez): si no, «Atrás» alternaba chat y memoria sin fin */}
      <Link
        to="/chat"
        className="btn btn-ghost"
        style={{ alignSelf: 'flex-start', paddingLeft: 0 }}
        onClick={(e) => {
          if (((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0) {
            e.preventDefault();
            void navigate(-1);
          }
        }}
      >
        <span aria-hidden="true">‹</span> {t('chat.title')}
      </Link>
      <h1>{t('memory.title')}</h1>
      <p className="muted">{t('memory.intro', { max: MEMORY_MAX })}</p>

      {undo && (
        <div className="banner row" role="status">
          <p className="grow small">{t('memory.deleted')}</p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              void restoreMemory(db, undo);
              setUndo(undefined);
            }}
          >
            {t('memory.undo')}
          </button>
        </div>
      )}

      <Panel className="stack">
        {list.length === 0 ? (
          <p className="muted">{t('memory.empty')}</p>
        ) : (
          <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 'var(--s2)' }}>
            {list.map((m) => (
              <li key={m.id} className="row memory-note">
                <div className="grow stack" style={{ gap: 2 }}>
                  <p>{m.text}</p>
                  <p className="small muted">
                    {dayMonth(toLocalDate(new Date(m.updatedAt)))}
                    {m.source === 'user' && <span className="chip chip-muted" style={{ marginLeft: 'var(--s2)' }}>{t('memory.asked')}</span>}
                  </p>
                </div>
                <button type="button" className="btn btn-ghost btn-icon" aria-label={`${t('memory.delete')}: ${m.text}`} onClick={() => void remove(m.id)}>
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {list.length > 0 &&
        (confirm ? (
          <div className="banner stack" role="alertdialog" aria-label={t('memory.clearAll')}>
            <p>{t('memory.clearAllConfirm')}</p>
            <div className="row">
              <button type="button" className="btn grow" onClick={() => setConfirm(false)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn btn-danger grow" onClick={() => void clearMemories(db).then(() => setConfirm(false))}>
                {t('memory.clearAllYes')}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-ghost" style={{ alignSelf: 'center' }} onClick={() => setConfirm(true)}>
            {t('memory.clearAll')}
          </button>
        ))}
    </div>
  );
}
