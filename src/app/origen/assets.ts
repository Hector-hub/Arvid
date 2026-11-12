// Lo que necesita la señal antes de empezar (NFR17-06): la figura y la voz decodificada. Se prepara una vez y se
// reutiliza. Sin conexión ni voz, la secuencia funciona igual, en silencio y con sus subtítulos (PC-09).
import { voiceSrc, type VoiceId } from '../../domain/origen/origen';
import { getAudioContext } from '../sound/audio';
import { CASTS, type Avatar } from '../../domain/avatar/catalog';
import { loadHero } from '../scene/assets';
import { FACE, FACES } from '../../domain/avatar/portrait';
import { drawFace, loadPortrait } from '../avatar/portraitAssets';

export interface SignalAssets {
  figure: HTMLImageElement;
  voice?: AudioBuffer;
}

export const FIGURE_SRC = '/senal/figura.png';

const cache = new Map<string, Promise<SignalAssets>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    // Sin figura se ve el negro, los ojos no: la transmisión sigue
    img.onerror = () => resolve(img);
    img.src = src;
  });
}

async function loadVoice(session: number, voice: VoiceId): Promise<AudioBuffer | undefined> {
  const ac = getAudioContext();
  if (!ac) return undefined;
  try {
    const response = await fetch(voiceSrc(session, voice));
    if (!response.ok) return undefined;
    const data = await response.arrayBuffer();
    // Los navegadores nuevos, además de llamar a `reject`, devuelven una promesa rechazada: se recoge para que no quede suelta
    return await new Promise<AudioBuffer>(
      (resolve, reject) => void ac.decodeAudioData(data, resolve, reject)?.catch(() => undefined),
    );
  } catch {
    return undefined;
  }
}

export function loadSignalAssets(session: number, voice: VoiceId): Promise<SignalAssets> {
  const key = `${session}-${voice}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = Promise.all([loadImage(FIGURE_SRC), loadVoice(session, voice)]).then(([figure, buffer]) => ({
      figure,
      voice: buffer,
    }));
    // Si falló la voz, se vuelve a intentar la próxima vez
    void pending.then((a) => !a.voice && cache.delete(key));
    cache.set(key, pending);
  }
  return pending;
}

/**
 * Tu cara para el fallo del giro 1 (TR-04, sesión 6; spec 18, RD-03): la cara de base del retrato, en tu variante.
 * Sin la hoja de caras, tu protagonista de cuerpo entero; sin nada, el fallo enseña solo tu alias.
 */
export async function loadHeroPortrait(avatar: Avatar): Promise<HTMLCanvasElement | undefined> {
  try {
    const sheet = await loadPortrait(avatar);
    const c = Object.assign(document.createElement('canvas'), { width: FACE, height: FACE });
    const ctx = c.getContext('2d');
    if (ctx) {
      drawFace(ctx, sheet, FACES.normal, 0, 0, FACE);
      return c;
    }
  } catch {
    // Sin hoja de caras: el sprite
  }
  return loadHeroSprite(avatar);
}

async function loadHeroSprite(avatar: Avatar): Promise<HTMLCanvasElement | undefined> {
  try {
    const sheets = await loadHero(avatar);
    const cast = CASTS[avatar.cast];
    const useIdle = sheets.idle && cast.idle;
    const spec = useIdle ? cast.idle! : cast.walk;
    const img = useIdle ? sheets.idle! : sheets.walk;
    const frame = useIdle ? 0 : cast.restFrame;
    const c = Object.assign(document.createElement('canvas'), { width: spec.frameW, height: spec.frameH });
    const ctx = c.getContext('2d');
    if (!ctx) return undefined;
    ctx.imageSmoothingEnabled = false;
    if (cast.flip) {
      ctx.translate(spec.frameW, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(img, frame * spec.frameW, 0, spec.frameW, spec.frameH, 0, 0, spec.frameW, spec.frameH);
    return c;
  } catch {
    return undefined;
  }
}
