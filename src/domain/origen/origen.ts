// Programa ORIGEN (spec 17): estado de la historia y reglas puras del primer contacto y las transmisiones.
import type { Gender } from '../arvid/arvid';
import type { CastId } from '../avatar/catalog';

/** Qué contestó el jugador a la pregunta del compañero tras el primer contacto (DE). */
export type OrigenChoice = 'investigate' | 'block';

/** Un tramo (RI-01): de la apertura de un capítulo a la del siguiente. */
export interface OrigenPeriod {
  /** Instante en que se abrió el capítulo que empieza el tramo. */
  openedAt: string;
  /** XP (entera, sin la de las pruebas) en ese momento: la del tramo es la de ahora menos esta (RI-05). */
  xpAtOpen: number;
  /** La vara del tramo (RI-03); sin ella, el mínimo. */
  target?: number;
}

/** Ajuste `origen` (spec 17 §4). Viaja en el backup. */
export interface OrigenState {
  /** El primer contacto empezó y aún no terminó: si se cierra la app, se repite (PC-06). */
  contactStartedAt?: string;
  /** El primer contacto terminó (la voz llegó al final). */
  contactAt?: string;
  choice?: OrigenChoice;
  /** Interruptor «Historia» (AJ-01); sin el campo, sigue la elección. */
  enabled?: boolean;
  periods?: OrigenPeriod[];
  /** Sesión vista → instante. */
  sessions?: Record<string, string>;
  /** Último instante leído de cada chat de la historia (CA-03). */
  read?: Record<string, string>;
  /** El compañero ya comentó que Sombra se fue de la calle (SO-05). */
  sombraNoticed?: boolean;
  /** Pasos de los capítulos ya entregados → instante (CA-01, ME-06). */
  steps?: Record<string, string>;
  /** Pruebas del programa (PR). */
  tests?: import('./programTests').ProgramTest[];
  /** Tramos de quien bloqueó la señal (RI-10): el mismo reloj, sin capítulos; solo cuentan para la música. */
  blockPeriods?: OrigenPeriod[];
  /** Canciones que ya se anunciaron como nuevas (MU-06). */
  tracksAnnounced?: number;
  /** Terminó el epílogo de la temporada 1 (EP-07): se desbloquea «Glass and Gravity». */
  seasonEndAt?: string;
}

export type VoiceId = 'es-m' | 'es-f' | 'en';

/** La voz de las transmisiones (TR-05): con «Prefiero no decirlo», la de tu protagonista. */
export function voiceFor(locale: 'es' | 'en', gender: Gender | undefined, cast: CastId): VoiceId {
  if (locale === 'en') return 'en';
  if (gender === 'm') return 'es-m';
  if (gender === 'f') return 'es-f';
  return cast.startsWith('ella') ? 'es-f' : 'es-m';
}

/** Tu género en la historia (CA-04): el mismo que elige la voz en español (TR-05), también con la app en inglés. */
export const storyGender = (gender: Gender | undefined, cast: CastId): 'm' | 'f' =>
  voiceFor('es', gender, cast) === 'es-f' ? 'f' : 'm';

export const voiceSrc = (session: number, voice: VoiceId) =>
  `/senal/sesion-${String(session).padStart(2, '0')}-${voice}.m4a`;

/** Momento del primer contacto (PC-01): entre 6 y 55 s de app a la vista. */
export const CONTACT_MIN_S = 6;
export const CONTACT_MAX_S = 55;
/** Si se cerró a medias, se repite entre 3 y 8 s después de abrir (PC-06). */
export const RETRY_MIN_S = 3;
export const RETRY_MAX_S = 8;

export function contactDelay(state: OrigenState | undefined, random: () => number): number {
  const [min, max] = state?.contactStartedAt ? [RETRY_MIN_S, RETRY_MAX_S] : [CONTACT_MIN_S, CONTACT_MAX_S];
  return min + random() * (max - min);
}

/** Falta el primer contacto (con el onboarding hecho). */
export const needsContact = (state: OrigenState | undefined) => !state?.contactAt;

/** Falta contestar la pregunta (DE-05). */
export const needsChoice = (state: OrigenState | undefined) => !!state?.contactAt && !state.choice;

/** La historia está en marcha: eligió investigar y no la apagó en Ajustes (DE-02, AJ-01). */
export const storyOn = (state: OrigenState | undefined) => state?.choice === 'investigate' && state.enabled !== false;

