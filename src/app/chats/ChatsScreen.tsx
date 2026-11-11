// Mensajes (spec 17, ME): la lista de conversaciones, el contacto «??? · Señal desconocida» con sus transmisiones y
// pruebas, y el chat de cada vecino con los mensajes de la historia.
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { saveSetting } from '../../data/repository';
import { COMPANION_NAME } from '../../domain/arvid/companion';
import { DEFAULT_AVATAR } from '../../domain/avatar/catalog';
import { chatLastAt, chatUnread, neighborContacts, neighborLines, type ChatId } from '../../domain/origen/chapters';
import { seenSessions, storyOn, voiceFor, type OrigenState, type VoiceId } from '../../domain/origen/origen';
import { acceptTest, type ProgramTest } from '../../domain/origen/programTests';
import { dossier, FRAGMENTS_READABLE_FROM, TITLED_CHAPTERS } from '../../domain/origen/dossier';
import { currentChapter } from '../../domain/origen/periods';
import { isNeighbor, neighbor, type NeighborId } from '../../domain/scene/city';
import { toLocalDate } from '../../domain/time/localDate';
import { getLocale, t, tDynamic, useLocale } from '../../i18n';
import { useData, useSettings } from '../data';
import { BackLink, Panel } from '../design/components';
import { CityThumb } from '../city/CityThumb';
import { itemDescription } from '../city/labels';
import { CompanionPreview } from '../scene/Scene';
import { dayMonth } from '../text';
import { loadSignalAssets, type SignalAssets } from '../origen/assets';
import { SignalOverlay } from '../origen/SignalOverlay';
import { testObjective, testNumber, useOriginVars, useTestNames } from '../origen/testText';

const time = (at: string) => new Date(at).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });

/** Al abrir un chat, queda leído hasta su último mensaje (CA-03). */
function useMarkRead(chat: ChatId, origen: OrigenState | undefined) {
  const { db } = useData();
  const last = chatLastAt(origen, chat);
  useEffect(() => {
    if (!origen || !last || (origen.read?.[chat] ?? '') >= last) return;
    void saveSetting(db, 'origen', { ...origen, read: { ...origen.read, [chat]: last } });
  }, [db, origen, chat, last]);
}

/** ME-01: arriba el compañero; después «???» y los vecinos, por último mensaje. Sin la historia, el chat del compañero. */
export function ChatsScreen() {
  useLocale();
  const settings = useSettings();
  if (!settings) return null;
  const origen = settings.origen;
  if (!storyOn(origen)) return <Navigate to="/chat" replace />;
  const last = settings.chatLog?.filter((e) => !e.kind).at(-1);
  const rows: { id: ChatId; at: string }[] = [
    { id: 'signal' as ChatId, at: chatLastAt(origen, 'signal') },
    ...neighborContacts(origen).map((c) => ({ id: c.chat as ChatId, at: c.lastAt })),
  ].sort((a, b) => b.at.localeCompare(a.at));
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
        {/* Expediente ORIGEN (EX-01): fila fija desde el capítulo 2 */}
        {currentChapter(origen) >= 2 && (
          <Link to="/mensajes/expediente" className="chats-row">
            <span className="chats-unknown" aria-hidden="true">
              %
            </span>
            <div className="grow">
              <p className="pixel">{t('origen.dossier.title')}</p>
              <p className="small muted chats-last">{t('origen.dossier.decoded', { percent: dossier(origen).percent })}</p>
            </div>
          </Link>
        )}
        {rows.map(({ id }) => (
          <ChatRow key={id} id={id} origen={origen} />
        ))}
      </Panel>
    </div>
  );
}

function ChatRow({ id, origen }: { id: ChatId; origen: OrigenState | undefined }) {
  const vars = useOriginVars();
  const unread = chatUnread(origen, id);
  if (id === 'signal') {
    const lastSession = seenSessions(origen).at(-1);
    return (
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
        {unread && <span className="chats-dot" role="img" aria-label={t('origen.chats.unread')} />}
      </Link>
    );
  }
  const lastLine = neighborLines(origen, id).at(-1);
  return (
    <Link to={`/mensajes/${id}`} className="chats-row">
      <span className="chats-face" aria-hidden="true">
        <CityThumb item={id} unlocked />
      </span>
      <div className="grow">
        <p className="pixel">{neighbor(id).name}</p>
        <p className="small muted chats-last">{lastLine ? tDynamic(lastLine.key, vars) : itemDescription(id)}</p>
      </div>
      {unread && <span className="chats-dot" role="img" aria-label={t('origen.chats.unread')} />}
    </Link>
  );
}

