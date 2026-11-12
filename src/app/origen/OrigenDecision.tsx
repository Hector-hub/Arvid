// Tras el primer contacto, el compañero reacciona y pregunta qué hacer (spec 17, PC-07, DE). No se cierra sin elegir.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { COMPANION_NAME } from '../../domain/arvid/companion';
import type { OrigenChoice } from '../../domain/origen/origen';
import { t, type TKey } from '../../i18n';
import { logChat } from '../arvid/voice';
import { useSettings } from '../data';
import { useReducedMotion } from '../motion';
import { CompanionPreview } from '../scene/Scene';

type Step = { kind: 'line'; key: TKey } | { kind: 'question' } | { kind: 'after'; choice: OrigenChoice };

const LINES: TKey[] = ['origen.reaction.0', 'origen.reaction.1'];
const CHARS_PER_S = 40;

/** Texto que se escribe letra a letra; tocar lo completa. Con «Reducir movimiento», entero. */
function useTyped(text: string): [string, boolean, () => void] {
  const reduced = useReducedMotion();
  const [typed, setTyped] = useState({ text, n: 0 });
  const n = reduced ? text.length : typed.text === text ? typed.n : 0;
  useEffect(() => {
    if (reduced) return;
    const start = performance.now();
    const id = window.setInterval(() => {
      const next = Math.min(text.length, Math.floor(((performance.now() - start) / 1000) * CHARS_PER_S));
      setTyped((prev) => (prev.text === text && prev.n >= next ? prev : { text, n: next }));
      if (next >= text.length) window.clearInterval(id);
    }, 30);
    return () => window.clearInterval(id);
  }, [text, reduced]);
  return [text.slice(0, n), n >= text.length, () => setTyped({ text, n: text.length })];
}

export function OrigenDecision({
  onChoose,
  onClose,
}: {
  onChoose: (choice: OrigenChoice) => void;
  onClose: () => void;
}) {
  const settings = useSettings();
  const name = settings ? COMPANION_NAME[settings.companion] : '';
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<OrigenChoice>();
  const steps: Step[] = [
    ...LINES.map((key) => ({ kind: 'line', key }) as Step),
    { kind: 'question' },
    ...(choice ? [{ kind: 'after', choice } as Step] : []),
  ];
  const step = steps[Math.min(index, steps.length - 1)]!;
  const text =
    step.kind === 'line'
      ? t(step.key)
      : step.kind === 'question'
        ? t('origen.decision.text')
        : t(step.choice === 'investigate' ? 'origen.decision.afterInvestigate' : 'origen.decision.afterBlock');
  const [typed, done, finish] = useTyped(text);
  const logged = useRef(new Set<number>());
  const action = useRef<HTMLButtonElement>(null);

  // Lo que dice queda en su conversación (D-098)
  useEffect(() => {
    if (!done || logged.current.has(index)) return;
    logged.current.add(index);
    logChat('companion', step.kind === 'question' ? `${t('origen.decision.title')}. ${text}` : text);
    action.current?.focus();
  }, [done, index, step.kind, text]);

  const pick = (c: OrigenChoice) => {
    logChat('user', t(c === 'investigate' ? 'origen.decision.investigate' : 'origen.decision.block'));
    setChoice(c);
    onChoose(c);
    setIndex(steps.length);
  };

  return createPortal(
    <div
      className="origen-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="origen-dialog-who"
      onClick={() => !done && finish()}
    >
      <div className="origen-dialog-box">
        {step.kind === 'question' && <h2>{t('origen.decision.title')}</h2>}
        <div className="origen-dialog-line">
          <CompanionPreview size={64} />
          <div className="grow">
            <p id="origen-dialog-who" className="origen-dialog-who">
              {name}
            </p>
            <p className="origen-dialog-text" aria-live="polite">
              {typed}
            </p>
          </div>
        </div>
        {done && step.kind === 'line' && (
          <button ref={action} type="button" className="btn" onClick={() => setIndex(index + 1)}>
            {t('origen.decision.next')}
          </button>
        )}
        {done && step.kind === 'question' && (
          <div className="row" style={{ gap: 'var(--s2)', flexWrap: 'wrap' }}>
            <button ref={action} type="button" className="btn btn-primary grow" onClick={() => pick('investigate')}>
              {t('origen.decision.investigate')}
            </button>
            <button type="button" className="btn grow" onClick={() => pick('block')}>
              {t('origen.decision.block')}
            </button>
          </div>
        )}
        {done && step.kind === 'after' && (
          <button ref={action} type="button" className="btn" onClick={onClose}>
            {t('origen.decision.close')}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