/** Marca el final del primer contacto y abre el primer tramo (RI-01). */
export function finishContact(state: OrigenState | undefined, at: Date, xp: number): OrigenState {
  const iso = at.toISOString();
  return {
    ...state,
    contactStartedAt: undefined,
    contactAt: iso,
    periods: state?.periods?.length ? state.periods : [{ openedAt: iso, xpAtOpen: xp }],
    sessions: { ...state?.sessions, '1': state?.sessions?.['1'] ?? iso },
  };
}

export function choose(state: OrigenState | undefined, choice: OrigenChoice): OrigenState {
  return { ...state, choice, enabled: choice === 'investigate' };
}

/** Interruptor «Historia» (AJ-01): encenderlo equivale a «Investigar» y apagarlo a «Bloquear la señal». */
export function setStory(state: OrigenState | undefined, on: boolean): OrigenState {
  return { ...state, choice: on ? 'investigate' : 'block', enabled: on };
}

/** Sesiones vistas, en orden. */
export function seenSessions(state: OrigenState | undefined): { n: number; at: string }[] {
  return Object.entries(state?.sessions ?? {})
    .map(([n, at]) => ({ n: Number(n), at }))
    .sort((a, b) => a.n - b.n);
}

/** Paso tras el que Sombra aparece junto al farol (capítulo 10, SO-01). */
export const SOMBRA_STEP = 'c10.sombra';

/** A Sombra no se le ve pasear si investigas (SO-01, SO-05): desde el capítulo 10 está quieto junto al farol. */
export const sombraHidden = (state: OrigenState | undefined) => storyOn(state);

/** Sombra quieto y tenue junto al farol, que solo ven ustedes dos (SO-01, SO-02). */
export const sombraStill = (state: OrigenState | undefined) => storyOn(state) && !!state?.steps?.[SOMBRA_STEP];

// ---------- Subtítulos de la sesión 1 (segundos desde que empieza la voz, D-212) ----------
export interface VoiceTrack {
  /** Fin de la voz, en segundos. */
  end: number;
  /** [inicio, clave del subtítulo] */
  cues: [number, number][];
  /** Fallos del Marco con su marca de tiempo (TR-04): nunca al azar. */
  fx?: SignalFx[];
  /** `hard`: corte seco a negro, sin la línea de luz (sesiones 5 y 6). */
  cut?: 'hard';
}

/**
 * Fallo del Marco en una transmisión (TR-04, M-11): `glitch`, corte de estática y tirón de imagen; `flicker`, la figura
 * aparece y se deshace a ráfagas; `reveal`, la figura se cambia por tu protagonista y «???» por tu alias, en tres
 * parpadeos (giro 1).
 */
export interface SignalFx {
  at: number;
  kind: 'glitch' | 'flicker' | 'reveal';
  dur: number;
}

/** Marcas medidas sobre las grabaciones aprobadas (prototipo de la señal). El texto está en i18n `origen.session1`. */
export const SESSION_1: Record<VoiceId, VoiceTrack> = {
  'es-m': {
    end: 45.4,
    cues: [
      [0, 0],
      [8.23, 1],
      [13.39, 2],
      [22.61, 3],
      [30.72, 4],
      [35.87, 5],
      [39.58, 6],
      [42.02, 7],
    ],
  },
  'es-f': {
    end: 43.7,
    cues: [
      [0, 0],
      [8.2, 1],
      [13.41, 2],
      [21.75, 3],
      [29.05, 4],
      [34.2, 5],
      [37.91, 6],
      [40.35, 7],
    ],
  },
  en: {
    end: 48.5,
    cues: [
      [0, 0],
      [9.97, 1],
      [16.28, 2],
      [26.32, 3],
      [34.06, 4],
      [39.32, 5],
      [43.2, 6],
      [45.87, 7],
    ],
  },
};

