// Conversación completa con el compañero (D-098): todo lo hablado, también lo que dijo por iniciativa propia,
// agrupado por días. Se comporta como el chat de una red social (D-127): pantalla completa, arriba con quién hablas,
// volver y borrar; abajo, el campo de escribir siempre visible (también con el teclado abierto); en medio, los
// mensajes con su propio scroll.
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { clearChatLog, type ChatEntry } from '../../data/repository';
import { COMPANION_NAME } from '../../domain/arvid/companion';
import { toLocalDate, type LocalDate } from '../../domain/time/localDate';
import { getLocale, t, useLocale } from '../../i18n';
import { chatTurn } from '../arvid/brain';
import { editPath, ProposalCard } from '../arvid/ProposalCard';
import type { Proposal } from '../../domain/arvid/actions';
import { useArvidContext } from '../arvid/useArvidContext';
import { logChat } from '../arvid/voice';
import { useData, useMemories, useSettings } from '../data';
import { BackIcon, MoreIcon } from '../design/icons';
import { clearMemories } from '../../data/memory';
import { rememberFromTurn } from '../arvid/memory';
import { markUserChat } from '../scene/engine';
import { CompanionPreview } from '../scene/Scene';
import { CHAT_MAX } from '../scene/Chat';
import { longDate } from '../text';

const time = (at: string) => new Date(at).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });

/** Alto visible real: con el teclado abierto (iPhone), la pantalla se ajusta para que el campo siga a la vista. */
function useVisibleHeight(): number | undefined {
  const [height, setHeight] = useState<number>();
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setHeight(Math.round(vv.height));
    update();
    vv.addEventListener('resize', update);
    return () => vv.removeEventListener('resize', update);
  }, []);
  return height;
}

const TEXTAREA_MAX_ROWS = 5;

