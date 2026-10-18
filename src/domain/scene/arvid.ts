// Movimiento de ARVID en la escena (spec 06, MV-01 a MV-06). Puro y determinista: el azar llega como `rng` y el
// tiempo como `dt` en fotogramas de 60 Hz. Las posiciones son el centro del dron en el lienzo lógico de 384×192.

type Rng = () => number;
const R = (rng: Rng, a: number, b: number) => a + rng() * (b - a);

/** Sitio de ARVID: detrás y por encima del hombro del protagonista. */
export const ARVID_HOME = { x: 132, y: 112 } as const;
/** Zona por la que pasea (alta y media de la escena). */
export const ARVID_AREA = { minX: 30, maxX: 354, minY: 30, maxY: 115 } as const;

const ENTER_FRAMES = 120; // ~2 s
const SPEED = 0.3; // paseo pausado
const RETURN_SPEED = 0.9; // vuelve más deprisa cuando tiene que hablar
const HOP_FRAMES = 20;

export type EnterKind = 'depth' | 'left' | 'top';
export const ENTER_KINDS: readonly EnterKind[] = ['depth', 'left', 'top'];

type Phase = 'entering' | 'home' | 'wander' | 'hover' | 'toProp' | 'scanProp' | 'returning';

interface Pose {
  x: number;
  y: number;
  scale: number;
  alpha: number;
}

export interface ArvidState extends Pose {
  phase: Phase;
  enter?: { kind: EnterKind; from: Pose; t: number };
  target?: { x: number; y: number };
  /** Fotogramas que le quedan a la fase actual (flotar o escanear). */
  timer: number;
  /** Fotogramas hasta la próxima salida. */
  nextOuting: number;
  propId?: number;
  /** Fotogramas que le quedan al salto de celebración. */
  hop: number;
  /** Debe volver a su sitio (para hablar, MV-04). */
  wantsHome: boolean;
}

/** Detalle de la acera que se desplaza con el suelo (MV-03). */
export interface Prop {
  id: number;
  kind: number;
  /** Posición en el mundo (x de pantalla = wx − offset). */
  wx: number;
}

export interface PropSpec {
  width: number;
  height: number;
}

export function createArvid(): ArvidState {
  return { ...ARVID_HOME, scale: 1, alpha: 1, phase: 'home', timer: 0, nextOuting: 1200, hop: 0, wantsHome: false };
}

/** Empieza la entrada por una de las 3 vías (MV-01); `kind` al azar si no se indica. */
export function startEntrance(a: ArvidState, rng: Rng, kind: EnterKind = ENTER_KINDS[Math.floor(rng() * 3)]!): void {
  const from: Pose =
    kind === 'depth'
      ? { x: ARVID_HOME.x + 70, y: ARVID_HOME.y - 55, scale: 0.35, alpha: 0.3 }
      : kind === 'left'
        ? { x: -30, y: ARVID_HOME.y - 10, scale: 1, alpha: 1 }
        : { x: ARVID_HOME.x, y: -30, scale: 1, alpha: 1 };
  Object.assign(a, from, { phase: 'entering', enter: { kind, from, t: 0 }, target: undefined, propId: undefined });
}

export const isHome = (a: ArvidState) => a.phase === 'home';

/** Salto corto al celebrar (AV-02). */
export function hop(a: ArvidState): void {
  a.hop = HOP_FRAMES;
}

/** Desplazamiento vertical del salto (0 a −3 px). */
export function hopOffset(a: ArvidState): number {
  return a.hop > 0 ? -3 * Math.sin(Math.PI * (1 - a.hop / HOP_FRAMES)) : 0;
}

const easeOut = (p: number) => 1 - (1 - p) ** 3;

/** Avanza hacia `target`; devuelve true al llegar. */
function moveTo(a: ArvidState, target: { x: number; y: number }, speed: number, dt: number): boolean {
  const dx = target.x - a.x;
  const dy = target.y - a.y;
  const dist = Math.hypot(dx, dy);
  const step = speed * dt;
  if (dist <= step) {
    a.x = target.x;
    a.y = target.y;
    return true;
  }
  a.x += (dx / dist) * step;
  a.y += (dy / dist) * step;
  return false;
}

function propTarget(p: Prop, offset: number, specs: readonly PropSpec[], baseline: number) {
  const spec = specs[p.kind];
  if (!spec) return undefined;
  return { x: p.wx - offset + spec.width / 2, y: baseline - spec.height - 22 };
}

