import { useEffect, useRef, useState } from 'react';
import { createSpeech, hasMore, paginate, stepSpeech, tapSpeech, visibleLines, type Speech } from '../../domain/arvid/speech';
import { t } from '../../i18n';
import { useReducedMotion } from '../motion';
import { ArvidPreview } from '../scene/Scene';

const FONT = '15px "Pixelify Sans"';
let measureCtx: CanvasRenderingContext2D | null | undefined;
function measure(text: string): number {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * 8;
  measureCtx.font = FONT;
  return measureCtx.measureText(text).width;
}

/** Cada frase empieza en una página nueva; dentro de una frase, páginas de 2 líneas que caben en la caja (BP-05). */
function toPages(sentences: string[], width: number): { pages: string[][]; lastSentence: string[] } {
  const bySentence = sentences.map((s) => paginate(s, measure, width));
  return { pages: bySentence.flat(), lastSentence: (bySentence.at(-1) ?? []).flat() };
}

const pageLength = (sp: Speech) => (sp.pages[sp.page] ?? []).reduce((n, l) => n + l.length, 0);
/** El control del paso se habilita al terminar de escribir la última página (ON-04). */
const lastPageWritten = (sp: Speech) => sp.done || (sp.page === sp.pages.length - 1 && sp.shown >= pageLength(sp));

/**
 * Caja de diálogo de ARVID en el onboarding (ON-01, ON-03, ON-04): retrato animado, nombre y texto letra a letra.
 * Un toque completa la página y otro pasa a la siguiente; "Saltar" lo muestra todo. Avisa con `onDone` al terminar.
 */
export function DialogueBox({ lines, onDone }: { lines: string[]; onDone: () => void }) {
  const reduced = useReducedMotion();
  const textRef = useRef<HTMLDivElement>(null);
  const speech = useRef<Speech | undefined>(undefined);
  /** Líneas de la última frase completa: es lo que queda a la vista al saltar el diálogo. */
  const lastSentence = useRef<string[]>([]);
  /** Lo que se pinta: copia del estado de la escritura (las refs no se leen al renderizar). */
  const [view, setView] = useState<{ shown: string[]; full: string[]; more: boolean }>({ shown: [], full: [], more: false });
  const [done, setDone] = useState(false);
  const notified = useRef(false);

  const publish = () => {
    const sp = speech.current;
    if (sp) setView({ shown: visibleLines(sp), full: sp.pages[sp.page] ?? [], more: hasMore(sp) });
  };

  const finish = () => {
    if (notified.current) return;
    notified.current = true;
    setDone(true);
    onDone();
  };

  useEffect(() => {
    const width = Math.max(120, textRef.current?.clientWidth ?? 240);
    let raf = 0;
    let last: number | undefined;
    let cancelled = false;
    // Sin `document.fonts` (pruebas) se mide igualmente
    void Promise.resolve(document.fonts?.load(FONT))
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        const { pages, lastSentence: finalSentence } = toPages(lines, width);
        lastSentence.current = finalSentence;
        speech.current = createSpeech(pages);
        const loop = (now: number) => {
          const sp = speech.current!;
          const dt = last === undefined ? 1 : Math.min(3, (now - last) / (1000 / 60));
          last = now;
          stepSpeech(sp, dt, reduced);
          if (lastPageWritten(sp)) finish();
          publish();
          if (!sp.done) raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // Cada paso monta su propia caja (key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tap() {
    const sp = speech.current;
    if (!sp || lastPageWritten(sp)) return;
    tapSpeech(sp);
    if (lastPageWritten(sp)) finish();
    publish();
  }

  function skip() {
    const sp = speech.current;
    if (sp) {
      sp.page = sp.pages.length - 1;
      sp.shown = Infinity;
      setView({ shown: lastSentence.current, full: lastSentence.current, more: false });
    }
    finish();
  }

  return (
    <div className="dialogue" role="group" aria-label={t('onboarding.dialogue')}>
      <ArvidPreview size={56} talking={!done} />
      <div className="dialogue-body" onClick={tap}>
        <p className="dialogue-name pixel">{t('arvid.name')}</p>
        <div ref={textRef} className="dialogue-text pixel" aria-hidden="true">
          {(done ? view.full : view.shown).map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {view.full.join(' ')}
        </p>
        {view.more && (
          <span className="dialogue-more" aria-hidden="true">
            ▼
          </span>
        )}
      </div>
      {!done && (
        <button type="button" className="btn btn-ghost dialogue-skip" onClick={skip}>
          {t('common.skip')}
        </button>
      )}
    </div>
  );
}
