// Mensajes (spec 17, ME): la lista de conversaciones, el contacto «??? · Señal desconocida» con sus transmisiones y
// pruebas, y el chat de cada vecino con los mensajes de la historia.
import { useEffect, useRef, useState, type FormEvent } from 'react';
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
import { diffDays, toLocalDate } from '../../domain/time/localDate';
import { NEIGHBOR_DAILY_MESSAGES, NEIGHBOR_HISTORY } from '../../domain/origen/neighborChat';
import { addMessages, deleteOwnMessage } from '../../data/messages';
import { neighborChatTurn } from '../arvid/brain';
import { useAnalysis } from '../analysis';
import { getLocale, t, tDynamic, useLocale } from '../../i18n';
import { useData, useMessages, useSettings } from '../data';
import { BackLink, Panel } from '../design/components';
import { CityThumb } from '../city/CityThumb';
import { itemDescription } from '../city/labels';
import { CompanionPreview } from '../scene/Scene';
import { dayMonth, levelTitle } from '../text';
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

/** Lo que se ve de ti desde la calle (VI-02): alias, título, días que llevas y si hoy cumpliste. Nada más. */
function useStreetView(): Record<string, unknown> {
  const settings = useSettings();
  const analysis = useAnalysis();
  const today = toLocalDate(new Date());
  const daily = [...(analysis?.byActivity.values() ?? [])].flatMap((a) => a.periods.filter((p) => p.period.kind === 'day' && p.period.start === today && p.reason !== 'paused' && p.reason !== 'rest'));
  const since = settings?.onboardingCompletedAt ? diffDays(toLocalDate(new Date(settings.onboardingCompletedAt)), today) : 0;
  return {
    alias: settings?.profile?.alias ?? '',
    title: analysis ? levelTitle(analysis.progress.level) : '',
    daysInTheNeighborhood: since,
    didEverythingToday: daily.length > 0 && daily.every((p) => p.fulfilled),
  };
}

type Line = { id: string; at: string; who: 'them' | 'you' | 'user'; text: string; own?: boolean };

/** Chat de un vecino (ME-03 a ME-05, VI): lo de la historia, con las respuestas del compañero por ti, y tu conversación con él. */
export function NeighborChatScreen() {
  useLocale();
  const { db } = useData();
  const { chat } = useParams();
  const settings = useSettings();
  const origen = settings?.origen;
  const id = (chat && isNeighbor(chat as NeighborId) ? chat : 'dex') as NeighborId;
  useMarkRead(id, origen);
  const vars = useOriginVars();
  const free = useMessages(id);
  const street = useStreetView();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const end = useRef<HTMLDivElement>(null);
  const count = free?.length ?? 0;
  useEffect(() => end.current?.scrollIntoView?.({ block: 'end' }), [count, busy]);
  if (!settings) return null;
  if (!storyOn(origen) || !chat || !isNeighbor(chat as NeighborId)) return <Navigate to="/mensajes" replace />;
  const name = neighbor(id).name;
  const companion = COMPANION_NAME[settings.companion];
  const lines: Line[] = [
    ...neighborLines(origen, id).map((l, i) => ({ id: `story-${i}`, at: l.at, who: l.who, text: tDynamic(l.key, vars) })),
    ...(free ?? []).map((m): Line => ({ id: m.id, at: m.at, who: m.from === 'user' ? 'user' : 'them', text: m.text, own: m.from === 'user' })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const today = toLocalDate(new Date());
  const sentToday = (free ?? []).filter((m) => m.from === 'user' && toLocalDate(new Date(m.at)) === today).length;
  const left = Math.max(0, NEIGHBOR_DAILY_MESSAGES - sentToday);
  const canTalk = settings.arvidAi && !!settings.aiCode;

  async function send(e: FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || busy || left === 0) return;
    setBusy(true);
    setError(undefined);
    const history = [...lines.map((l) => ({ role: l.who === 'them' ? ('assistant' as const) : ('user' as const), content: l.text.slice(0, 1000) })), { role: 'user' as const, content: message }];
    const result = await neighborChatTurn(id, currentChapter(origen), history.slice(-NEIGHBOR_HISTORY), street);
    setBusy(false);
    if (!result.ok) {
      setError(result.reason === 'neighbor' ? t('origen.neighborChat.none', { name }) : result.reason === 'offline' ? t('origen.neighborChat.offline') : t('origen.neighborChat.error', { name }));
      return;
    }
    const sentAt = new Date();
    await addMessages(db, [
      { id: crypto.randomUUID(), chat: id, at: sentAt.toISOString(), from: 'user', text: message },
      { id: crypto.randomUUID(), chat: id, at: new Date(sentAt.getTime() + 1).toISOString(), from: 'character', text: result.reply },
    ]);
    setText('');
  }

  return (
    <div className="stack" style={{ gap: 'var(--s4)' }}>
      <BackLink to="/mensajes" label={t('origen.chats.title')} />
      <div className="row" style={{ gap: 'var(--s3)' }}>
        <span className="chats-face" aria-hidden="true">
          <CityThumb item={id} unlocked />
        </span>
        <div>
          <h1 style={{ margin: 0 }}>{name}</h1>
          <p className="small muted">{itemDescription(id)}</p>
        </div>
      </div>
      <section className="stack" style={{ gap: 'var(--s2)' }} aria-label={name} aria-live="polite">
        {lines.map((line) => (
          <div key={line.id} className={`chat-msg ${line.who === 'them' ? 'companion' : 'user'}`}>
            <span className="chat-who small">
              {line.who === 'you' ? t('origen.forYou', { companion }) : line.who === 'user' ? t('origen.neighborChat.you') : name} · {time(line.at)}
              {line.own && (
                <button type="button" className="chat-delete" aria-label={t('origen.neighborChat.delete')} onClick={() => void deleteOwnMessage(db, line.id)}>
                  ×
                </button>
              )}
            </span>
            <p>{line.text}</p>
          </div>
        ))}
        {busy && (
          <div className="chat-msg companion">
            <p className="muted">{t('origen.neighborChat.typing', { name })}</p>
          </div>
        )}
        <div ref={end} />
      </section>
      {canTalk ? (
        <form className="chat-composer neighbor-composer stack" onSubmit={(e) => void send(e)}>
          <div className="chat-terminal">
            <span className="chat-prompt" aria-hidden="true">
              &gt;
            </span>
            <input
              className="chat-terminal-input"
              value={text}
              maxLength={280}
              disabled={left === 0}
              placeholder={t('origen.neighborChat.placeholder', { name })}
              aria-label={t('origen.neighborChat.placeholder', { name })}
              autoComplete="off"
              enterKeyHint="send"
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" className="chat-terminal-send" disabled={busy || !text.trim() || left === 0}>
              {t('scene.send')}
            </button>
          </div>
          <p className="small muted" role="status">
            {error ?? (left === 0 ? t('origen.neighborChat.none', { name }) : t('origen.neighborChat.left', { count: left, name }))}
          </p>
        </form>
      ) : (
        <p className="signal-noreply small muted">{t('origen.neighborChat.needsAi', { name })}</p>
      )}
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
