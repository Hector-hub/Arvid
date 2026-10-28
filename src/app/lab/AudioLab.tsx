// Prototipo de música en segundo plano (D-163, 1.8.0): página oculta en /lab/audio para comprobar en los teléfonos
// reales si la música sigue sonando con la pantalla bloqueada o en otra app, comparando dos formas de reproducir:
// A) como ahora, por Web Audio (volumen y fundidos), y B) directa, con Media Session (controles en la pantalla de
// bloqueo). Mide cuántos segundos avanzó la pista mientras la app estaba oculta. Textos sin traducir: es temporal.
import { useEffect, useRef, useState } from 'react';
import { TRACKS } from '../music/tracks';

type Mode = 'webaudio' | 'direct';

export function AudioLab() {
  const [log, setLog] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>();
  const [index, setIndex] = useState(0);
  const audio = useRef<HTMLAudioElement>(undefined);
  const ctx = useRef<AudioContext>(undefined);
  const hiddenAt = useRef<{ wall: number; time: number }>(undefined);
  const add = (line: string) => setLog((l) => [...l, `${new Date().toLocaleTimeString()} ${line}`]);

  // Al volver a la app: cuánto avanzó la pista mientras estaba oculta
  useEffect(() => {
    const onVisibility = () => {
      const a = audio.current;
      if (!a) return;
      if (document.hidden) {
        hiddenAt.current = { wall: Date.now(), time: a.currentTime };
        add(`Oculta · sonando: ${a.paused ? 'no' : 'sí'} · contexto: ${ctx.current?.state ?? '—'}`);
      } else if (hiddenAt.current) {
        const away = (Date.now() - hiddenAt.current.wall) / 1000;
        const played = a.currentTime - hiddenAt.current.time;
        const ok = played > away * 0.8;
        add(
          `Visible tras ${away.toFixed(0)} s fuera · la pista avanzó ${Math.max(0, played).toFixed(0)} s · ${ok ? 'SIGUIÓ SONANDO ✓' : 'SE PARÓ ✗'} · contexto: ${ctx.current?.state ?? '—'}`,
        );
        hiddenAt.current = undefined;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(
    () => () => {
      audio.current?.pause();
      void ctx.current?.close();
    },
    [],
  );

  function environment() {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
    add(`Navegador: ${navigator.userAgent}`);
    add(`App instalada (standalone): ${standalone ? 'sí' : 'no'}`);
    add(`Media Session: ${'mediaSession' in navigator ? 'sí' : 'no'}`);
    add(`Web Audio: ${'AudioContext' in window || 'webkitAudioContext' in window ? 'sí' : 'no'}`);
  }

  function setupSession(i: number) {
    if (!('mediaSession' in navigator)) return;
    const track = TRACKS[i]!;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: 'ARVID',
      album: 'ARVID',
      artwork: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => void audio.current?.play().then(() => add('Control: reproducir'))],
      ['pause', () => (audio.current?.pause(), add('Control: pausa'))],
      ['previoustrack', () => (add('Control: anterior'), void start('direct', (i - 1 + TRACKS.length) % TRACKS.length))],
      ['nexttrack', () => (add('Control: siguiente'), void start('direct', (i + 1) % TRACKS.length))],
    ];
    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        add(`Media Session: «${action}» no admitido`);
      }
    }
  }

  async function start(next: Mode, i = index) {
    audio.current?.pause();
    await ctx.current?.close().catch(() => undefined);
    ctx.current = undefined;
    const a = new Audio(TRACKS[i]!.src);
    a.loop = true;
    audio.current = a;
    setMode(next);
    setIndex(i);
    if (next === 'webaudio') {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const c = new Ctor();
      ctx.current = c;
      const gain = c.createGain();
      gain.gain.value = 0.6;
      c.createMediaElementSource(a).connect(gain).connect(c.destination);
      await c.resume().catch(() => undefined);
    } else setupSession(i);
    try {
      await a.play();
      add(`Modo ${next === 'webaudio' ? 'A (Web Audio)' : 'B (directa + controles)'} · sonando «${TRACKS[i]!.name}»`);
      add('Ahora bloquea la pantalla o cambia de app 30 s y vuelve');
    } catch (e) {
      add(`No se pudo reproducir: ${(e as Error).message}`);
    }
  }

  function stop() {
    audio.current?.pause();
    void ctx.current?.close();
    ctx.current = undefined;
    setMode(undefined);
    add('Parada');
  }

  return (
    <main className="stack" style={{ padding: 'var(--s4)' }}>
      <h1>Prueba de música en segundo plano</h1>
      <p className="small muted">
        Página oculta (D-163). Elige un modo, bloquea la pantalla o cambia de app unos 30 s y vuelve: el registro dirá si
        siguió sonando. Prueba los dos modos y, con el B, los controles de la pantalla de bloqueo. Luego copia el resultado.
      </p>
      <div className="stack" style={{ gap: 'var(--s2)' }}>
        <button type="button" className="btn" onClick={environment}>
          1. Ver el entorno
        </button>
        <button type="button" className="btn btn-primary" onClick={() => void start('webaudio')}>
          2. Modo A: como ahora (Web Audio)
        </button>
        <button type="button" className="btn btn-primary" onClick={() => void start('direct')}>
          3. Modo B: directa con controles
        </button>
        <button type="button" className="btn" disabled={!mode} onClick={stop}>
          Parar
        </button>
        <button type="button" className="btn" disabled={!log.length} onClick={() => void navigator.clipboard?.writeText(log.join('\n'))}>
          Copiar resultado
        </button>
      </div>
      <pre className="small" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} aria-live="polite">
        {log.join('\n')}
      </pre>
    </main>
  );
}
