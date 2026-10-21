// Estado compartido de la escena (spec 05, UB-04): Hoy y Perfil dibujan la misma simulación, así que al cambiar
// de pestaña los vehículos, los peatones, ARVID y el desplazamiento siguen donde estaban.
// También es la voz de ARVID (spec 06, BP): lo que dice se dibuja en la escena y se publica para la región accesible.
// Este módulo es ligero (solo dominio): lo importan las pantallas para lanzar partículas o hacer hablar a ARVID
// sin cargar el dibujo.
import { createSpeech, pageText, stepSpeech, tapSpeech, type Speech } from '../../domain/arvid/speech';
import type { Companion } from '../../domain/arvid/companion';
import { isHome, startEntrance } from '../../domain/scene/arvid';
import { DARIS_ENTRY_FRAMES } from './daris';
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
import { SKY_MODELS } from './sky';

/** Vehículos de Warped City; sus anchos van en `config.carWidths`, en el mismo orden. */
export const CAR_FILES = ['v-red.png', 'v-yellow.png', 'v-police.png'];
/** Detalles de la acera (MV-03); sus medidas van en `config.props`, en el mismo orden. */
export const PROP_FILES = ['prop-control-box-1.png', 'prop-control-box-2.png'];

const config: SceneConfig = {
  carWidths: [96, 93, 163],
  pedestrians: PEDESTRIANS,
  frameSize: EXTRAS_FRAME,
  props: [
    { width: 32, height: 30 },
    { width: 17, height: 27 },
  ],
  skyModels: SKY_MODELS,
};

const rng = seededRng(Date.now());
export const scene = createScene(rng);
export const sceneConfig = config;

let lastTime: number | undefined;
/** Lienzos visibles ahora mismo (en pantalla y con la app visible). */
let active = 0;
let pending: PendingBurst[] = [];
/** ARVID llega volando la primera vez que se ve la escena en cada apertura (MV-01). */
let entered = false;
/** La presentación de la fecha (UB-06) retiene la entrada de ARVID hasta que se abre la escena. */
let entranceHeld = false;
let introPlayed = false;

// ---------- Compañero (spec 08) ----------
let companion: Companion = 'arvid';
/** Fotograma (scene.t) en que empezó la entrada de DARIS y su última celebración. */
let darisEntryT: number | undefined;
let darisCheerT: number | undefined;

/** Cambia el compañero de la escena; si ya se había visto, el nuevo hace su entrada (CO-03). */
export function setCompanion(next: Companion): void {
  if (next === companion) return;
  companion = next;
  hush();
  if (entered && !isReduced()) beginEntrance();
}

export function getCompanion(): Companion {
  return companion;
}

function beginEntrance() {
  if (companion === 'daris') darisEntryT = scene.t;
  else startEntrance(scene.arvid, rng);
}

const darisEntering = () => darisEntryT !== undefined && scene.t - darisEntryT < DARIS_ENTRY_FRAMES;

/** El compañero está en su sitio (para empezar a hablar, MV-04). */
function companionHome(): boolean {
  return companion === 'daris' ? !darisEntering() : isHome(scene.arvid);
}

/** DARIS hace su salto de corazones (DE-02): subida de nivel, logro y día completo. */
export function cheer(): void {
  if (companion === 'daris' && !isReduced()) darisCheerT = scene.t;
}

/** Estado de DARIS para dibujarla. */
export function darisState(): { entryT?: number; cheerT?: number } {
  return { entryT: darisEntryT, cheerT: darisCheerT };
}

const isReduced = () => typeof document !== 'undefined' && document.documentElement.dataset.motion === 'reduced';

// ---------- Voz de ARVID ----------
let speech: Speech | undefined;
/** Lo que ARVID quiere decir cuando llegue a su sitio (MV-04). */
let queued: string[][] | undefined;
const speechListeners = new Set<() => void>();
let speechSnapshot = '';

function publishSpeech(force = false) {
  const text = speech && !speech.done ? pageText(speech) : '';
  if (text === speechSnapshot && !force) return;
  speechSnapshot = text;
  for (const l of speechListeners) l();
}

export function subscribeSpeech(listener: () => void): () => void {
  speechListeners.add(listener);
  return () => speechListeners.delete(listener);
}

/** Página que ARVID está diciendo (vacío si no habla), para la región `role="status"` (BP-04). */
export function currentSpeechText(): string {
  return speechSnapshot;
}

export function currentSpeech(): Speech | undefined {
  return speech && !speech.done ? speech : undefined;
}

let userChatted = false;
/** El usuario ya habló con ARVID en esta sesión: los momentos automáticos no le interrumpen (CH-03). */
export function markUserChat(): void {
  userChatted = true;
}
export function hasUserChatted(): boolean {
  return userChatted;
}

/** ARVID está hablando o a punto de hacerlo. */
export function isTalking(): boolean {
  return !!queued || !!currentSpeech();
}