export function ChatScreen() {
  useLocale();
  const ctx = useData();
  const { db } = ctx;
  const memories = useMemories();
  const [menu, setMenu] = useState(false);
  const settings = useSettings();
  const context = useArvidContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [text, setText] = useState(() => (location.state as { draft?: string } | null)?.draft ?? '');
  const [busy, setBusy] = useState(false);
  // Qué se está confirmando en el diálogo flotante (D-130)
  const [confirm, setConfirm] = useState<'chat' | 'memory'>();
  const [proposal, setProposal] = useState<Proposal>();
  const end = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const height = useVisibleHeight();
  const log = settings?.chatLog;
  const name = settings ? COMPANION_NAME[settings.companion] : '';

  // Siempre a la vista lo último
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end' });
  }, [log?.length, busy, proposal, height]);

  // El campo crece con el texto, hasta 5 líneas
  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = 'auto';
    const line = parseFloat(getComputedStyle(el).lineHeight) || 22;
    el.style.height = `${Math.min(el.scrollHeight, line * TEXTAREA_MAX_ROWS + 16)}px`;
  }, [text]);

  // Diálogo de borrar: el foco va a «Cancelar» y Esc lo cierra
  useEffect(() => {
    if (!confirm) return;
    cancel.current?.focus();
    const escape = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setConfirm(undefined);
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [confirm]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const message = text.trim();
    if (!message || busy) return;
    setText('');
    setBusy(true);
    markUserChat();
    logChat('user', message);
    try {
      const turn = await chatTurn(message, { aiEnabled: settings?.arvidAi ?? false, context }, log);
      logChat('companion', turn.text);
      // Memoria del compañero (spec 13, MC-03): guarda y avisa en la conversación
      await rememberFromTurn(ctx, turn);
      // Crear con el compañero (spec 12, AC-05, AC-06): tarjeta para confirmar, o el formulario con lo entendido
      setProposal(turn.proposal);
      if (turn.draft) void navigate(editPath(turn.draft.action), { state: { draft: turn.draft.args } });
    } finally {
      setBusy(false);
    }
  }

  // Volver a donde estabas; si se abrió directamente, a Hoy
  const back = () => {
    if (((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0) void navigate(-1);
    else void navigate('/hoy');
  };

  // Intro envía; Mayúsculas + Intro, nueva línea (en el móvil, el botón del teclado es «Enviar»)
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
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
    <div className="chat-screen" style={height ? { height } : undefined}>
      <header className="chat-header">
        <button type="button" className="btn btn-ghost btn-icon" aria-label={t('common.back')} onClick={back}>
          <BackIcon />
        </button>
        <CompanionPreview size={40} />
        <div className="grow" style={{ minWidth: 0 }}>
          <h1 className="chat-title">{name}</h1>
          <p className="small muted">{settings?.arvidAi ? t('chat.withAi') : t('chat.withoutAi')}</p>
        </div>
        <div className="chat-menu">
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            aria-label={t('memory.menu')}
            title={t('memory.menu')}
            aria-haspopup="menu"
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
          >
            <MoreIcon />
          </button>
          {menu && (
            <ChatMenu
              onClose={() => setMenu(false)}
              items={[
                {
                  label: memories?.length
                    ? t('memory.viewMemoryCount', { count: memories.length })
                    : t('memory.viewMemory'),
                  onSelect: () => void navigate('/chat/memoria'),
                },
                {
                  label: t('chat.clear'),
                  onSelect: () => setConfirm('chat'),
                  disabled: (log?.length ?? 0) === 0,
                  danger: true,
                },
                {
                  label: t('memory.clearAll'),
                  onSelect: () => setConfirm('memory'),
                  disabled: !memories?.length,
                  danger: true,
                },
              ]}
            />
          )}
        </div>
      </header>

      <section className="chat-log chat-scroll" aria-label={t('chat.title')} aria-live="polite">
        {groups.length === 0 && <p className="muted chat-empty">{t('chat.empty')}</p>}
        {groups.map((g) => (
          <div key={g.day} className="stack" style={{ gap: 'var(--s2)' }}>
            <p className="chat-day small muted">{longDate(g.day)}</p>
            {g.entries.map((entry, i) =>
              entry.kind === 'memory' ? (
                // Aviso de memoria (MC-03): una línea aparte, no una burbuja
                <p key={`${entry.at}-${i}`} className="chat-memory small">
                  {entry.text}
                </p>
              ) : (
                <div key={`${entry.at}-${i}`} className={`chat-msg ${entry.from}`}>
                  <span className="chat-who small">
                    {entry.from === 'user' ? t('chat.you') : COMPANION_NAME[entry.companion]} · {time(entry.at)}
                  </span>
                  <p>{entry.text}</p>
                </div>
              ),
            )}
          </div>
        ))}
        {busy && (
          <div className="chat-msg companion" aria-label={t('arvid.chat.thinking')}>
            <p>{t('arvid.chat.thinking')}</p>
          </div>
        )}
        {proposal && <ProposalCard proposal={proposal} onDone={() => setProposal(undefined)} />}
        <div ref={end} />
      </section>

      {/* Estilo terminal (D-127): «>», texto pixel, línea cian debajo y «ENVIAR» */}
      <form className="chat-composer" onSubmit={(e) => void send(e)}>
        <div className="chat-terminal">
          <span className="chat-prompt" aria-hidden="true">
            &gt;
          </span>
          <textarea
            ref={field}
            className="chat-terminal-input"
            rows={1}
            value={text}
            maxLength={CHAT_MAX}
            placeholder={t('chat.placeholder')}
            aria-label={t('scene.chatInput')}
            autoComplete="off"
            enterKeyHint="send"
            onKeyDown={onKeyDown}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="chat-terminal-send" disabled={busy || !text.trim()}>
            {t('scene.send')}
          </button>
        </div>
      </form>

      {confirm && (
        <div className="sheet-backdrop chat-confirm" onClick={() => setConfirm(undefined)}>
          <div
            className="panel stack"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="chat-clear-title"
            aria-describedby="chat-clear-text"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="chat-clear-title">{confirm === 'chat' ? t('chat.clear') : t('memory.clearAll')}</h2>
            <p id="chat-clear-text">{confirm === 'chat' ? t('chat.clearConfirm') : t('memory.clearAllConfirm')}</p>
            <div className="row">
              <button ref={cancel} type="button" className="btn grow" onClick={() => setConfirm(undefined)}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-danger grow"
                onClick={() =>
                  void (confirm === 'chat' ? clearChatLog(db) : clearMemories(db)).then(() => setConfirm(undefined))
                }
              >
                {confirm === 'chat' ? t('chat.clearYes') : t('memory.clearAllYes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Menú flotante de opciones (D-130): se cierra al elegir, con Esc o tocando fuera. */
function ChatMenu({
  items,
  onClose,
}: {
  items: { label: string; onSelect: () => void; disabled?: boolean; danger?: boolean }[];
  onClose: () => void;
}) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
    const escape = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose();
    const outside = (e: PointerEvent) => !(e.target as Element).closest?.('.chat-menu') && onClose();
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', escape);
      document.removeEventListener('pointerdown', outside);
    };
  }, [onClose]);
  return (
    <ul className="chat-menu-list panel" role="menu">
      {items.map((item, i) => (
        <li key={item.label} role="none">
          <button
            ref={i === 0 ? first : undefined}
            type="button"
            role="menuitem"
            className={item.danger ? 'danger' : undefined}
            disabled={item.disabled}
            onClick={() => {
              onClose();
              item.onSelect();
            }}
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
