// Deslizar hacia abajo para actualizar (D-186): sin recargar la app, descarga lo que puede haber cambiado fuera del
// dispositivo (retos, invitaciones y marcas de los demás) y sube lo pendiente. Solo con la cuenta: sin ella no hay
// nada que traer.
import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n';
import { accountsEnabled, uploadBackup, useCloud } from '../account/account';
import { refreshChallenges, refreshInvites, syncMarks } from '../challenges/challenges';
import { useData, useSettings } from '../data';

/** Cuánto hay que tirar (px) para que al soltar se actualice. */
export const PULL_THRESHOLD = 70;
const MAX_PULL = 110;

type Phase = 'idle' | 'pulling' | 'ready' | 'refreshing' | 'done' | 'offline';

export function PullToRefresh() {
  const ctx = useData();
  const account = useSettings()?.account;
  const cloud = useCloud();
  const [pull, setPull] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const start = useRef<number | undefined>(undefined);
  const latest = useRef({ ctx, account, cloud, phase });
  useEffect(() => {
    latest.current = { ctx, account, cloud, phase };
  });

  useEffect(() => {
    if (!account || !accountsEnabled()) return;
    const refresh = async () => {
      const { ctx: c, account: a, cloud: s } = latest.current;
      if (!a) return;
      if (!navigator.onLine) {
        setPhase('offline');
        return;
      }
      setPhase('refreshing');
      try {
        await syncMarks(c, a);
        await refreshChallenges(c, a);
        await refreshInvites(c, a);
        if (s.dirty && !s.conflict) await uploadBackup(c, a);
        setPhase('done');
      } catch {
        setPhase('offline');
      }
    };
    const onStart = (e: TouchEvent) => {
      const busy = latest.current.phase === 'refreshing';
      // Solo desde arriba del todo y fuera de hojas o campos de texto
      const target = e.target as HTMLElement | null;
      // En el chat, deslizar hacia abajo es para ver mensajes anteriores: ahí no hay actualizar
      if (busy || window.scrollY > 0 || location.pathname.startsWith('/chat') || target?.closest('.sheet, input, textarea, .chat')) return;
      // Dentro de algo con su propio desplazamiento (p. ej. los mensajes del chat) que no esté arriba del todo, el
      // gesto es para desplazarlo, no para actualizar
      for (let el = target; el && el !== document.body; el = el.parentElement) if (el.scrollTop > 0) return;
      start.current = e.touches[0]!.clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current === undefined) return;
      const dy = e.touches[0]!.clientY - start.current;
      if (dy <= 0 || window.scrollY > 0) {
        start.current = undefined;
        setPull(0);
        setPhase('idle');
        return;
      }
      // Resistencia: cuanto más se tira, menos avanza
      const distance = Math.min(MAX_PULL, dy * 0.5);
      setPull(distance);
      setPhase(distance >= PULL_THRESHOLD ? 'ready' : 'pulling');
    };
    const onEnd = () => {
      if (start.current === undefined) return;
      start.current = undefined;
      const ready = latest.current.phase === 'ready';
      setPull(0);
      if (ready) void refresh();
      else setPhase('idle');
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [account]);

  // «Al día» o «Sin conexión» se ven un momento y se van
  useEffect(() => {
    if (phase !== 'done' && phase !== 'offline') return;
    const timer = window.setTimeout(() => setPhase('idle'), 1400);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === 'idle') return null;
  const text =
    phase === 'pulling' ? t('refresh.pull') : phase === 'ready' ? t('refresh.release') : phase === 'refreshing' ? t('refresh.loading') : phase === 'done' ? t('refresh.done') : t('refresh.offline');
  const shown = phase === 'pulling' || phase === 'ready' ? pull : PULL_THRESHOLD * 0.7;
  return (
    <div className={`pull-refresh ${phase}`} role="status" style={{ transform: `translate(-50%, ${shown - 40}px)`, opacity: Math.min(1, shown / 40) }}>
      <span className="pull-refresh-icon" aria-hidden="true" style={{ transform: `rotate(${phase === 'refreshing' ? 0 : Math.min(180, (pull / PULL_THRESHOLD) * 180)}deg)` }}>
        ↓
      </span>
      {text}
    </div>
  );
}
