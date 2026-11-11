// Lo que necesita la señal antes de empezar (NFR17-06): la figura y la voz decodificada. Se prepara una vez y se
// reutiliza. Sin conexión ni voz, la secuencia funciona igual, en silencio y con sus subtítulos (PC-09).
import { voiceSrc, type VoiceId } from '../../domain/origen/origen';
import { getAudioContext } from '../sound/audio';

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
    return await new Promise<AudioBuffer>((resolve, reject) => void ac.decodeAudioData(data, resolve, reject));
  } catch {
    return undefined;
  }
}

export function loadSignalAssets(session: number, voice: VoiceId): Promise<SignalAssets> {
  const key = `${session}-${voice}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = Promise.all([loadImage(FIGURE_SRC), loadVoice(session, voice)]).then(([figure, buffer]) => ({ figure, voice: buffer }));
    // Si falló la voz, se vuelve a intentar la próxima vez
    void pending.then((a) => !a.voice && cache.delete(key));
    cache.set(key, pending);
  }
  return pending;
}
