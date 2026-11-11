// La señal a pantalla completa (spec 17): el primer contacto con el buscador (PC) o una transmisión al volver a verla
// desde «???» (TR-08). Diálogo modal «Señal desconocida» con los subtítulos en una región `aria-live` (PC-10).
import { useEffect, useEffectEvent, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cueKey, SESSIONS, type VoiceId } from '../../domain/origen/origen';
import { t, tDynamic, useLocale } from '../../i18n';
import { useMusic } from '../music/MusicProvider';
import { useSettings } from '../data';
import { useReducedMotion } from '../motion';
import { suppressSfx } from '../sound/sfx';
import { playSignal } from './signal';
import type { SignalAssets } from './assets';

/** Marca del buscador de la portada (R17-1): con 'neutral', sin nombre ni logo. */
export const SEARCH_BRAND: 'google' | 'neutral' = 'google';

const TRENDS = 7;

function regionName(locale: string): string {
  try {
    const region = navigator.languages?.map((l) => l.split('-')[1]).find((r) => r && /^[A-Z]{2}$/.test(r)) ?? 'DO';
    return new Intl.DisplayNames([locale], { type: 'region' }).of(region) ?? '';
  } catch {
    return '';
  }
}

export function SignalOverlay({
  mode,
  session = 1,
  voice,
  assets,
  onVoiceEnd,
  onDone,
}: {
  mode: 'first' | 'chapter' | 'replay' | 'blip';
  session?: number;
  voice: VoiceId;
  assets: SignalAssets;
  onVoiceEnd?: () => void;
  onDone: () => void;
}) {
  const locale = useLocale();
  const settings = useSettings();
  const reduced = useReducedMotion();
  const music = useMusic();
  const root = useRef<HTMLDivElement>(null);
  const voiceEnded = useEffectEvent(() => onVoiceEnd?.());
  const done = useEffectEvent(() => onDone());
  const sound = settings?.sound;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = <T extends HTMLElement>(name: string) => el.querySelector<T>(`[data-s="${name}"]`)!;
    el.focus();
    // La música se calla y los demás efectos también mientras dura (PC-09)
    const resumeMusic = music.hush();
    const resumeSfx = suppressSfx();
    const data = SESSIONS[session] ?? SESSIONS[1]!;
    const cues = Array.from({ length: data.cues }, (_, i) => tDynamic(cueKey(session, i, voice)));
    const stop = playSignal(
      {
        root: el,
        canvas: q<HTMLCanvasElement>('canvas'),
        search:
          mode === 'first'
            ? { layer: q('layer'), wrap: q('wrap'), page: q('page'), slices: q('slices'), bars: q('bars'), dim: q('dim'), scan: q('scan'), text: q('text'), caret: q('caret') }
            : undefined,
        box: q('box'),
        boxText: q('boxText'),
        boxDot: q('boxDot'),
      },
      {
        query: t('origen.query'),
        cues,
        track: data.tracks[voice],
        voice: assets.voice,
        volume: sound?.effects === false ? null : (sound?.volume ?? 0.5),
        reduced,
        figure: assets.figure,
        mode,
        onVoiceEnd: voiceEnded,
        onDone: done,
      },
    );
    return () => {
      stop();
      resumeSfx();
      resumeMusic();
    };
    // Una sola vez por montaje: la secuencia no se reinicia si cambian ajustes a mitad
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      ref={root}
      className={`signal${mode === 'replay' ? ' replay' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={t('origen.dialog')}
      tabIndex={-1}
      onKeyDown={(e) => mode === 'first' && e.key === 'Escape' && e.preventDefault()}
    >
      <canvas data-s="canvas" className="signal-layer signal-canvas" aria-hidden="true" />
      {mode === 'first' && (
        <div data-s="layer" className="signal-layer signal-search" aria-hidden="true" hidden>
          <div data-s="wrap" className="signal-layer">
            <SearchPage locale={locale} />
          </div>
          <div data-s="slices" className="signal-layer" />
          <div data-s="bars" className="signal-layer signal-bars" />
          <div data-s="dim" className="signal-layer signal-dim" />
          <div data-s="scan" className="signal-layer signal-scanlines" />
        </div>
      )}
      <div data-s="box" className="signal-box" hidden>
        <p className="signal-box-name">
          <span>{t('origen.name')}</span>
          <span className="signal-tag">
            <i data-s="boxDot" />
            {t('origen.tag')}
          </span>
        </p>
        <div data-s="boxText" className="signal-box-text" aria-live="polite" />
      </div>
      {mode === 'replay' && (
        <button type="button" className="btn signal-close" onClick={() => onDone()}>
          {t('origen.chats.close')}
        </button>
      )}
    </div>,
    document.body,
  );
}

/** Réplica de la portada del buscador (PC-03): sin conexión, sin nada que se pueda tocar. */
function SearchPage({ locale }: { locale: string }) {
  const gray = '#656773';
  return (
    <div data-s="page" className="sg-page">
      <svg style={{ left: 19, top: 17 }} width="18" height="14" viewBox="0 0 18 14">
        <path d="M0 1h18M0 7h18M0 13h18" stroke={gray} strokeWidth="2" />
      </svg>
      <span className="sg-tab on" style={{ left: 80, top: 16 }}>
        {t('origen.search.all')}
      </span>
      <i className="sg-ul" style={{ left: 72, top: 46, width: 51 }} />
      <span className="sg-tab" style={{ left: 80, top: 65 }}>
        {t('origen.search.images')}
      </span>
      <svg style={{ right: 195, top: 13 }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={gray} strokeWidth="2" strokeLinejoin="round">
        <path d="M12 3.2a5.8 5.8 0 0 0-5.8 5.8v4.6L4.4 16.4v.9h15.2v-.9L17.8 13.6V9A5.8 5.8 0 0 0 12 3.2z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
      <svg style={{ right: 148, top: 14 }} width="20" height="20" viewBox="0 0 20 20" fill={gray}>
        {[3, 10, 17].flatMap((y) => [3, 10, 17].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.1" />))}
      </svg>
      <span className="sg-btn">{t('origen.search.signIn')}</span>
      {SEARCH_BRAND === 'google' && (
        <svg className="sg-logo" width="390" height="230" viewBox="0 0 390 230" fill="none" strokeWidth="6.2">
          <path d="M143.9 165.7 A15 15 0 1 0 148.3 176.3" stroke="#3186ff" />
          <path d="M151.3 176.3H134" stroke="#3186ff" />
          <circle cx="166.7" cy="181.4" r="10.2" stroke="#fc413d" />
          <circle cx="195.7" cy="181.4" r="10.2" stroke="#ffbe00" />
          <circle cx="222.6" cy="181.4" r="10.2" stroke="#3186ff" />
          <path d="M232.9 168V194.5A10 9.3 0 0 1 214.2 199" stroke="#3186ff" />
          <path d="M243 158.7V194.5" stroke="#00af57" />
          <path d="M250.6 181.4H270.2A10 10 0 1 0 267.7 188" stroke="#fc413d" />
        </svg>
      )}
      <div className="sg-box">
        <svg style={{ left: 13, top: 13 }} width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2.3">
          <circle cx="10" cy="10" r="6.6" />
          <path d="M15 15l5.6 5.6" />
        </svg>
        <span className="sg-q">
          <span data-s="text" />
          <i data-s="caret" className="sg-caret" />
        </span>
        <svg style={{ right: 65, top: 12 }} width="22" height="22" viewBox="0 0 24 24">
          <rect x="8.6" y="2.2" width="6.8" height="11.6" rx="3.4" fill="#4e5059" />
          <g fill="none" stroke="#4e5059" strokeWidth="2.2">
            <path d="M5.3 11.2a6.7 6.7 0 0 0 13.4 0" />
            <path d="M12 18v3.6" />
          </g>
        </svg>
        <svg style={{ right: 18, top: 12 }} width="22" height="22" viewBox="0 0 24 24">
          <g fill="none" stroke="#4e5059" strokeWidth="2.2" strokeLinejoin="round">
            <path d="M8.6 5.4l1.3-2h4.2l1.3 2H18a3 3 0 0 1 3 3v9.4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8.4a3 3 0 0 1 3-3z" />
          </g>
          <circle cx="12" cy="13" r="3.2" fill="#4e5059" />
        </svg>
      </div>
      {SEARCH_BRAND === 'google' && (
        <p className="sg-avail">
          {t('origen.search.offered')}
          <span>{t('origen.search.offeredLang')}</span>
        </p>
      )}
      <h2 className="sg-h">{t('origen.search.trends')}</h2>
      <ul className="sg-list">
        {Array.from({ length: TRENDS }, (_, i) => (
          <li key={i}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4e5059" strokeWidth="2.2" strokeLinejoin="round">
              <path d="M2.5 17.5l6.5-6.5 4 4 7.5-7.5" />
              <path d="M14.5 7.5h6v6" />
            </svg>
            {tDynamic(`origen.search.trend.${i}`)}
          </li>
        ))}
      </ul>
      <div className="sg-foot">
        <span>{regionName(locale)}</span>
      </div>
    </div>
  );
}
