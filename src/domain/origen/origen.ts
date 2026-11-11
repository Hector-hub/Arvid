// Programa ORIGEN (spec 17): estado de la historia y reglas puras del primer contacto y las transmisiones.
import type { Gender } from '../arvid/arvid';
import type { CastId } from '../avatar/catalog';

/** Qué contestó el jugador a la pregunta del compañero tras el primer contacto (DE). */
export type OrigenChoice = 'investigate' | 'block';

/** Un tramo (RI-01): de la apertura de un capítulo a la del siguiente. */
export interface OrigenPeriod {
  /** Instante en que se abrió el capítulo que empieza el tramo. */
  openedAt: string;
  /** XP total (entera) en ese momento: la del tramo es la de ahora menos esta (RI-05). */
  xpAtOpen: number;
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
}

export type VoiceId = 'es-m' | 'es-f' | 'en';

/** La voz de las transmisiones (TR-05): con «Prefiero no decirlo», la de tu protagonista. */
export function voiceFor(locale: 'es' | 'en', gender: Gender | undefined, cast: CastId): VoiceId {
  if (locale === 'en') return 'en';
  if (gender === 'm') return 'es-m';
  if (gender === 'f') return 'es-f';
  return cast.startsWith('ella') ? 'es-f' : 'es-m';
}

export const voiceSrc = (session: number, voice: VoiceId) => `/senal/sesion-${String(session).padStart(2, '0')}-${voice}.m4a`;

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

/** Chat de la señal sin leer: alguna sesión llegó después de la última lectura (CA-03). */
export function signalUnread(state: OrigenState | undefined): boolean {
  if (!storyOn(state)) return false;
  const read = state?.read?.signal ?? '';
  return seenSessions(state).some((s) => s.at > read);
}

/** A Sombra no se le ve en la calle hasta el capítulo 10 si investigas (SO-01, SO-05). En la 2.4.0 no hay capítulo 10. */
export const sombraHidden = (state: OrigenState | undefined) => storyOn(state);

// ---------- Subtítulos de la sesión 1 (segundos desde que empieza la voz, D-212) ----------
export interface VoiceTrack {
  /** Fin de la voz, en segundos. */
  end: number;
  /** [inicio, clave del subtítulo] */
  cues: [number, number][];
}

/** Marcas medidas sobre las grabaciones aprobadas (prototipo de la señal). El texto está en i18n `origen.session1`. */
export const SESSION_1: Record<VoiceId, VoiceTrack> = {
  'es-m': { end: 45.4, cues: [[0, 0], [8.23, 1], [13.39, 2], [22.61, 3], [30.72, 4], [35.87, 5], [39.58, 6], [42.02, 7]] },
  'es-f': { end: 43.7, cues: [[0, 0], [8.2, 1], [13.41, 2], [21.75, 3], [29.05, 4], [34.2, 5], [37.91, 6], [40.35, 7]] },
  en: { end: 48.5, cues: [[0, 0], [9.97, 1], [16.28, 2], [26.32, 3], [34.06, 4], [39.32, 5], [43.2, 6], [45.87, 7]] },
};

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
