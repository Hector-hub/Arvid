// Ajustes → Cuenta (spec 14, §4.1 a §4.5): crear la cuenta, entrar en un dispositivo nuevo, estado de la copia,
// conflicto entre dispositivos y gestionar la cuenta. Oculto hasta la 2.0 (S14-06).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { getLocale, t, type TKey } from '../../i18n';
import { useData, useSettings } from '../data';
import { Panel } from '../design/components';
import {
  AccountError,
  accountsEnabled,
  addPasskey,
  createAccount,
  deleteAccount,
  passkeysAvailable,
  recoveryKeyFile,
  restore,
  rotateRecoveryKey,
  signInWithPasskey,
  signInWithRecoveryKey,
  signOut,
  uploadBackup,
  useCloud,
  keepCloudCopy,
  type DeviceAccount,
  type NeedsRecoveryKey,
} from './account';

/** Mensaje para un error de la cuenta o de la passkey (cancelar el diálogo del sistema no es un error grave). */
export function errorText(e: unknown): string {
  if (e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'AbortError')) return t('account.errors.cancelled');
  const code = e instanceof AccountError ? e.code : 'failed';
  const key = `account.errors.${code}` as TKey;
  const text = t(key);
  return text === key ? t('account.errors.failed') : text;
}

function ago(at: string): string {
  const minutes = Math.round((Date.now() - Date.parse(at)) / 60_000);
  const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  if (minutes < 60 * 24) return rtf.format(-Math.round(minutes / 60), 'hour');
  return rtf.format(-Math.round(minutes / 1440), 'day');
}

export function AccountPanel() {
  const settings = useSettings();
  // Las hojas viven aquí y no dentro de cada estado: al crear la cuenta o entrar, el panel cambia de «sin cuenta» a
  // «con cuenta» y, si no, se cerrarían antes de mostrar la clave o el resultado
  const [key, setKey] = useState<string>();
  const [signIn, setSignIn] = useState(false);
  if (!settings || !accountsEnabled()) return null;
  const alias = settings.account?.alias ?? settings.profile?.alias ?? 'ARVID';
  return (
    <Panel className="stack">
      <h2>{t('account.title')}</h2>
      {settings.account ? (
        <SignedIn account={settings.account} onKey={setKey} />
      ) : (
        <SignedOut alias={alias} onKey={setKey} onSignIn={() => setSignIn(true)} />
      )}
      {key && <RecoveryKeySheet recoveryKey={key} alias={alias} onDone={() => setKey(undefined)} />}
      {signIn && <SignInSheet onClose={() => setSignIn(false)} />}
    </Panel>
  );
}