function goHome(a: ArvidState) {
  a.phase = 'returning';
  a.target = { ...ARVID_HOME };
  a.propId = undefined;
}

/**
 * Avanza a ARVID `dt` fotogramas. `props` son los detalles visibles de la acera con su `offset`, para que pueda
 * ir a inspeccionarlos. Con `reduced` (movimiento reducido, MV-05) se queda quieto en su sitio.
 */
export function stepArvid(
  a: ArvidState,
  dt: number,
  rng: Rng,
  world: { props: readonly Prop[]; offset: number; specs: readonly PropSpec[]; baseline: number },
  reduced = false,
): void {
  if (reduced) {
    Object.assign(a, ARVID_HOME, { scale: 1, alpha: 1, phase: 'home', enter: undefined, target: undefined, hop: 0 });
    return;
  }
  if (a.hop > 0) a.hop = Math.max(0, a.hop - dt);
  if (a.wantsHome && a.phase !== 'home' && a.phase !== 'entering' && a.phase !== 'returning') goHome(a);

  switch (a.phase) {
    case 'entering': {
      const e = a.enter!;
      e.t += dt;
      const p = easeOut(Math.min(1, e.t / ENTER_FRAMES));
      a.x = e.from.x + (ARVID_HOME.x - e.from.x) * p;
      a.y = e.from.y + (ARVID_HOME.y - e.from.y) * p;
      a.scale = e.from.scale + (1 - e.from.scale) * p;
      a.alpha = e.from.alpha + (1 - e.from.alpha) * p;
      if (e.t >= ENTER_FRAMES) {
        Object.assign(a, ARVID_HOME, { scale: 1, alpha: 1, phase: 'home', enter: undefined, nextOuting: R(rng, 1200, 2400) });
      }
      return;
    }
    case 'home': {
      if (a.wantsHome) return;
      a.nextOuting -= dt;
      if (a.nextOuting > 0) return;
      // Detalles visibles y lejos de los bordes; 1 de cada 3 veces va a uno (MV-03)
      const visible = world.props.filter((p) => {
        const x = p.wx - world.offset;
        return x > 60 && x < 300;
      });
      if (visible.length > 0 && rng() < 1 / 3) {
        a.phase = 'toProp';
        a.propId = visible[Math.floor(rng() * visible.length)]!.id;
      } else {
        a.phase = 'wander';
        a.target = { x: R(rng, ARVID_AREA.minX, ARVID_AREA.maxX), y: R(rng, ARVID_AREA.minY, ARVID_AREA.maxY) };
      }
      return;
    }
    case 'wander':
      if (moveTo(a, a.target!, SPEED, dt)) {
        a.phase = 'hover';
        a.timer = R(rng, 180, 360);
      }
      return;
    case 'hover':
      if ((a.timer -= dt) <= 0) goHome(a);
      return;
    case 'toProp':
    case 'scanProp': {
      const prop = world.props.find((p) => p.id === a.propId);
      const target = prop && propTarget(prop, world.offset, world.specs, world.baseline);
      // Si el detalle ya salió de la escena, vuelve
      if (!target || target.x < ARVID_AREA.minX) return goHome(a);
      if (a.phase === 'toProp') {
        if (moveTo(a, target, SPEED * 1.5, dt)) {
          a.phase = 'scanProp';
          a.timer = R(rng, 120, 180);
        }
      } else {
        // Lo sigue mientras el suelo se desplaza
        a.x = target.x;
        a.y = target.y;
        if ((a.timer -= dt) <= 0) goHome(a);
      }
      return;
    }
    case 'returning':
      if (moveTo(a, ARVID_HOME, a.wantsHome ? RETURN_SPEED : SPEED, dt)) {
        a.phase = 'home';
        a.target = undefined;
        a.nextOuting = R(rng, 1200, 2400);
      }
      return;
  }
}

/** ARVID escanea (luz encendida) al inspeccionar un detalle (AV-02). */
export const isScanningProp = (a: ArvidState) => a.phase === 'scanProp';

// ---------- Detalles de la acera ----------
/** Aparece uno cada 15–30 s por la derecha, con el suelo. */
export function nextPropDelay(rng: Rng): number {
  return R(rng, 900, 1800);
}
