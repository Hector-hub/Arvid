import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useT } from '../../i18n';
import { replyTo } from '../arvid/brain';
import { useArvidContext } from '../arvid/useArvidContext';
import { useSettings } from '../data';
import { logChat, speak } from '../arvid/voice';
import { ChatIcon, ExpandIcon, SendIcon } from '../design/icons';
import { markUserChat } from './engine';

export const CHAT_MAX = 280;

/**
 * Chat con el compañero (spec 06, CH; D-098): el botón despliega un campo hacia la izquierda con dos botones, la
 * flecha (envía y cierra) y expandir (abre la conversación completa con lo escrito). Se cierra con Esc, tocando fuera
 * o enviando vacío. El compañero responde en la burbuja de la escena.
 */
export function ChatControl() {
  const t = useT();
  const settings = useSettings();
  const context = useArvidContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const outside = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    // Esc cierra aunque el campo haya perdido el foco mientras ARVID responde
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!open) {
      setOpen(true);
      return;
    }
    const message = text.trim();
    if (!message) {
      setOpen(false);
      return;
    }
    if (busy) return;
    setText('');
    setOpen(false);
    setBusy(true);
    markUserChat();
    logChat('user', message);
    try {
      // ARVID "piensa" mientras espera la respuesta (CH-03); los "…" no van a la conversación
      await speak(t('arvid.chat.thinking'), { log: false });
      await speak(await replyTo(message, { aiEnabled: settings?.arvidAi ?? false, context }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      ref={root}
      className={`chat${open ? ' open' : ''}`}
      onSubmit={(e) => void submit(e)}
    >
      {open && (
        <input
          ref={input}
          className="chat-input"
          type="text"
          value={text}
          maxLength={CHAT_MAX}
          disabled={busy}
          placeholder={t('scene.chatPlaceholder')}
          aria-label={t('scene.chatInput')}
          autoComplete="off"
          enterKeyHint="send"
          onChange={(e) => setText(e.target.value)}
        />
      )}
      {open && (
        <button
          type="button"
          className="btn chat-button"
          aria-label={t('chat.expand')}
          title={t('chat.expand')}
          onClick={() => void navigate('/chat', { state: { draft: text } })}
        >
          <ExpandIcon />
        </button>
      )}
      <button type="submit" className="btn chat-button" aria-label={open ? t('scene.send') : t('scene.chat')} disabled={busy}>
        {open ? <SendIcon /> : <ChatIcon />}
      </button>
    </form>
  );
}