function SignedOut({ alias, onKey, onSignIn }: { alias: string; onKey: (key: string) => void; onSignIn: () => void }) {
  const ctx = useData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  const passkeys = passkeysAvailable();

  async function create() {
    setBusy(true);
    setError(undefined);
    try {
      onKey((await createAccount(ctx, alias, passkeys)).recoveryKey);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="small muted">{t('account.intro')}</p>
      {!passkeys && <p className="small muted">{t('account.noPasskeys')}</p>}
      <button type="button" className="btn btn-primary" disabled={busy || !online} onClick={() => void create()}>
        {passkeys ? t('account.create') : t('account.createRecovery')}
      </button>
      <button type="button" className="btn" disabled={busy || !online} onClick={onSignIn}>
        {t('account.haveAccount')}
      </button>
      {!online && <p className="small field-error">{t('account.needsConnection')}</p>}
      {error && (
        <p role="alert" className="small field-error">
          {error}
        </p>
      )}
      <p className="small muted">{t('account.privacy')}</p>
    </>
  );
}

function SignedIn({ account, onKey }: { account: DeviceAccount; onKey: (key: string) => void }) {
  const ctx = useData();
  const cloud = useCloud();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState<'signOut' | 'delete'>();

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const status = cloud.uploading
    ? t('account.statusUploading')
    : cloud.error === 'offline'
      ? t('account.statusOffline')
      : cloud.error === 'too-big'
        ? t('account.statusTooBig')
        : cloud.error === 'failed'
          ? t('account.statusFailed')
          : cloud.dirty || !cloud.uploadedAt
            ? t('account.statusPending')
            : t('account.statusOk', { when: ago(cloud.uploadedAt) });

  return (
    <>
      <p>{t('account.signedAs', { alias: account.alias })}</p>
      <p className="small muted" role="status">
        {status}
      </p>
      {cloud.conflict ? (
        <div className="banner stack" style={{ alignItems: 'stretch' }}>
          <p className="pixel">{t('account.conflictTitle')}</p>
          <p className="small">{t('account.conflictText')}</p>
          <button type="button" className="btn" disabled={busy} onClick={() => void run(() => uploadBackup(ctx, account, { force: true }))}>
            {t('account.conflictMine')}
          </button>
          <button type="button" className="btn" disabled={busy} onClick={() => void run(() => keepCloudCopy(ctx, account))}>
            {t('account.conflictCloud')}
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-primary" disabled={busy || cloud.uploading} onClick={() => void run(() => uploadBackup(ctx, account))}>
          {t('account.uploadNow')}
        </button>
      )}
      <button type="button" className="btn" disabled={busy} onClick={() => void run(async () => onKey(await rotateRecoveryKey(account)))}>
        {t('account.newRecovery')}
      </button>
      {account.viaRecovery && passkeysAvailable() && (
        <button type="button" className="btn" disabled={busy} onClick={() => void run(() => addPasskey(ctx, account))}>
          {t('account.addPasskey')}
        </button>
      )}
      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setConfirm('signOut')}>
        {t('account.signOut')}
      </button>
      <button type="button" className="btn btn-danger" disabled={busy} onClick={() => setConfirm('delete')}>
        {t('account.delete')}
      </button>
      {error && (
        <p role="alert" className="small field-error">
          {error}
        </p>
      )}
      <p className="small muted">{t('account.privacy')}</p>
      {confirm && (
        <Confirm
          title={confirm === 'signOut' ? t('account.signOut') : t('account.delete')}
          text={confirm === 'signOut' ? t('account.signOutConfirm') : t('account.deleteConfirm')}
          yes={confirm === 'signOut' ? t('account.signOut') : t('account.deleteYes')}
          danger={confirm === 'delete'}
          onCancel={() => setConfirm(undefined)}
          onYes={() => {
            setConfirm(undefined);
            void run(() => (confirm === 'signOut' ? signOut(ctx) : deleteAccount(ctx, account)));
          }}
        />
      )}
    </>
  );
}