/** Sesiones 2 y 3 (voces de Fish Audio, 2026-11-11): marcas medidas en las pausas de cada grabación. */
const S2: Record<VoiceId, VoiceTrack> = {
  'es-m': {
    end: 9.77,
    cues: [
      [0, 0],
      [2.65, 1],
      [5.32, 2],
      [7.4, 3],
    ],
  },
  'es-f': {
    end: 8.62,
    cues: [
      [0, 0],
      [2.73, 1],
      [4.72, 2],
      [6.76, 3],
    ],
  },
  en: {
    end: 8.99,
    cues: [
      [0, 0],
      [3.05, 1],
      [4.97, 2],
      [6.98, 3],
    ],
  },
};
const S3: Record<VoiceId, VoiceTrack> = {
  'es-m': {
    end: 14.84,
    cues: [
      [0, 0],
      [1.48, 1],
      [4.89, 2],
      [7.24, 3],
      [13.16, 4],
    ],
  },
  'es-f': {
    end: 12.33,
    cues: [
      [0, 0],
      [1.47, 1],
      [4.43, 2],
      [6.3, 3],
      [11.18, 4],
    ],
  },
  en: {
    end: 11.76,
    cues: [
      [0, 0],
      [1.39, 1],
      [4.42, 2],
      [6.52, 3],
      [10.34, 4],
    ],
  },
};

/**
 * Sesiones 4 a 6 (acto II, voces de Fish Audio, 2026-11-12), con los fallos del Marco del guion (TR-04): marcas medidas
 * en cada mezcla.
 */
const S4: Record<VoiceId, VoiceTrack> = {
  'es-m': {
    end: 15,
    cues: [
      [0, 0],
      [1.89, 1],
      [5.23, 2],
      [9.63, 3],
      [10.69, 4],
    ],
    fx: [{ at: 10.69, kind: 'glitch', dur: 0.35 }],
  },
  'es-f': {
    end: 14.29,
    cues: [
      [0, 0],
      [1.96, 1],
      [5.19, 2],
      [9.46, 3],
      [10.68, 4],
    ],
    fx: [{ at: 10.68, kind: 'glitch', dur: 0.35 }],
  },
  en: {
    end: 14.02,
    cues: [
      [0, 0],
      [2, 1],
      [5.32, 2],
      [9.3, 3],
      [10.53, 4],
    ],
    fx: [{ at: 10.53, kind: 'glitch', dur: 0.35 }],
  },
};
const S5: Record<VoiceId, VoiceTrack> = {
  'es-m': {
    end: 26.92,
    cues: [
      [0, 0],
      [2.14, 1],
      [7.36, 2],
      [12.62, 3],
      [17.61, 4],
      [23.02, 5],
    ],
    fx: [
      { at: 1.24, kind: 'glitch', dur: 0.4 },
      { at: 2.04, kind: 'flicker', dur: 25.4 },
    ],
    cut: 'hard',
  },
  'es-f': {
    end: 25.15,
    cues: [
      [0, 0],
      [2.28, 1],
      [7.12, 2],
      [11.77, 3],
      [15.99, 4],
      [21.37, 5],
    ],
    fx: [
      { at: 1.38, kind: 'glitch', dur: 0.4 },
      { at: 2.18, kind: 'flicker', dur: 23.5 },
    ],
    cut: 'hard',
  },
  en: {
    end: 27.55,
    cues: [
      [0, 0],
      [2.23, 1],
      [7.45, 2],
      [12.5, 3],
      [17.58, 4],
      [23.24, 5],
    ],
    fx: [
      { at: 1.33, kind: 'glitch', dur: 0.4 },
      { at: 2.13, kind: 'flicker', dur: 25.9 },
    ],
    cut: 'hard',
  },
};
const S6: Record<VoiceId, VoiceTrack> = {
  'es-m': {
    end: 14.04,
    cues: [
      [0, 0],
      [1.82, 1],
      [6.84, 2],
      [10.09, 3],
      [12.3, 4],
    ],
    fx: [{ at: 5.34, kind: 'reveal', dur: 0.8 }],
    cut: 'hard',
  },
  'es-f': {
    end: 13.65,
    cues: [
      [0, 0],
      [1.78, 1],
      [6.68, 2],
      [9.88, 3],
      [11.97, 4],
    ],
    fx: [{ at: 5.18, kind: 'reveal', dur: 0.8 }],
    cut: 'hard',
  },
  en: {
    end: 13.24,
    cues: [
      [0, 0],
      [1.88, 1],
      [6.48, 2],
      [9.47, 3],
      [11.81, 4],
    ],
    fx: [{ at: 4.98, kind: 'reveal', dur: 0.8 }],
    cut: 'hard',
  },
};

