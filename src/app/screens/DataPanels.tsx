import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { deleteAllData, parseBackup, replaceAllData, type Backup, type BackupSummary } from '../../data/backup';
import { backupErrorText, exportData } from '../backupActions';
import { useData, useSettings } from '../data';
import { Panel } from '../design/components';
import { daysAgoText } from '../text';

const LONG_DATE = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' });

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
    ? `Última copia: ${daysAgoText(Math.floor((ctx.now().getTime() - Date.parse(last)) / 86_400_000))}`
    : 'Aún no has hecho ninguna copia.';

  async function onExport() {
    setBusy(true);
    try {
      const result = await exportData(ctx);
      setExportMessage(result === 'cancelled' ? 'Exportación cancelada.' : 'Copia exportada.');
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const result = parseBackup(await file.text());
    setState(result.ok ? { stage: 'confirm', backup: result.backup, summary: result.summary } : { stage: 'error', message: backupErrorText(result.error) });
    if (input.current) input.current.value = '';
  }

  async function onReplace(backup: Backup) {
    setBusy(true);
    try {
      await replaceAllData(ctx, backup);
      setState({ stage: 'done' });
    } catch {
      setState({ stage: 'error', message: 'No se pudo importar. Tus datos no han cambiado.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="stack">
      <h2>Copia de seguridad</h2>
      <p className="small muted">{lastText}</p>
      <p className="small">
        Tus datos solo están en este dispositivo. Exporta una copia y guárdala fuera del navegador. El archivo contiene
        tus actividades en texto legible: guárdalo en un lugar privado.
      </p>
      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onExport()}>
        Exportar copia
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
        aria-label="Archivo de copia de seguridad"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <button type="button" className="btn" disabled={busy} onClick={() => input.current?.click()}>
        Importar copia
      </button>

      {state.stage === 'error' && (
        <p role="alert" className="field-error">
          {state.message}
        </p>
      )}
      {state.stage === 'done' && (
        <p role="status" style={{ color: 'var(--success)' }}>
          Datos importados.
        </p>
      )}
      {state.stage === 'confirm' && (
        <div className="banner stack" role="alertdialog" aria-labelledby="import-title" style={{ alignItems: 'stretch' }}>
          <h3 id="import-title">¿Reemplazar tus datos?</h3>
          <p className="small">
            Exportado el {LONG_DATE.format(new Date(state.summary.exportedAt))} · {state.summary.activities}{' '}
            {state.summary.activities === 1 ? 'actividad' : 'actividades'} · {state.summary.completions}{' '}
            {state.summary.completions === 1 ? 'registro' : 'registros'}
          </p>
          <p className="small">Reemplazará todos tus datos actuales.</p>
          <button type="button" className="btn" disabled={busy} onClick={() => void onExport()}>
            Exportar mis datos actuales primero
          </button>
          <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void onReplace(state.backup)}>
            Reemplazar
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setState({ stage: 'idle' })}>
            Cancelar
          </button>
        </div>
      )}
    </Panel>
  );
}

const CONFIRM_WORD = 'BORRAR';

/** Ajustes → Eliminar todos mis datos (DEL-01). */
export function DeletePanel() {
  const ctx = useData();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();

  async function onDelete() {
    if (text.trim() !== CONFIRM_WORD) {
      setError(`Escribe ${CONFIRM_WORD} para confirmar`);
      return;
    }
    await deleteAllData(ctx);
    navigate('/', { replace: true });
  }

  return (
    <Panel className="stack">
      <h2>Eliminar datos</h2>
      {!open ? (
        <button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>
          Eliminar todos mis datos
        </button>
      ) : (
        <>
          <p className="small">Se borrarán todas tus actividades y registros de este dispositivo. No se puede deshacer.</p>
          <div className="field">
            <label htmlFor="delete-confirm">Escribe {CONFIRM_WORD} para confirmar</label>
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
              Cancelar
            </button>
            <button type="button" className="btn btn-danger grow" onClick={() => void onDelete()}>
              Eliminar
            </button>
          </div>
        </>
      )}
    </Panel>
  );
}
