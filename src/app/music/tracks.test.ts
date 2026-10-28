import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { trackArtwork, TRACKS } from './tracks';

describe('portadas de las pistas (D-167)', () => {
  it('cada pista tiene su portada en 96, 192 y 512 px, y los archivos existen', () => {
    expect(TRACKS).toHaveLength(6);
    for (const track of TRACKS) {
      const art = trackArtwork(track);
      expect(art.map((a) => a.sizes)).toEqual(['96x96', '192x192', '512x512']);
      for (const a of art) expect(existsSync(`public${a.src}`), a.src).toBe(true);
    }
  });
});