/** Sesiones 7 y 8 (acto III), solo audio (TR-03): marcas medidas en cada mezcla (Fish Audio, 2026-11-12). */
const S7: Record<VoiceId, VoiceTrack> = {
  'es-m': { end: 11.23, cues: [[0, 0], [1.94, 1], [5.02, 2], [10.04, 3]] },
  'es-f': { end: 10.34, cues: [[0, 0], [1.89, 1], [4.7, 2], [9.18, 3]] },
  en: { end: 10.35, cues: [[0, 0], [1.9, 1], [4.82, 2], [8.92, 3]] },
};
const S8: Record<VoiceId, VoiceTrack> = {
  'es-m': { end: 10.53, cues: [[0, 0], [1.83, 1], [7.05, 2]] },
  'es-f': { end: 9.46, cues: [[0, 0], [1.86, 1], [6.4, 2]] },
  en: { end: 8.99, cues: [[0, 0], [1.88, 1], [6.07, 2]] },
};

/** Subtítulos de cada sesión: cuántos hay, cuáles cambian con el género de la voz y si es solo audio (TR-03). */
export const SESSIONS: Record<
  number,
  { tracks: Record<VoiceId, VoiceTrack>; cues: number; gendered: number[]; audioOnly?: boolean }
> = {
  1: { tracks: SESSION_1, cues: 8, gendered: [0] },
  2: { tracks: S2, cues: 4, gendered: [] },
  3: { tracks: S3, cues: 5, gendered: [] },
  4: { tracks: S4, cues: 5, gendered: [] },
  5: { tracks: S5, cues: 6, gendered: [] },
  6: { tracks: S6, cues: 5, gendered: [2] },
  7: { tracks: S7, cues: 4, gendered: [], audioOnly: true },
  8: { tracks: S8, cues: 3, gendered: [], audioOnly: true },
};

/** El fallo del Marco que está en marcha en el segundo `t` de la voz, si hay alguno. */
export function fxAt(track: VoiceTrack, t: number): SignalFx | undefined {
  return track.fx?.find((f) => t >= f.at && t < f.at + f.dur);
}

/** Durante el giro 1 (sesión 6), si en el instante `t` del fallo se ve tu protagonista: tres parpadeos en 0,8 s. */
export function revealOn(fx: SignalFx, t: number): boolean {
  const k = (t - fx.at) / fx.dur;
  return (k >= 0 && k < 0.19) || (k >= 0.38 && k < 0.56) || (k >= 0.75 && k < 1);
}

/** Clave i18n del subtítulo `i` de la sesión `n` en la voz `voice`. */
export function cueKey(n: number, i: number, voice: VoiceId): string {
  const gendered = SESSIONS[n]?.gendered.includes(i);
  return `origen.session${n}.${i}${gendered ? (voice === 'es-f' ? '.f' : '.m') : ''}`;
}

/** Cuánto te quedas quieto en una transmisión (lo que cuenta Pip, cap. 5): negro, aparición, voz y corte. */
export const sessionSeconds = (n: number, voice: VoiceId) =>
  Math.round(1 + 4.05 + (SESSIONS[n]?.tracks[voice].end ?? 0) + 1.25);

/** `{tiempo}` (CA-07): días hasta 13, semanas hasta 59 días, meses hasta 364 y «un año» después. */
export function elapsed(days: number): { unit: 'days' | 'weeks' | 'months' | 'year'; count: number } {
  if (days < 14) return { unit: 'days', count: Math.max(1, days) };
  if (days < 60) return { unit: 'weeks', count: Math.floor(days / 7) };
  if (days < 365) return { unit: 'months', count: Math.floor(days / 30) };
  return { unit: 'year', count: 1 };
}

/** Subtítulo que toca en el segundo `t` de la voz. */
export function cueAt(track: VoiceTrack, t: number): number {
  let index = 0;
  track.cues.forEach(([start], i) => {
    if (t >= start) index = i;
  });
  return index;
}

/** Ritmo de la escritura de «Programa Origen» en el buscador (s entre letras, ritmo de quien duda, PC-02). */
export const TYPING_DELAYS = [0.16, 0.11, 0.13, 0.09, 0.15, 0.12, 0.1, 0.11, 0.32, 0.14, 0.1, 0.12, 0.11, 0.13, 0.1];