/**
 * Hace hablar a ARVID con el texto ya repartido en páginas (BP-02). Vuelve a su sitio y empieza al llegar (MV-04).
 * Sustituye lo que estuviera diciendo.
 */
export function say(pages: string[][]): void {
  if (pages.length === 0) return;
  queued = pages;
  speech = undefined;
  scene.arvid.wantsHome = true;
  // Aviso aunque el texto visible aún no cambie: la escena con movimiento reducido despierta para hablar
  publishSpeech(true);
}

/** Calla a ARVID (p. ej. al cambiar de idioma o al cerrar la app). */
export function hush(): void {
  queued = undefined;
  speech = undefined;
  scene.arvid.wantsHome = false;
  publishSpeech();
}

/** Toque en la escena: completa o pasa la página de la burbuja (BP-02). */
export function tapScene(): void {
  if (!speech || speech.done) return;
  tapSpeech(speech);
  publishSpeech();
}

function stepVoice(dt: number, reduced: boolean) {
  if (queued && (companionHome() || reduced)) {
    speech = createSpeech(queued);
    queued = undefined;
  }
  if (!speech) return;
  stepSpeech(speech, dt, reduced);
  if (speech.done) {
    speech = undefined;
    if (!queued) scene.arvid.wantsHome = false;
  }
  publishSpeech();
}

// ---------- Tiempo ----------
/** Avanza la simulación hasta `now` (ms). Varios lienzos en el mismo fotograma no la aceleran. */
export function advance(now: number, reduced: boolean): void {
  const dt = lastTime === undefined ? 1 : Math.min(3, (now - lastTime) / (1000 / 60));
  lastTime = now;
  stepScene(scene, dt, rng, config, reduced);
  parkArvid();
  stepVoice(dt, reduced);
  notifyReady();
}

/** Con DARIS, ARVID no sale de paseo (su simulación sigue, invisible, en su sitio). */
function parkArvid() {
  if (companion === 'daris') scene.arvid.nextOuting = Number.MAX_SAFE_INTEGER;
}

/** Avanza un número fijo de fotogramas de 60 Hz (movimiento reducido: ticks lentos de duración conocida). */
export function advanceFrames(dt: number, reduced: boolean): void {
  stepScene(scene, dt, rng, config, reduced);
  parkArvid();
  stepVoice(dt, reduced);
  notifyReady();
}

/** Tras una pausa (app oculta o lienzo fuera de la pantalla) se continúa sin saltos (ESC-10). */
export function resetClock(): void {
  lastTime = undefined;
}

/** Un lienzo pasa a estar visible: entrada de ARVID la primera vez y ráfagas pendientes de menos de 10 s (PAR-03). */
export function setActive(visible: boolean): void {
  active = Math.max(0, active + (visible ? 1 : -1));
  if (!visible) return;
  if (!entered && !entranceHeld) {
    entered = true;
    if (!isReduced()) beginEntrance();
  }
  for (const kind of duePendingBursts(pending, Date.now())) if (!isReduced()) burst(scene, kind, rng);
  pending = [];
  notifyReady();
}

/** ARVID ya terminó de llegar y está en su sitio (para empezar a hablar al abrir la app). */
export function arvidReady(): boolean {
  return entered && companionHome();
}

/**
 * Presentación de la fecha al abrir la app (UB-06): solo la primera vez que se ve la escena en cada apertura y sin
 * movimiento reducido. `claimIntro` la reserva y retiene la entrada de ARVID; `releaseEntrance` la suelta.
 */
export function introAvailable(): boolean {
  return !introPlayed && !entered && !isReduced();
}

export function claimIntro(): void {
  introPlayed = true;
  entranceHeld = true;
}

export function releaseEntrance(): void {
  if (!entranceHeld) return;
  entranceHeld = false;
  if (active > 0 && !entered) {
    entered = true;
    if (!isReduced()) beginEntrance();
    notifyReady();
  }
}

const readyListeners = new Set<() => void>();

/** Avisa (una vez) cuando ARVID ha llegado a su sitio; en el acto si ya está. Devuelve la baja. */
export function onArvidReady(listener: () => void): () => void {
  if (arvidReady()) {
    listener();
    return () => undefined;
  }
  readyListeners.add(listener);
  return () => readyListeners.delete(listener);
}

function notifyReady() {
  if (readyListeners.size === 0 || !arvidReady()) return;
  const listeners = [...readyListeners];
  readyListeners.clear();
  for (const l of listeners) l();
}

/**
 * Celebra un progreso con partículas (PAR-01, PAR-02) y un salto de ARVID. Si la escena no está a la vista, la
 * ráfaga espera hasta 10 s a que vuelva (PAR-03). Con movimiento reducido no hay partículas (PAR-05).
 */
export function celebrate(kind: BurstKind): void {
  if (isReduced()) return;
  if (kind === 'big') cheer();
  if (active > 0) burst(scene, kind, rng);
  else pending.push({ kind, at: Date.now() });
}

/** Solo para pruebas. */
export function pendingBursts(): readonly PendingBurst[] {
  return pending;
}
