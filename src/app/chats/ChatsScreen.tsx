// Mensajes (spec 17, ME): la lista de conversaciones y el contacto «??? · Señal desconocida» con sus transmisiones.
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { saveSetting } from '../../data/repository';
import { COMPANION_NAME } from '../../domain/arvid/companion';
import { seenSessions, signalUnread, storyOn, voiceFor } from '../../domain/origen/origen';
import { getLocale, t, useLocale } from '../../i18n';
import { useData, useSettings } from '../data';
import { BackLink, Panel } from '../design/components';
import { CompanionPreview } from '../scene/Scene';
import { dayMonth } from '../text';
import { toLocalDate } from '../../domain/time/localDate';
import { loadSignalAssets, type SignalAssets } from '../origen/assets';
import { SignalOverlay } from '../origen/SignalOverlay';
import { DEFAULT_AVATAR } from '../../domain/avatar/catalog';

/** ME-01: arriba el compañero; después, «???». Sin la historia en marcha, el chat del compañero directamente. */
export function ChatsScreen() {
  useLocale();
  const settings = useSettings();
  if (!settings) return null;
  const origen = settings.origen;
  if (!storyOn(origen)) return <Navigate to="/chat" replace />;
  const last = settings.chatLog?.filter((e) => !e.kind).at(-1);
  const sessions = seenSessions(origen);
  const lastSession = sessions.at(-1);
  return (
    <div className="stack" style={{ gap: 'var(--s4)' }}>
      <BackLink to="/hoy" label={t('nav.today')} />
      <h1>{t('origen.chats.title')}</h1>
      <Panel>
        <Link to="/chat" className="chats-row">
          <CompanionPreview size={40} />
          <div className="grow">
            <p className="pixel">{COMPANION_NAME[settings.companion]}</p>
            <p className="small muted chats-last">{last?.text ?? t('origen.chats.companionRole')}</p>
          </div>
        </Link>
        <Link to="/mensajes/senal" className="chats-row">
          <span className="chats-unknown" aria-hidden="true">
            ?
          </span>
          <div className="grow">
            <p className="pixel">{t('origen.name')}</p>
            <p className="small muted chats-last">
              {t('origen.chats.signalRole')}
              {lastSession && ` · ${t('origen.chats.session', { n: lastSession.n })}`}
            </p>
          </div>
          {signalUnread(origen) && <span className="chats-dot" role="img" aria-label={t('origen.chats.unread')} />}
        </Link>
      </Panel>
    </div>
  );
}

/** «??? · Señal desconocida» (ME-08): una tarjeta por sesión, que la vuelve a reproducir (TR-08); sin campo de escribir. */
export function SignalChatScreen() {
  useLocale();
  const { db } = useData();
  const settings = useSettings();
  const [playing, setPlaying] = useState<{ assets: SignalAssets }>();
  const origen = settings?.origen;
  const sessions = seenSessions(origen);
  const lastAt = sessions.at(-1)?.at;

  // Al abrirlo, queda leído (CA-03)
  useEffect(() => {
    if (!settings || !lastAt || (origen?.read?.signal ?? '') >= lastAt) return;
    void saveSetting(db, 'origen', { ...origen, read: { ...origen?.read, signal: lastAt } });
  }, [db, settings, origen, lastAt]);

  if (!settings) return null;
  if (!storyOn(origen)) return <Navigate to="/chat" replace />;
  const voice = voiceFor(getLocale(), settings.profile?.gender, (settings.avatar ?? DEFAULT_AVATAR).cast);

  return (
    <div className="stack" style={{ gap: 'var(--s4)' }}>
      <BackLink to="/mensajes" label={t('origen.chats.title')} />
      <div className="row" style={{ gap: 'var(--s3)' }}>
        <span className="chats-unknown" aria-hidden="true">
          ?
        </span>
        <div>
          <h1 style={{ margin: 0 }}>{t('origen.name')}</h1>
          <p className="small muted">{t('origen.chats.signalRole')}</p>
        </div>
      </div>
      <div className="stack" style={{ gap: 'var(--s2)' }}>
        {sessions.map((s) => (
          <button
            key={s.n}
            type="button"
            className="signal-card"
            aria-label={`${t('origen.chats.watch')}: ${t('origen.chats.session', { n: s.n })}`}
            onClick={() => void loadSignalAssets(s.n, voice).then((assets) => setPlaying({ assets }))}
          >
            <span>
              {t('origen.chats.session', { n: s.n })}
              <br />
              <span className="small muted">{dayMonth(toLocalDate(new Date(s.at)))}</span>
            </span>
            <span className="signal-tag">
              <i />
              {t('origen.tag')}
            </span>
          </button>
        ))}
      </div>
      <p className="signal-noreply small muted">{t('origen.chats.noReply')}</p>
      {playing && <SignalOverlay mode="replay" voice={voice} assets={playing.assets} onDone={() => setPlaying(undefined)} />}
    </div>
  );
}
