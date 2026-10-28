// Pistas incluidas (spec 05 §9). Solo las de licencia verificada (LIC-01): las seis son propias, aportadas por el
// responsable del producto (generadas con Gemini).

export interface Track {
  id: string;
  name: string;
  src: string;
}

export const TRACKS: Track[] = [
  { id: 'midnight-sector-drive', name: 'Midnight Sector Drive', src: '/music/midnight-sector-drive.m4a' },
  { id: 'glass-tower-horizon', name: 'Glass Tower Horizon', src: '/music/glass-tower-horizon.m4a' },
  { id: 'black-chrome-horizon', name: 'Black Chrome Horizon', src: '/music/black-chrome-horizon.m4a' },
  { id: 'chrome-horizon-drive', name: 'Chrome Horizon Drive', src: '/music/chrome-horizon-drive.m4a' },
  { id: 'rain-on-the-expressway', name: 'Rain on the Expressway', src: '/music/rain-on-the-expressway.m4a' },
  // Versión corta de «Rain Slicked Boulevard»: de 1:09,95 a 1:44,86 (16 compases a 110 BPM), unida a tempo (D-166)
  { id: 'afterglow-avenue', name: 'Afterglow Avenue', src: '/music/afterglow-avenue.m4a' },
];

/** Caché del service worker para la música (vite.config.ts, MUS-07). */
export const MUSIC_CACHE = 'arvid-music';