/** Hoja flotante sobre todo (portal), como las de la app. */
export function Sheet({ label, children, onClose }: { label: string; children: ReactNode; onClose?: () => void }) {
  useEffect(() => {
    if (!onClose) return;
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onClose]);
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="panel sheet stack" role="dialog" aria-modal="true" aria-label={label} style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Confirm({ title, text, yes, danger, onYes, onCancel }: { title: string; text: string; yes: string; danger?: boolean; onYes: () => void; onCancel: () => void }) {
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => cancel.current?.focus(), []);
  return (
    <Sheet label={title} onClose={onCancel}>
      <h2>{title}</h2>
      <p>{text}</p>
      <div className="row">
        <button ref={cancel} type="button" className="btn grow" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button type="button" className={`btn grow ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onYes}>
          {yes}
        </button>
      </div>
    </Sheet>
  );
}

/** La clave de recuperación, una sola vez, y no se puede seguir sin marcar que se guardó (CU-02). */
export function RecoveryKeySheet({ recoveryKey, alias, onDone }: { recoveryKey: string; alias: string; onDone: () => void }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  function download() {
    const url = URL.createObjectURL(recoveryKeyFile(recoveryKey, alias));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ARVID-clave-de-recuperacion.txt';
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Sheet label={t('account.keyTitle')}>
      <h2>{t('account.keyTitle')}</h2>
      <p className="small">{t('account.keyText')}</p>
      <p className="recovery-key pixel" aria-label={t('account.keyLabel')}>
        {recoveryKey}
      </p>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn"
          onClick={() => void navigator.clipboard?.writeText(recoveryKey).then(() => setCopied(true))}
        >
          {copied ? t('account.copied') : t('account.copy')}
        </button>
        <button type="button" className="btn" onClick={download}>
          {t('account.saveFile')}
        </button>
      </div>
      <label className="choice">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        <span className="grow">{t('account.saved')}</span>
      </label>
      <button type="button" className="btn btn-primary" disabled={!saved} onClick={onDone}>
        {t('account.continue')}
      </button>
    </Sheet>
  );
}

/** «Ya tengo cuenta» (RC-01 a RC-06): con la passkey o con la clave; si este teléfono tiene datos, se confirma antes. */
export function SignInSheet({ onClose, onRestored }: { onClose: () => void; onRestored?: () => void }) {
  const ctx = useData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [text, setText] = useState('');
  const [needs, setNeeds] = useState<NeedsRecoveryKey>();
  const [pending, setPending] = useState<DeviceAccount>();
  const [done, setDone] = useState<string>();

  async function finish(account: DeviceAccount) {
    const hasData = (await ctx.db.activities.count()) > 0 || (await ctx.db.missions.count()) > 0;
    if (hasData) {
      setPending(account);
      return;
    }
    await apply(account);
  }

  async function apply(account: DeviceAccount) {
    setPending(undefined);
    const result = await restore(ctx, account);
    setDone(result === 'restored' ? t('account.restored') : t('account.emptyRestored'));
    onRestored?.();
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const withPasskey = () =>
    run(async () => {
      const result = await signInWithPasskey();
      if ('needsKey' in result) setNeeds(result);
      else await finish({ ...result.account, dataKey: result.dataKey });
    });

  const withKey = () =>
    run(async () => {
      const { account, dataKey } = await signInWithRecoveryKey(text, needs?.login);
      await finish({ ...account, dataKey });
    });

  if (done)
    return (
      <Sheet label={t('account.signInTitle')} onClose={onClose}>
        <p role="status">{done}</p>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {t('account.continue')}
        </button>
      </Sheet>
    );

  if (pending)
    return (
      <Sheet label={t('account.replaceTitle')} onClose={onClose}>
        <h2>{t('account.replaceTitle')}</h2>
        <p>{t('account.replaceText')}</p>
        <div className="row">
          <button type="button" className="btn grow" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-primary grow" disabled={busy} onClick={() => void run(() => apply(pending))}>
            {t('account.replaceYes')}
          </button>
        </div>
      </Sheet>
    );

  return (
    <Sheet label={t('account.signInTitle')} onClose={onClose}>
      <h2>{t('account.signInTitle')}</h2>
      {needs ? (
        <p className="small">{t('account.needKey')}</p>
      ) : (
        passkeysAvailable() && (
          <>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void withPasskey()}>
              {t('account.signInPasskey')}
            </button>
            <p className="small muted">{t('account.orKey')}</p>
          </>
        )
      )}
      <label className="field">
        <span>{t('account.keyLabel')}</span>
        <input
          type="text"
          value={text}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="ARVID-XXXX-…"
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <button type="button" className="btn" disabled={busy || text.trim().length < 20} onClick={() => void withKey()}>
        {t('account.signInKey')}
      </button>
      {error && (
        <p role="alert" className="small field-error">
          {error}
        </p>
      )}
      <button type="button" className="btn btn-ghost" onClick={onClose}>
        {t('common.cancel')}
      </button>
    </Sheet>
  );
}
