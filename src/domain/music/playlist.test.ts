import { describe, expect, it } from 'vitest';
import { seededRng } from '../scene/scene';
import { emptyBag, nextTrack, type Bag } from './playlist';

const TRACKS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

describe('lista de música (MUS-02)', () => {
  it('cada ronda suena todas las pistas una vez y nunca repite la última al cambiar de ronda', () => {
    const rng = seededRng(11);
    let bag: Bag<string> = emptyBag();
    let previous: string | undefined;
    for (let round = 0; round < 1000; round++) {
      const played: string[] = [];
      for (let i = 0; i < TRACKS.length; i++) {
        const next = nextTrack(bag, TRACKS, rng);
        bag = next.bag;
        expect(next.track).not.toBe(previous);
        previous = next.track;
        played.push(next.track!);
      }
      expect(new Set(played).size).toBe(TRACKS.length);
    }
  });

  it('solo elige entre las disponibles (sin conexión, las guardadas en caché; MUS-07)', () => {
    const rng = seededRng(12);
    let bag: Bag<string> = emptyBag();
    for (let i = 0; i < 20; i++) {
      const next = nextTrack(bag, ['c', 'f'], rng);
      bag = next.bag;
      expect(['c', 'f']).toContain(next.track);
    }
  });

  it('sin pistas disponibles no devuelve ninguna', () => {
    expect(nextTrack(emptyBag<string>(), [], seededRng(1)).track).toBeUndefined();
  });

  it('con una sola pista, la repite', () => {
    const rng = seededRng(13);
    const first = nextTrack(emptyBag<string>(), ['a'], rng);
    expect(nextTrack(first.bag, ['a'], rng).track).toBe('a');
  });
});
