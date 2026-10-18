// Estado compartido de la escena (spec 05, UB-04): Hoy y Personaje dibujan la misma simulación, así que al cambiar
// de pestaña los vehículos, los peatones y el desplazamiento siguen donde estaban.
// Este módulo es ligero (solo dominio): lo importan las pantallas para lanzar partículas sin cargar el dibujo.
import {
  burst,
  createScene,
  duePendingBursts,
  seededRng,
  stepScene,
  type BurstKind,
  type PendingBurst,
  type SceneConfig,
} from '../../domain/scene/scene';
import { EXTRAS_FRAME, PEDESTRIANS } from './extras';

/** Vehículos de Warped City; sus anchos van en `config.carWidths`, en el mismo orden. */
export const CAR_FILES = ['v-red.png', 'v-yellow.png', 'v-police.png'];

const config: SceneConfig = {
  carWidths: [96, 93, 163],
  pedestrians: PEDESTRIANS,
  frameSize: EXTRAS_FRAME,
};

const rng = seededRng(Date.now());
export const scene = createScene(rng);
export const sceneConfig = config;

let lastTime: number | undefined;
/** Lienzos visibles ahora mismo (en pantalla y con la app visible). */
let active = 0;
let pending: PendingBurst[] = [];

const isReduced = () => typeof document !== 'undefined' && document.documentElement.dataset.motion === 'reduced';

/** Avanza la simulación hasta `now` (ms). Varios lienzos en el mismo fotograma no la aceleran. */
export function advance(now: number, reduced: boolean): void {
  const dt = lastTime === undefined ? 1 : (now - lastTime) / (1000 / 60);
  lastTime = now;
  stepScene(scene, dt, rng, config, reduced);
}

/** Tras una pausa (app oculta o lienzo fuera de la pantalla) se continúa sin saltos (ESC-10). */
export function resetClock(): void {
  lastTime = undefined;
}

/** Un lienzo pasa a estar visible: se muestran las ráfagas pendientes de menos de 10 s (PAR-03). */
export function setActive(visible: boolean): void {
  active = Math.max(0, active + (visible ? 1 : -1));
  if (visible) {
    for (const kind of duePendingBursts(pending, Date.now())) if (!isReduced()) burst(scene, kind, rng);
    pending = [];
  }
}

/**
 * Celebra un progreso con partículas (PAR-01, PAR-02). Si la escena no está a la vista, la ráfaga espera hasta
 * 10 s a que vuelva (PAR-03). Con movimiento reducido no hay partículas (PAR-05).
 */
export function celebrate(kind: BurstKind): void {
  if (isReduced()) return;
  if (active > 0) burst(scene, kind, rng);
  else pending.push({ kind, at: Date.now() });
}

/** Solo para pruebas. */
export function pendingBursts(): readonly PendingBurst[] {
  return pending;
}
