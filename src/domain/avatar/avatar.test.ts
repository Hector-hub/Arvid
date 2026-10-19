import { describe, expect, it } from 'vitest';
import { CASTS, CAST_IDS, DEFAULT_AVATAR, VARIANT_IDS, normalizeAvatar, walkFrame } from './catalog';
import { recolorSheet } from './recolor';

/** Hoja de un fotograma `w`×`h`, transparente salvo los píxeles indicados. */
function sheet(w: number, h: number, pixels: [x: number, y: number, hex: string][]) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (const [x, y, hex] of pixels) {
    const i = (y * w + x) * 4;
    px.set([parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255], i);
  }
  return px;
}
const at = (px: Uint8ClampedArray, w: number, x: number, y: number) => {
  const i = (y * w + x) * 4;
  return px[i + 3] === 0 ? 'transparente' : '#' + [px[i], px[i + 1], px[i + 2]].map((v) => v!.toString(16).padStart(2, '0')).join('');
};

describe('catálogo de protagonistas (PRO-01)', () => {
  it('tiene 4 protagonistas y 6 variantes', () => {
    expect(CAST_IDS).toHaveLength(4);
    expect(VARIANT_IDS).toHaveLength(6);
  });

  it('normaliza valores desconocidos al valor por defecto (§5)', () => {
    expect(normalizeAvatar(undefined)).toEqual(DEFAULT_AVATAR);
    expect(normalizeAvatar('ella')).toEqual(DEFAULT_AVATAR);
    expect(normalizeAvatar({ cast: 'robot', variant: 'neon' })).toEqual(DEFAULT_AVATAR);
    expect(normalizeAvatar({ cast: 'el2', variant: 'arcoiris' })).toEqual({ cast: 'el2', variant: 'original' });
    expect(normalizeAvatar({ cast: 'ella2', variant: 'ocaso' })).toEqual({ cast: 'ella2', variant: 'ocaso' });
  });

  it('el fotograma de caminar depende solo del tiempo de la escena', () => {
    expect(walkFrame(CASTS.ella, 0)).toBe(0);
    expect(walkFrame(CASTS.ella, 5)).toBe(1);
    expect(walkFrame(CASTS.ella, 80)).toBe(0); // 16 fotogramas × 5
    expect(walkFrame(CASTS.el2, 7.5 * 3)).toBe(3);
  });
});

describe('recoloreado por variante (PRO-04)', () => {
  it('Ella: colores por rol; el tono compartido es sombra del pelo arriba y medias abajo', () => {
    const px = sheet(4, 20, [
      [0, 0, '#442b61'], // primera fila opaca → sombra del pelo
      [1, 15, '#442b61'], // abajo → medias
      [2, 10, '#ffd800'], // chaqueta
      [3, 12, '#ffb164'], // piel
    ]);
    recolorSheet(px, 4, 20, 4, 'ella', 'neon');
    expect(at(px, 4, 0, 0)).toBe('#0b347f');
    expect(at(px, 4, 1, 15)).toBe('#031b70');
    expect(at(px, 4, 2, 10)).toBe('#ff2a6d');
    expect(at(px, 4, 3, 12)).toBe('#d9925b');
  });

  it('la variante original no cambia nada (salvo el arma de Él)', () => {
    const px = sheet(4, 20, [[2, 10, '#ffd800']]);
    recolorSheet(px, 4, 20, 4, 'ella', 'original');
    expect(at(px, 4, 2, 10)).toBe('#ffd800');
  });

  it('Él va siempre sin arma, también en la variante original', () => {
    const px = sheet(64, 64, [
      [10, 35, '#2040c0'], // arma (azul, a la izquierda y abajo)
      [40, 35, '#303040'], // pantalón
    ]);
    recolorSheet(px, 64, 64, 64, 'el', 'original');
    expect(at(px, 64, 10, 35)).toBe('transparente');
    expect(at(px, 64, 40, 35)).toBe('#303040');
  });

  it('Ella 2: el rojo es pelo en la cabeza y ropa en el cuerpo', () => {
    const px = sheet(96, 63, [
      [50, 0, '#ce2038'], // cabeza
      [50, 30, '#ce2038'], // cuerpo
    ]);
    recolorSheet(px, 96, 63, 96, 'ella2', 'neon');
    expect(at(px, 96, 50, 0)).toBe('#05d9e8');
    expect(at(px, 96, 50, 30)).toBe('#ff2a6d');
  });

  it('Él 2: pelo, camisa y zapatos por color y zona; el contorno y el ojo se conservan', () => {
    const px = sheet(64, 64, [
      [30, 2, '#03020a'], // contorno (primera fila opaca)
      [30, 4, '#080815'], // pelo
      [34, 10, '#d2dae0'], // blanco del ojo (en la cabeza, no es camisa)
      [30, 25, '#f7f8f9'], // camisa
      [30, 58, '#b75a3f'], // zapato
    ]);
    recolorSheet(px, 64, 64, 64, 'el2', 'ocaso');
    expect(at(px, 64, 30, 2)).toBe('#03020a');
    expect(at(px, 64, 30, 4)).toBe('#b13e53');
    expect(at(px, 64, 34, 10)).toBe('#d2dae0');
    expect(at(px, 64, 30, 25)).toBe('#7a4fd1');
    expect(at(px, 64, 30, 58)).toBe('#f07c36');
  });

  it('recolorea cada fotograma de la hoja', () => {
    const px = sheet(8, 20, [
      [1, 10, '#ffd800'],
      [5, 10, '#ffd800'],
    ]);
    recolorSheet(px, 8, 20, 4, 'ella', 'bosque');
    expect(at(px, 8, 1, 10)).toBe('#38b764');
    expect(at(px, 8, 5, 10)).toBe('#38b764');
  });
});

describe('rendimiento del recoloreado (NFR5-03)', () => {
  it('una hoja como la de Ella (1136×67, 16 fotogramas) se recolorea en < 50 ms (mejor de 7)', () => {
    const w = 1136;
    const h = 67;
    const colors = ['#442b61', '#ffd800', '#ffb164', '#93278f', '#81709a', '#000000'];
    const base = sheet(w, h, Array.from({ length: 6000 }, (_, i) => [(i * 7) % w, (i * 13) % h, colors[i % colors.length]!] as [number, number, string]));
    let best = Infinity;
    for (let i = 0; i < 7; i++) {
      const px = base.slice();
      const t0 = performance.now();
      recolorSheet(px, w, h, 71, 'ella', 'ocaso');
      best = Math.min(best, performance.now() - t0);
    }
    expect(best).toBeLessThan(50);
  });
});
