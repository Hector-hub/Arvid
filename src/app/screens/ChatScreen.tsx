// Conversación completa con el compañero (D-098): todo lo hablado, también lo que dijo por iniciativa propia,
// agrupado por días, con campo para seguir hablando y opción de borrarla.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router';
import { clearChatLog, type ChatEntry } from '../../data/repository';
import { COMPANION_NAME } from '../../domain/arvid/companion';
import { toLocalDate, type LocalDate } from '../../domain/time/localDate';
import { getLocale, t, useLocale } from '../../i18n';
import { replyTo } from '../arvid/brain';
import { useArvidContext } from '../arvid/useArvidContext';
import { logChat } from '../arvid/voice';
import { useData, useSettings } from '../data';
import { BackLink } from '../design/components';
import { SendIcon } from '../design/icons';
import { markUserChat } from '../scene/engine';
import { CompanionPreview } from '../scene/Scene';
import { CHAT_MAX } from '../scene/Chat';
import { longDate } from '../text';

const time = (at: string) => new Date(at).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });

export function ChatScreen() {
  useLocale();
  const { db } = useData();
  const settings = useSettings();
  const context = useArvidContext();
  const location = useLocation();
  const [text, setText] = useState(() => (location.state as { draft?: string } | null)?.draft ?? '');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const log = settings?.chatLog;

  // Siempre a la vista lo último
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end' });
  }, [log?.length, busy]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || busy) return;
    setText('');
    setBusy(true);
    markUserChat();
    logChat('user', message);
    try {
      logChat('companion', await replyTo(message, { aiEnabled: settings?.arvidAi ?? false, context }));
    } finally {
      setBusy(false);
    }
  }

  // Separadores por día
  const groups: { day: LocalDate; entries: ChatEntry[] }[] = [];
  for (const entry of log ?? []) {
    const day = toLocalDate(new Date(entry.at));
    if (groups.at(-1)?.day !== day) groups.push({ day, entries: [] });
    groups.at(-1)!.entries.push(entry);
  }

  return (
    <div className="stack chat-page" style={{ gap: 'var(--s4)' }}>
      <BackLink to="/hoy" label={t('nav.today')} />
      <div className="row">
        <CompanionPreview size={48} />
        <h1 className="grow" style={{ fontSize: '1.375rem' }}>
          {t('chat.title')}
        </h1>
      </div>

      <section className="chat-log" aria-label={t('chat.title')} aria-live="polite">
        {groups.length === 0 && <p className="muted">{t('chat.empty')}</p>}
        {groups.map((g) => (
          <div key={g.day} className="stack" style={{ gap: 'var(--s2)' }}>
            <p className="chat-day small muted">{longDate(g.day)}</p>
            {g.entries.map((entry, i) => (
              <div key={`${entry.at}-${i}`} className={`chat-msg ${entry.from}`}>
                <span className="chat-who small">
                  {entry.from === 'user' ? t('chat.you') : COMPANION_NAME[entry.companion]} · {time(entry.at)}
                </span>
                <p>{entry.text}</p>
              </div>
            ))}
          </div>
        ))}
        {busy && (
          <div className="chat-msg companion" aria-label={t('arvid.chat.thinking')}>
            <p>{t('arvid.chat.thinking')}</p>
          </div>
        )}
        <div ref={end} />
      </section>

      <form className="chat-page-form" onSubmit={(e) => void send(e)}>
        <input
          className="chat-input"
          type="text"
          value={text}
          maxLength={CHAT_MAX}
          placeholder={t('chat.placeholder')}
          aria-label={t('scene.chatInput')}
          autoComplete="off"
          enterKeyHint="send"
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-icon" aria-label={t('scene.send')} disabled={busy || !text.trim()}>
          <SendIcon />
        </button>
      </form>

      {(log?.length ?? 0) > 0 &&
        (confirm ? (
          <div className="banner stack" role="alertdialog" aria-label={t('chat.clear')}>
            <p>{t('chat.clearConfirm')}</p>
            <div className="row">
              <button
                type="button"
                className="btn btn-danger grow"
                onClick={() => void clearChatLog(db).then(() => setConfirm(false))}
              >
                {t('chat.clearYes')}
              </button>
              <button type="button" className="btn grow" onClick={() => setConfirm(false)}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-ghost" style={{ alignSelf: 'center' }} onClick={() => setConfirm(true)}>
            {t('chat.clear')}
          </button>
        ))}
    </div>
  );
}
