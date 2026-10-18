import { useEffect, useRef } from 'react';
import { useMusic } from './MusicProvider';

/** El nombre de la pista se ve 5 s y luego se desvanece (MUS-08). */
const TRACK_NAME_MS = 5_000;
const TRACK_FADE_MS = 800;

/**
 * Nombre de la pista que acaba de empezar, arriba a la izquierda de la escena (MUS-08). Se anima desde que empezó la
 * pista, así que al cambiar de pantalla no vuelve a aparecer; con movimiento reducido desaparece sin fundido.
 */
export function TrackName() {
  const { track, startedAt } = useMusic();
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !startedAt || typeof el.animate !== 'function') return;
    const total = TRACK_NAME_MS + TRACK_FADE_MS;
    const elapsed = Date.now() - startedAt;
    if (elapsed >= total) return;
    const shown = TRACK_NAME_MS / total;
    const reduced = document.documentElement.dataset.motion === 'reduced';
    const anim = el.animate(
      reduced
        ? [{ opacity: 1 }, { opacity: 1, offset: shown }, { opacity: 0, offset: shown }, { opacity: 0 }]
        : [{ opacity: 0 }, { opacity: 1, offset: 0.04 }, { opacity: 1, offset: shown }, { opacity: 0 }],
      { duration: total, fill: 'forwards' },
    );
    anim.currentTime = elapsed;
    return () => anim.cancel();
  }, [startedAt]);
  if (!track) return null;
  return (
    <p ref={ref} className="track-name pixel" aria-hidden="true">
      ♪ {track.name}
    </p>
  );
}
