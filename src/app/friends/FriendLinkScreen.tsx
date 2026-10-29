// Abrir un enlace de amistad `/a/:id` (spec 15, AM-02, IN-05, EN-03): «{alias} quiere ser tu amigo» con Aceptar y
// Rechazar. Sin cuenta se ofrece crearla y después aparece la invitación; en Safari de iPhone, cómo llevarlo a la app.
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { t } from '../../i18n';
import { AccountPanel, errorText } from '../account/AccountPanel';
import { accountsEnabled, type DeviceAccount } from '../account/account';
import { useSettings } from '../data';
import { Panel } from '../design/components';
import { intText } from '../text';
import { acceptLink, iosBrowser, linkProfile, type LinkProfile } from './friends';

export function FriendLinkScreen() {
  const { id = '' } = useParams();
  const settings = useSettings();
  if (!settings) return null;
  if (!accountsEnabled()) return <Navigate to="/hoy" replace />;
  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      {iosBrowser() && <OpenInApp />}
      {settings.account ? (
        <Invitation account={settings.account} id={id} />
      ) : (
        <>
          <p>{t('friends.linkNeedAccount')}</p>
          <AccountPanel />
        </>
      )}
    </div>
  );
}

function Invitation({ account, id }: { account: DeviceAccount; id: string }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<LinkProfile | 'unavailable'>();
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  useEffect(() => {
    let live = true;
    linkProfile(account, id).then(
      (p) => live && setProfile(p),
      (e) => live && (e?.status === 404 ? setProfile('unavailable') : setError(errorText(e))),
    );
    return () => {
      live = false;
    };
  }, [account, id]);

  const toFriends = <Link to="/perfil/amigos" className="btn">{t('friends.title')}</Link>;
  if (error)
    return (
      <Panel className="stack">
        <p role="alert">{error}</p>
        {toFriends}
      </Panel>
    );
  if (!profile) return <p className="muted">{t('friends.loading')}</p>;
  if (profile === 'unavailable')
    return (
      <Panel className="stack">
        <h1>{t('friends.unavailable')}</h1>
        {toFriends}
      </Panel>
    );
  if (profile.self)
    return (
      <Panel className="stack">
        <h1>{t('friends.ownLink')}</h1>
        {toFriends}
      </Panel>
    );
  if (profile.friend || done)
    return (
      <Panel className="stack">
        <h1>{t('friends.nowFriends', { alias: profile.alias })}</h1>
        {toFriends}
      </Panel>
    );
  return (
    <Panel className="stack">
      <h1>{t('friends.wants', { alias: profile.alias })}</h1>
      <p className="muted">{t('friends.level', { level: intText(profile.level) })}</p>
      <div className="row">
        {/* Rechazar no avisa a la otra persona (AM-02) */}
        <button type="button" className="btn grow" onClick={() => navigate('/perfil/amigos')}>
          {t('friends.reject')}
        </button>
        <button
          type="button"
          className="btn btn-primary grow"
          onClick={async () => {
            try {
              await acceptLink(account, id);
              setDone(true);
            } catch (e) {
              setError(errorText(e));
            }
          }}
        >
          {t('friends.accept')}
        </button>
      </div>
    </Panel>
  );
}

/** En Safari de iPhone el enlace no llega a la app instalada (EN-03, R15-1). */
function OpenInApp() {
  const [copied, setCopied] = useState(false);
  return (
    <Panel className="stack">
      <p className="small">{t('friends.openInApp')}</p>
      <button
        type="button"
        className="btn"
        onClick={async () => {
          await navigator.clipboard.writeText(location.href);
          setCopied(true);
        }}
      >
        {copied ? t('friends.copied') : t('friends.copyLink')}
      </button>
    </Panel>
  );
}
