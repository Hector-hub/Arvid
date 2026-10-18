// Pistas incluidas (spec 05 §9). Solo las de licencia verificada (LIC-01): las tres son propias, generadas por el
// responsable del producto con Gemini.

export interface Track {
  id: string;
  name: string;
  src: string;
}

export const TRACKS: Track[] = [
  { id: 'midnight-sector-drive', name: 'Midnight Sector Drive', src: '/music/midnight-sector-drive.m4a' },
  { id: 'glass-tower-horizon', name: 'Glass Tower Horizon', src: '/music/glass-tower-horizon.m4a' },
  { id: 'black-chrome-horizon', name: 'Black Chrome Horizon', src: '/music/black-chrome-horizon.m4a' },
];

/** Caché del service worker para la música (vite.config.ts, MUS-07). */
export const MUSIC_CACHE = 'arvid-music';
