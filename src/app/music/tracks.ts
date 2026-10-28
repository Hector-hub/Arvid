// Pistas incluidas (spec 05 §9). Solo las de licencia verificada (LIC-01): las seis son propias, aportadas por el
// responsable del producto (generadas con Gemini).

export interface Track {
  id: string;
  name: string;
  src: string;
  /** Color neón de su portada, para el brillo del reproductor (D-168). */
  glow: string;
}

export const TRACKS: Track[] = [
  { id: 'midnight-sector-drive', name: 'Midnight Sector Drive', src: '/music/midnight-sector-drive.m4a', glow: '#4470f2' },
  { id: 'glass-tower-horizon', name: 'Glass Tower Horizon', src: '/music/glass-tower-horizon.m4a', glow: '#f27348' },
  { id: 'black-chrome-horizon', name: 'Black Chrome Horizon', src: '/music/black-chrome-horizon.m4a', glow: '#f2472a' },
  { id: 'chrome-horizon-drive', name: 'Chrome Horizon Drive', src: '/music/chrome-horizon-drive.m4a', glow: '#f20faa' },
  { id: 'rain-on-the-expressway', name: 'Rain on the Expressway', src: '/music/rain-on-the-expressway.m4a', glow: '#3bc2f2' },
  // Versión corta de «Rain Slicked Boulevard»: de 1:09,95 a 1:44,86 (16 compases a 110 BPM), unida a tempo (D-166)
  { id: 'afterglow-avenue', name: 'Afterglow Avenue', src: '/music/afterglow-avenue.m4a', glow: '#f24876' },
];

/**
 * Portada de la pista para la pantalla de bloqueo y la notificación (Media Session, D-167): JPEG cuadrados en
 * `public/music/covers/` (96, 192 y 512 px), con el mismo id que la pista.
 */
export const trackCover = (track: Pick<Track, 'id'>, size: 96 | 192 | 512) => `/music/covers/${track.id}-${size}.jpg`;

export function trackArtwork(track: Pick<Track, 'id'>): MediaImage[] {
  return ([96, 192, 512] as const).map((size) => ({ src: trackCover(track, size), sizes: `${size}x${size}`, type: 'image/jpeg' }));
}

/** Caché del service worker para la música (vite.config.ts, MUS-07). */
export const MUSIC_CACHE = 'arvid-music';
