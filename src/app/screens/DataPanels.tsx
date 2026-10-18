import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { deleteAllData, parseBackup, replaceAllData, type Backup, type BackupSummary } from '../../data/backup';
import { backupErrorText, exportData } from '../backupActions';
import { useData, useSettings } from '../data';
import { Panel } from '../design/components';
import { daysAgoText, fullDate } from '../text';
import { t } from '../../i18n';

type ImportState =
  | { stage: 'idle' }
  | { stage: 'error'; message: string }
  | { stage: 'confirm'; backup: Backup; summary: BackupSummary }
  | { stage: 'done' };

/** Ajustes → Copia de seguridad (BAK-01 a BAK-06). */
export function BackupPanel() {
  const ctx = useData();
  const settings = useSettings();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [exportMessage, setExportMessage] = useState<string>();
  const [state, setState] = useState<ImportState>({ stage: 'idle' });

  const last = settings?.lastBackupAt;
  const lastText = last
    ? t('backup.lastCopy', { ago: daysAgoText(Math.floor((ctx.now().getTime() - Date.parse(last)) / 86_400_000)) })
    : t('backup.noCopy');

  async function onExport() {
    setBusy(true);
    try {
      const result = await exportData(ctx);
      setExportMessage(result === 'cancelled' ? t('backup.cancelled') : t('backup.exported'));
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const result = parseBackup(await file.text());
    setState(
      result.ok
        ? { stage: 'confirm', backup: result.backup, summary: result.summary }
        : { stage: 'error', message: backupErrorText(result.error) },
    );
    if (input.current) input.current.value = '';
  }

  async function onReplace(backup: Backup) {
    setBusy(true);
    try {
      await replaceAllData(ctx, backup);
      setState({ stage: 'done' });
    } catch {
      setState({ stage: 'error', message: t('backup.importFailed') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="stack">
      <h2>{t('backup.title')}</h2>
      <p className="small muted">{lastText}</p>
      <p className="small">{t('backup.explanation')}</p>
      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onExport()}>
        {t('backup.export')}
      </button>
      {exportMessage && (
        <p role="status" className="small" style={{ color: 'var(--success)' }}>
          {exportMessage}
        </p>
      )}

      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        id="import-file"
        aria-label={t('backup.fileLabel')}
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <button type="button" className="btn" disabled={busy} onClick={() => input.current?.click()}>
        {t('backup.import')}
      </button>

      {state.stage === 'error' && (
        <p role="alert" className="field-error">
          {state.message}
        </p>
      )}
      {state.stage === 'done' && (
        <p role="status" style={{ color: 'var(--success)' }}>
          {t('backup.imported')}
        </p>
      )}
      {state.stage === 'confirm' && (
        <div
          className="banner stack"
          role="alertdialog"
          aria-labelledby="import-title"
          style={{ alignItems: 'stretch' }}
        >
          <h3 id="import-title">{t('backup.replaceTitle')}</h3>
          <p className="small">
            {t('backup.summary', {
              date: fullDate(new Date(state.summary.exportedAt)),
              activities: t('backup.activities', { count: state.summary.activities }),
              completions: t('backup.completions', { count: state.summary.completions }),
            })}
          </p>
          <p className="small">{t('backup.replaceWarning')}</p>
          <button type="button" className="btn" disabled={busy} onClick={() => void onExport()}>
            {t('backup.exportFirst')}
          </button>
          <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void onReplace(state.backup)}>
            {t('backup.replace')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setState({ stage: 'idle' })}>
            {t('common.cancel')}
          </button>
        </div>
      )}
    </Panel>
  );
}

/** Ajustes → Eliminar todos mis datos (DEL-01). */
export function DeletePanel() {
  const ctx = useData();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const word = t('deleteData.word');

  async function onDelete() {
    if (text.trim() !== word) {
      setError(t('deleteData.typeToConfirm', { word }));
      return;
    }
    await deleteAllData(ctx);
    navigate('/', { replace: true });
  }

  return (
    <Panel className="stack">
      <h2>{t('deleteData.title')}</h2>
      {!open ? (
        <button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>
          {t('deleteData.open')}
        </button>
      ) : (
        <>
          <p className="small">{t('deleteData.warning')}</p>
          <div className="field">
            <label htmlFor="delete-confirm">{t('deleteData.typeToConfirm', { word })}</label>
            <input
              id="delete-confirm"
              type="text"
              autoComplete="off"
              value={text}
              aria-invalid={!!error}
              aria-describedby={error ? 'delete-error' : undefined}
              onChange={(e) => {
                setText(e.target.value);
                setError(undefined);
              }}
            />
            {error && (
              <p id="delete-error" className="field-error">
                {error}
              </p>
            )}
          </div>
          <div className="row">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn btn-danger grow" onClick={() => void onDelete()}>
              {t('common.delete')}
            </button>
          </div>
        </>
      )}
    </Panel>
  );
}
