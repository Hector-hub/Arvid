// Un único AudioContext para la música y los efectos (spec 16). Los navegadores no dejan sonar hasta que el usuario
// toca algo: se crea o se reanuda en el primer gesto (y en cada vuelta a la app).
type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | undefined;
let failed = false;

/** El contexto compartido, o `undefined` si el navegador no tiene Web Audio (NFR16-02). */
export function getAudioContext(): AudioContext | undefined {
  if (ctx || failed) return ctx;
  const Ctor = (globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext) as
    | AudioContextCtor
    | undefined;
  if (!Ctor) {
    failed = true;
    return undefined;
  }
  try {
    ctx = new Ctor();
  } catch {
    failed = true;
  }
  return ctx;
}

/** Reanuda el contexto (debe llamarse desde un gesto del usuario). */
export function resumeAudio(): Promise<void> {
  return getAudioContext()?.resume().catch(() => undefined) ?? Promise.resolve();
}

/** Desbloquea el audio con los gestos que dan permiso para sonar (en iPhone, al levantar el dedo). */
export function unlockAudioOnGesture(): () => void {
  const events = ['pointerup', 'touchend', 'click', 'keydown'] as const;
  const unlock = () => {
    const c = getAudioContext();
    if (c && c.state !== 'running') void resumeAudio();
  };
  events.forEach((name) => window.addEventListener(name, unlock, { passive: true }));
  return () => events.forEach((name) => window.removeEventListener(name, unlock));
}

/** Solo para pruebas. */
export function resetAudioForTests(): void {
  ctx = undefined;
  failed = false;
}
