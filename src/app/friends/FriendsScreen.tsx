// Perfil → Amigos (spec 15, §3.1 y EN-03): invitar con un enlace, «Tengo un enlace», solicitudes, lista, eliminar,
// bloquear y desbloquear. Hace falta la cuenta (D-140); sin ella se ofrece crearla aquí mismo.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { t } from '../../i18n';
import { AccountPanel, Confirm, errorText } from '../account/AccountPanel';
import { accountsEnabled, type DeviceAccount } from '../account/account';
import { useSettings } from '../data';
import { BackLink, Panel } from '../design/components';
import { intText } from '../text';
import {
  blockFriend,
  friendLink,
  linkPath,
  loadFriends,
  removeFriend,
  respondRequest,
  shareLink,
  unblockFriend,
  type FriendCard,
  type FriendsList,
} from './friends';

export function FriendsScreen() {
  const settings = useSettings();
  if (!settings) return null;
  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <BackLink to="/perfil" label={t('nav.profile')} />
      <h1>{t('friends.title')}</h1>
      {!accountsEnabled() ? null : settings.account ? (
        <Friends account={settings.account} />
      ) : (
        <>
          <p className="muted">{t('friends.needAccount')}</p>
          <AccountPanel />
        </>
      )}
    </div>
  );
}

function Friends({ account }: { account: DeviceAccount }) {
  const [list, setList] = useState<FriendsList>();
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState<string>();
  const [confirm, setConfirm] = useState<{ kind: 'remove' | 'block'; friend: FriendCard }>();

  const [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    loadFriends(account).then(
      (l) => {
        if (!live) return;
        setList(l);
        setError(undefined);
      },
      (e) => live && setError(errorText(e)),
    );
    return () => {
      live = false;
    };
  }, [account, version]);

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setVersion((v) => v + 1);
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <>
      <InvitePanel account={account} />
      {error && (
        <p role="alert" className="small" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
      {list && list.requests.length > 0 && (
        <Panel className="stack">
          <h2>{t('friends.requests')}</h2>
          {list.requests.map((r) => (
            <div key={r.id} className="row">
              <span className="grow">
                {t('friends.wants', { alias: r.alias })} <span className="muted small">· {t('friends.level', { level: intText(r.level) })}</span>
              </span>
              <button type="button" className="btn" onClick={() => act(() => respondRequest(account, r.id, false))}>
                {t('friends.reject')}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => act(() => respondRequest(account, r.id, true))}>
                {t('friends.accept')}
              </button>
            </div>
          ))}
        </Panel>
      )}
      {list && (
        <Panel className="stack">
          <h2>{t('friends.list', { count: list.friends.length })}</h2>
          {list.friends.length === 0 && <p className="muted">{t('friends.empty')}</p>}
          {list.friends.map((f) => (
            <div key={f.id} className="stack" style={{ gap: 'var(--s2)' }}>
              <button type="button" className="row btn-ghost btn" aria-expanded={open === f.id} onClick={() => setOpen(open === f.id ? undefined : f.id)}>
                <span className="grow" style={{ textAlign: 'left' }}>
                  {f.alias}
                </span>
                <span className="muted small">
                  {t('friends.level', { level: intText(f.level) })} · {t('friends.together', { count: f.together })}
                </span>
              </button>
              {open === f.id && (
                <div className="row">
                  <button type="button" className="btn grow" onClick={() => setConfirm({ kind: 'remove', friend: f })}>
                    {t('friends.remove')}
                  </button>
                  <button type="button" className="btn btn-danger grow" onClick={() => setConfirm({ kind: 'block', friend: f })}>
                    {t('friends.block')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </Panel>
      )}
      {list && list.blocked.length > 0 && (
        <Panel className="stack">
          <h2>{t('friends.blocked')}</h2>
          {list.blocked.map((b) => (
            <div key={b.id} className="row">
              <span className="grow">{b.alias}</span>
              <button type="button" className="btn" onClick={() => act(() => unblockFriend(account, b.id))}>
                {t('friends.unblock')}
              </button>
            </div>
          ))}
        </Panel>
      )}
      {confirm && (
        <Confirm
          title={t(confirm.kind === 'remove' ? 'friends.removeTitle' : 'friends.blockTitle', { alias: confirm.friend.alias })}
          text={t(confirm.kind === 'remove' ? 'friends.removeText' : 'friends.blockText')}
          yes={t(confirm.kind === 'remove' ? 'friends.remove' : 'friends.block')}
          danger
          onCancel={() => setConfirm(undefined)}
          onYes={() => {
            const { kind, friend } = confirm;
            setConfirm(undefined);
            setOpen(undefined);
            void act(() => (kind === 'remove' ? removeFriend : blockFriend)(account, friend.id));
          }}
        />
      )}
    </>
  );
}

/** Invitar amigos (AM-01) y «Tengo un enlace» (EN-03). */
function InvitePanel({ account }: { account: DeviceAccount }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [text, setText] = useState('');
  const [bad, setBad] = useState(false);
  const go = (value: string) => {
    const path = linkPath(value);
    if (path) navigate(path);
    else setBad(true);
  };
  const paste = async () => {
    try {
      const value = await navigator.clipboard.readText();
      setText(value);
      go(value);
    } catch {
      setBad(true);
    }
  };
  return (
    <Panel className="stack">
      <button
        type="button"
        className="btn btn-primary"
        onClick={async () => setCopied((await shareLink(friendLink(account.id), t('friends.shareText', { alias: account.alias }))) === 'copied')}
      >
        {t('friends.invite')}
      </button>
      {copied && (
        <p className="small" role="status">
          {t('friends.copied')}
        </p>
      )}
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          go(text);
        }}
      >
        <label className="stack small">
          {t('friends.haveLink')}
          <input
            type="url"
            inputMode="url"
            value={text}
            placeholder="https://arvid-app.netlify.app/a/…"
            onChange={(e) => {
              setText(e.target.value);
              setBad(false);
            }}
          />
        </label>
        <div className="row">
          {'clipboard' in navigator && 'readText' in navigator.clipboard && (
            <button type="button" className="btn grow" onClick={paste}>
              {t('friends.paste')}
            </button>
          )}
          <button type="submit" className="btn grow" disabled={!text.trim()}>
            {t('friends.open')}
          </button>
        </div>
        {bad && (
          <p role="alert" className="small" style={{ color: 'var(--danger)' }}>
            {t('friends.badLink')}
          </p>
        )}
      </form>
    </Panel>
  );
}
