// Listas que se reordenan con animación (D-162). Al completar una tarjeta, se queda en su sitio mientras termina su
// propia animación (barra y «Hecho») y después baja deslizándose; las que estaban debajo suben una tras otra, como una
// ola. Técnica FLIP: se mide dónde estaba cada fila, se reordena y cada una se anima desde su sitio anterior.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/** Lo que tarda la animación de completar (la barra se rellena y entra «Hecho») antes de reordenar. */
export const HOLD_MS = 850;

/**
 * Orden que se muestra: el de `items`, salvo justo después de completar algo, que mantiene el anterior `holdMs`
 * para que se vea la animación de la tarjeta en su sitio.
 */
export function useHeldOrder<T>(items: readonly T[], key: (item: T) => string, done: (item: T) => boolean, holdMs = HOLD_MS): T[] {
  const ids = items.map(key);
  const idsKey = ids.join('|');
  const doneKey = items.filter(done).map(key).join('|');
  const [order, setOrder] = useState<string[]>(ids);
  const prevDone = useRef(new Set(items.filter(done).map(key)));

  useEffect(() => {
    const desired = idsKey ? idsKey.split('|') : [];
    const nowDone = new Set(doneKey ? doneKey.split('|') : []);
    const justDone = [...nowDone].some((id) => !prevDone.current.has(id));
    prevDone.current = nowDone;
    if (!justDone) {
      setOrder(desired);
      return;
    }
    // Se mantiene el orden anterior (las nuevas, al final) y se reordena al terminar la animación
    setOrder((prev) => [...prev.filter((id) => desired.includes(id)), ...desired.filter((id) => !prev.includes(id))]);
    const timer = window.setTimeout(() => setOrder(desired), holdMs);
    return () => window.clearTimeout(timer);
  }, [idsKey, doneKey, holdMs]);

  const byId = new Map(items.map((item) => [key(item), item]));
  const shown = order.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  return [...shown, ...items.filter((item) => !order.includes(key(item)))];
}

/** Movimiento reducido efectivo (ajuste o sistema), como lo deja `useMotionPreference` en la raíz. */
const reducedMotion = () => document.documentElement.dataset.motion === 'reduced';

/**
 * `<ul>` cuyas filas (hijos con `data-flip-key`) se animan al cambiar de orden: la que más se desplaza viaja por
 * encima, algo elevada; las demás se recolocan una tras otra con un pequeño rebote, en el orden en que las cruza.
 */
export function FlipList({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const list = useRef<HTMLUListElement>(null);
  const tops = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const ul = list.current;
    if (!ul) return;
    // `offsetTop` (la lista es su referencia): no le afectan el scroll ni las animaciones en curso
    const rows = [...ul.querySelectorAll<HTMLElement>(':scope > [data-flip-key]')];
    const now = new Map(rows.map((el) => [el.dataset.flipKey!, el.offsetTop]));
    const before = tops.current;
    tops.current = now;
    if (reducedMotion() || typeof rows[0]?.animate !== 'function') return;

    const moved = rows
      .map((el) => ({ el, delta: (before.get(el.dataset.flipKey!) ?? now.get(el.dataset.flipKey!)!) - now.get(el.dataset.flipKey!)! }))
      .filter((m) => Math.abs(m.delta) > 1);
    if (moved.length === 0) return;

    // La viajera es la que más se desplaza; las demás se recolocan en el orden en que las cruza (la ola)
    const traveler = moved.reduce((a, b) => (Math.abs(b.delta) > Math.abs(a.delta) ? b : a));
    const others = moved.filter((m) => m !== traveler).sort((a, b) => (traveler.delta < 0 ? 1 : -1) * (b.delta - a.delta));
    const travel = 520 + others.length * 70;

    traveler.el.animate(
      [
        { transform: `translateY(${traveler.delta}px) scale(1)`, zIndex: 2, filter: 'brightness(1)' },
        { transform: `translateY(${traveler.delta / 2}px) scale(1.03)`, zIndex: 2, filter: 'brightness(1.15)', offset: 0.5 },
        { transform: 'translateY(0) scale(1)', zIndex: 2, filter: 'brightness(1)' },
      ],
      { duration: travel, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
    );
    others.forEach((m, i) =>
      m.el.animate([{ transform: `translateY(${m.delta}px)` }, { transform: 'translateY(0)' }], {
        duration: 460,
        delay: 80 + i * 70,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        fill: 'backwards',
      }),
    );
  });

  return (
    <ul ref={list} className={className} style={{ position: 'relative', ...style }}>
      {children}
    </ul>
  );
}