/** Chat de un vecino (ME-03, ME-04): lo de la historia, con las respuestas del compañero por ti. Sin campo de escribir hasta la 2.7.0. */
export function NeighborChatScreen() {
  useLocale();
  const { chat } = useParams();
  const settings = useSettings();
  const origen = settings?.origen;
  const id = (chat && isNeighbor(chat as NeighborId) ? chat : 'dex') as NeighborId;
  useMarkRead(id, origen);
  const vars = useOriginVars();
  if (!settings) return null;
  if (!storyOn(origen) || !chat || !isNeighbor(chat as NeighborId)) return <Navigate to="/mensajes" replace />;
  const lines = neighborLines(origen, id);
  const companion = COMPANION_NAME[settings.companion];
  return (
    <div className="stack" style={{ gap: 'var(--s4)' }}>
      <BackLink to="/mensajes" label={t('origen.chats.title')} />
      <div className="row" style={{ gap: 'var(--s3)' }}>
        <span className="chats-face" aria-hidden="true">
          <CityThumb item={id} unlocked />
        </span>
        <div>
          <h1 style={{ margin: 0 }}>{neighbor(id).name}</h1>
          <p className="small muted">{itemDescription(id)}</p>
        </div>
      </div>
      <section className="stack" style={{ gap: 'var(--s2)' }} aria-label={neighbor(id).name}>
        {lines.map((line, i) => (
          <div key={`${line.key}-${i}`} className={`chat-msg ${line.who === 'you' ? 'user' : 'companion'}`}>
            <span className="chat-who small">
              {line.who === 'you' ? t('origen.forYou', { companion }) : neighbor(id).name} · {time(line.at)}
            </span>
            <p>{tDynamic(line.key, vars)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

type SignalItem = { at: string } & ({ kind: 'session'; n: number } | { kind: 'offer'; test: ProgramTest } | { kind: 'line'; text: string });

/** «??? · Señal desconocida» (ME-08): sesiones y pruebas, en orden; sin campo de escribir. */
export function SignalChatScreen() {
  useLocale();
  const { db } = useData();
  const settings = useSettings();
  const [playing, setPlaying] = useState<{ n: number; voice: VoiceId; assets: SignalAssets }>();
  const origen = settings?.origen;
  const names = useTestNames();
  useMarkRead('signal', origen);

  if (!settings) return null;
  if (!storyOn(origen)) return <Navigate to="/chat" replace />;
  const voice = voiceFor(getLocale(), settings.profile?.gender, (settings.avatar ?? DEFAULT_AVATAR).cast);
  const today = toLocalDate(new Date());

  const items: SignalItem[] = [
    ...seenSessions(origen).map((s) => ({ at: s.at, kind: 'session' as const, n: s.n })),
    ...(origen?.tests ?? []).flatMap((test): SignalItem[] => {
      const n = testNumber(test.n);
      const out: SignalItem[] = [{ at: test.offeredAt, kind: 'offer', test }];
      if (test.acceptedOn && test.deadline)
        out.push({ at: `${test.offeredAt}~`, kind: 'line', text: t('origen.test.accepted', { n, date: dayMonth(test.deadline) }) });
      if (test.result && test.resolvedAt) out.push({ at: test.resolvedAt, kind: 'line', text: t(`origen.test.${test.result}`, { n }) });
      return out;
    }),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const answer = (test: ProgramTest, accept: boolean) => {
    const tests = (origen?.tests ?? []).map((x) =>
      x.n !== test.n ? x : accept ? acceptTest(x, today) : { ...x, result: 'rejected' as const, resolvedAt: new Date().toISOString() },
    );
    void saveSetting(db, 'origen', { ...origen, tests });
  };

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
        {items.map((item) =>
          item.kind === 'session' ? (
            <button
              key={`s${item.n}`}
              type="button"
              className="signal-card"
              aria-label={`${t('origen.chats.watch')}: ${t('origen.chats.session', { n: item.n })}`}
              onClick={() => void loadSignalAssets(item.n, voice).then((assets) => setPlaying({ n: item.n, voice, assets }))}
            >
              <span>
                {t('origen.chats.session', { n: item.n })}
                <br />
                <span className="small muted">{dayMonth(toLocalDate(new Date(item.at)))}</span>
              </span>
              <span className="signal-tag">
                <i />
                {t('origen.tag')}
              </span>
            </button>
          ) : item.kind === 'offer' ? (
            <div key={`o${item.test.n}`} className="signal-card signal-test stack">
              <span className="signal-tag">
                <i />
                {t('origen.test.label')}
              </span>
              <p>{t('origen.test.offer', { n: testNumber(item.test.n), objective: testObjective(item.test, names), days: item.test.days ?? 7 })}</p>
              {item.test.detail && <p className="small muted">{item.test.detail}</p>}
              {!item.test.acceptedOn && !item.test.result && (
                <div className="row" style={{ gap: 'var(--s2)' }}>
                  <button type="button" className="btn btn-primary grow" onClick={() => answer(item.test, true)}>
                    {t('origen.test.accept')}
                  </button>
                  <button type="button" className="btn grow" onClick={() => answer(item.test, false)}>
                    {t('origen.test.reject')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p key={item.at} className="signal-line small">
              {item.text}
            </p>
          ),
        )}
      </div>
      <p className="signal-noreply small muted">{t('origen.chats.noReply')}</p>
      {playing && <SignalOverlay mode="replay" session={playing.n} voice={playing.voice} assets={playing.assets} onDone={() => setPlaying(undefined)} />}
    </div>
  );
}

/** Expediente ORIGEN (EX-02, EX-03): capítulos, pistas, fragmentos y registro de pruebas, con el porcentaje descifrado. */
export function DossierScreen() {
  useLocale();
  const settings = useSettings();
  const vars = useOriginVars();
  if (!settings) return null;
  const origen = settings.origen;
  if (!storyOn(origen)) return <Navigate to="/chat" replace />;
  const d = dossier(origen);
  const companion = COMPANION_NAME[settings.companion];
  return (
    <div className="stack" style={{ gap: 'var(--s4)' }}>
      <BackLink to="/mensajes" label={t('origen.chats.title')} />
      <h1>{t('origen.dossier.title')}</h1>
      <p className="pixel signal-decoded">{t('origen.dossier.decoded', { percent: d.percent })}</p>
      <div className="xpbar signal-bar" style={{ height: 10 }} role="progressbar" aria-valuenow={d.percent} aria-valuemin={0} aria-valuemax={100} aria-label={t('origen.dossier.decoded', { percent: d.percent })}>
        <span style={{ width: `${d.percent}%` }} />
      </div>

      <Panel className="stack">
        <h2>{t('origen.dossier.chapters')}</h2>
        <ul className="stack dossier-list">
          {d.chapters.map((c) =>
            c.at && c.n <= TITLED_CHAPTERS ? (
              <li key={c.n}>
                <p className="pixel">{t('origen.dossier.chapterTitle', { n: c.n, title: tDynamic(`origen.chapter.${c.n}.title`) })}</p>
                <p className="small muted">
                  {dayMonth(toLocalDate(new Date(c.at)))} · {tDynamic(`origen.chapter.${c.n}.question`)}
                </p>
              </li>
            ) : (
              <li key={c.n} className="muted">
                <p className="pixel">{t('origen.dossier.pending', { n: c.n })}</p>
              </li>
            ),
          )}
        </ul>
      </Panel>

      <Panel className="stack">
        <h2>{t('origen.dossier.clues')}</h2>
        {d.clues.length === 0 && <p className="muted">{t('origen.dossier.noClues')}</p>}
        {d.clues.map((c) => (
          <Link key={c.key} to={`/mensajes/${c.chat}`} className="chats-row" style={{ paddingInline: 0 }}>
            <span className="chats-face" aria-hidden="true">
              <CityThumb item={c.chat} unlocked />
            </span>
            <p className="grow small">{tDynamic(c.key, vars)}</p>
          </Link>
        ))}
      </Panel>

      <Panel className="stack">
        <h2>{t('origen.dossier.fragments')}</h2>
        <p className="muted">
          {d.fragments === 0
            ? t('origen.dossier.noFragments')
            : currentChapter(origen) < FRAGMENTS_READABLE_FROM
              ? t('origen.dossier.fragmentsHeld', { count: d.fragments, companion })
              : ''}
        </p>
      </Panel>

      <Panel className="stack">
        <h2>{t('origen.dossier.tests')}</h2>
        <p className="muted">{t('origen.dossier.testsLog', d.tests)}</p>
      </Panel>
    </div>
  );
}
