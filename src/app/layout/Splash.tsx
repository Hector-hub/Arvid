// Pantalla de carga al abrir la app (D-116): el icono aparece, «ARVID» se escribe letra a letra debajo y después la
// app entra con un fundido. Solo al arrancar; con movimiento reducido, sin animaciones y más breve. Las pruebas
// automáticas (navigator.webdriver) la saltan.
import { useEffect, useState, type ReactNode } from 'react';

const NAME = 'ARVID';
const TYPE_START_MS = 450;
const LETTER_MS = 110;
const HOLD_MS = 650;
const FADE_MS = 400;
const REDUCED_MS = 700;
const FONT_WAIT_MS = 1000;
/** Tope absoluto de la pantalla de carga. */
const MAX_MS = 4000;

const skip = () => typeof navigator !== 'undefined' && navigator.webdriver === true;
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Splash({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<'splash' | 'out' | 'app'>(() => (skip() ? 'app' : 'splash'));
  const [letters, setLetters] = useState(() => (reduced() ? NAME.length : 0));

  // Una sola vez al montar: si dependiera de la fase, al empezar el fundido se cancelaría el paso a la app y la
  // pantalla se quedaría vacía (fallo de la 1.2.1–1.2.2)
  useEffect(() => {
    if (skip()) return;
    let live = true;
    const timers: number[] = [];
    const after = (ms: number, fn: () => void) => timers.push(window.setTimeout(() => live && fn(), ms));
    // Pase lo que pase (p. ej. la fuente no termina de cargar), la app aparece
    after(MAX_MS, () => setPhase('app'));
    if (reduced()) {
      after(REDUCED_MS, () => setPhase('app'));
    } else {
      // Se espera a la fuente pixel (como mucho FONT_WAIT_MS) para que las letras no cambien de forma al escribirse
      const font = document.fonts?.load('500 32px "Pixelify Sans"').catch(() => undefined) ?? Promise.resolve();
      void Promise.race([font, new Promise((r) => setTimeout(r, FONT_WAIT_MS))]).then(() => {
        if (!live) return;
        for (let i = 1; i <= NAME.length; i++) after(TYPE_START_MS + i * LETTER_MS, () => setLetters(i));
        const done = TYPE_START_MS + NAME.length * LETTER_MS + HOLD_MS;
        after(done, () => setPhase((p) => (p === 'app' ? p : 'out')));
        after(done + FADE_MS, () => setPhase('app'));
      });
    }
    return () => {
      live = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  if (phase === 'app') return <div className={skip() ? undefined : 'app-fade-in'}>{children}</div>;
  return (
    <div className={`splash${phase === 'out' ? ' out' : ''}`} role="status" aria-label={NAME}>
      <img src="/icons/icon-192.png" alt="" width={112} height={112} className="splash-icon" />
      {/* La palabra ocupa siempre su ancho completo (las letras aún sin escribir, invisibles) para quedar centrada
          y no moverse; el cursor va fuera del flujo */}
      <p className="splash-name" aria-hidden="true">
        <span>{NAME.slice(0, letters)}</span>
        <span className="splash-pending">{NAME.slice(letters)}</span>
        {letters < NAME.length && <span className="splash-caret">_</span>}
      </p>
    </div>
  );
}
