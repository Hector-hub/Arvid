// Perfil → Amigos (spec 15, §3.1 y EN-03): invitar con un enlace, «Tengo un enlace», solicitudes, lista, eliminar,
// bloquear y desbloquear. Hace falta la cuenta (D-140); sin ella se ofrece crearla aquí mismo.
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { t } from '../../i18n';
import { AccountPanel, Confirm, errorText } from '../account/AccountPanel';
import { accountsEnabled, type DeviceAccount } from '../account/account';
import { BackLink, Panel } from '../design/components';
import { useChallenges, useData, useSettings } from '../data';
import { useToday } from '../clock';
import { inviteFriend } from '../challenges/challenges';
import { challengeStatusText } from '../challenges/ChallengeScreens';

import { intText } from '../text';
import {
  blockFriend,
  friendLink,
  friendCode,
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
  // Buscador (AM-12): por alias o por código, sin distinguir mayúsculas ni acentos
  const [query, setQuery] = useState('');
  const norm = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const q = norm(query);
  const shown = (list?.friends ?? []).filter((f) => !q || norm(f.alias).includes(q) || f.id.toLowerCase().replace(/-/g, '').startsWith(q.replace(/-/g, '')));

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
        <p role="alert" className="field-error">
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
          {list.friends.length > 0 && (
            <input
              type="search"
              value={query}
              placeholder={t('friends.search')}
              aria-label={t('friends.search')}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          {shown.length === 0 && list.friends.length > 0 && <p className="small muted">{t('friends.noMatch')}</p>}
          {/* Cada amigo es una tarjeta que abre su página: retos en común, invitar, eliminar y bloquear (AM-04) */}
          <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 'var(--s2)' }}>
            {shown.map((f) => (
              <li key={f.id}>
                <Link to={`/perfil/amigos/${f.id}`} className="panel row friend-card">
                  <span className="grow stack" style={{ gap: 2 }}>
                    <span>
                      <strong>{f.alias}</strong> <span className="muted small">· {t('friends.level', { level: intText(f.level) })}</span>
                    </span>
                    <span className="small muted">
                      {t('friends.code', { code: friendCode(f.id) })} · {t('friends.together', { count: f.together })}
                    </span>
                  </span>
                  <span aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>
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
          <p role="alert" className="field-error">
            {t('friends.badLink')}
          </p>
        )}
      </form>
    </Panel>
  );
}

/** «Invitar a un reto» desde un amigo (AM-04, IN-01): los retos tuyos que aún admiten gente. */
function InviteToChallenge({ account, friend }: { account: DeviceAccount; friend: FriendCard }) {
  const ctx = useData();
  const today = useToday();
  const challenges = useChallenges() ?? [];
  const [sent, setSent] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const open = challenges.filter((l) => !l.left && !l.view.challenge.cancelled && today <= l.view.challenge.start && !l.view.participants.some((p) => p.id === friend.id));
  if (open.length === 0)
    return (
      <p className="small muted">
        {t('friends.noOpenChallenges')} <Link to="/retos/nuevo">{t('challenges.new')}</Link>
      </p>
    );
  return (
    <div className="stack" style={{ gap: 'var(--s2)' }}>
      <span className="small muted">{t('friends.inviteTo')}</span>
      {open.map((l) => (
        <button
          key={l.id}
          type="button"
          className="btn"
          disabled={sent.includes(l.id)}
          onClick={async () => {
            try {
              await inviteFriend(ctx, account, l.id, friend.id);
              setSent((s) => [...s, l.id]);
            } catch (e) {
              setError(errorText(e));
            }
          }}
        >
          {sent.includes(l.id) ? t('friends.invited', { name: l.view.challenge.name }) : l.view.challenge.name}
        </button>
      ))}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** Un amigo (AM-04): alias, nivel, código, los retos que tenéis en común, invitar a un reto, eliminar y bloquear. */
export function FriendScreen() {
  const { id = '' } = useParams();
  const settings = useSettings();
  const today = useToday();
  const navigate = useNavigate();
  const challenges = useChallenges() ?? [];
  const [friend, setFriend] = useState<FriendsList['friends'][number] | 'missing'>();
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState<'remove' | 'block'>();
  const account = settings?.account;
  useEffect(() => {
    if (!account) return;
    let live = true;
    loadFriends(account).then(
      (l) => live && setFriend(l.friends.find((f) => f.id === id) ?? 'missing'),
      (e) => live && setError(errorText(e)),
    );
    return () => {
      live = false;
    };
  }, [account, id]);
  if (!settings) return null;
  if (!account || friend === 'missing') return <Navigate to="/perfil/amigos" replace />;
  // Retos en común: los que tengo en el dispositivo donde también participa
  const together = challenges
    .filter((l) => l.view.participants.some((p) => p.id === id))
    .sort((a, b) => b.view.challenge.start.localeCompare(a.view.challenge.start));
  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <BackLink to="/perfil/amigos" label={t('friends.title')} />
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {!friend ? (
        <p className="muted">{t('friends.loading')}</p>
      ) : (
        <>
          <header className="stack" style={{ gap: 'var(--s1)' }}>
            <h1>
              {friend.alias} <span className="muted small">· {t('friends.level', { level: intText(friend.level) })}</span>
            </h1>
            <p className="small muted">{t('friends.code', { code: friendCode(friend.id) })}</p>
          </header>
          <Panel className="stack">
            <h2>{t('friends.togetherTitle')}</h2>
            {together.length === 0 && <p className="muted">{t('friends.noTogether')}</p>}
            <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {together.map((l) => (
                <li key={l.id}>
                  <Link to={`/retos/${l.id}`} className="row" style={{ color: 'var(--text)', textDecoration: 'none' }}>
                    <span className="grow stack" style={{ gap: 0 }}>
                      <span>{l.view.challenge.name}</span>
                      <span className="small muted">
                        {t(`challenges.mode.${l.view.challenge.mode}`)} · {challengeStatusText(l.view, today)}
                      </span>
                    </span>
                    <span aria-hidden="true">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel className="stack">
            <InviteToChallenge account={account} friend={friend} />
          </Panel>
          <div className="row">
            <button type="button" className="btn grow" onClick={() => setConfirm('remove')}>
              {t('friends.remove')}
            </button>
            <button type="button" className="btn btn-danger grow" onClick={() => setConfirm('block')}>
              {t('friends.block')}
            </button>
          </div>
          {confirm && (
            <Confirm
              title={t(confirm === 'remove' ? 'friends.removeTitle' : 'friends.blockTitle', { alias: friend.alias })}
              text={t(confirm === 'remove' ? 'friends.removeText' : 'friends.blockText')}
              yes={t(confirm === 'remove' ? 'friends.remove' : 'friends.block')}
              danger
              onCancel={() => setConfirm(undefined)}
              onYes={async () => {
                const kind = confirm;
                setConfirm(undefined);
                try {
                  await (kind === 'remove' ? removeFriend : blockFriend)(account, friend.id);
                  navigate('/perfil/amigos', { replace: true });
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
