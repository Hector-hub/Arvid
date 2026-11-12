import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAST_IDS, VARIANT_IDS } from './catalog';
import { EXPRESSION_FACE, FACES, PORTRAIT_ROLES, portraitSrc, recolorPortrait, rolesSrc } from './portrait';

/** Medidas de un PNG leídas de su cabecera. */
function pngSize(path: string): [number, number] {
  const b = readFileSync(path);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

describe('retratos (spec 18)', () => {
  it('cada protagonista tiene su hoja de 4 × 4 caras de 64 px y su máscara de papeles', () => {
    for (const cast of CAST_IDS) {
      expect(pngSize(`public${portraitSrc(cast)}`)).toEqual([256, 256]);
      expect(pngSize(`public${rolesSrc(cast)}`)).toEqual([256, 256]);
    }
  });

  it('las caras de cada expresión existen en la hoja (RT-03)', () => {
    const all = [...Object.values(EXPRESSION_FACE), ...FACES.blink, ...FACES.talk];
    for (const face of all) expect(face).toBeGreaterThanOrEqual(0);
    for (const face of all) expect(face).toBeLessThan(16);
  });

  it('recolorea cada papel y deja igual lo fijo: contorno, ojos y dientes (RT-05)', () => {
    for (const cast of CAST_IDS) {
      const roles = PORTRAIT_ROLES[cast];
      // Un píxel por papel en tres luminosidades, y uno fijo
      const n = roles.length * 3 + 1;
      const px = new Uint8ClampedArray(n * 4);
      const mask = new Uint8ClampedArray(n * 4);
      roles.forEach((_, r) =>
        [40, 120, 220].forEach((v, k) => {
          const i = (r * 3 + k) * 4;
          px.set([v, v, v, 255], i);
          mask[i] = r + 1;
        }),
      );
      px.set([10, 20, 30, 255], (n - 1) * 4);
      for (const variant of VARIANT_IDS) {
        const copy = px.slice();
        recolorPortrait(copy, mask, cast, variant);
        expect([...copy.slice((n - 1) * 4)]).toEqual([10, 20, 30, 255]);
        if (variant === 'original') expect(copy).toEqual(px);
        else expect(copy, `${cast} ${variant}`).not.toEqual(px);
      }
    }
  });

  it('dentro de un papel, lo oscuro sigue más oscuro que lo claro', () => {
    const px = new Uint8ClampedArray([40, 40, 40, 255, 220, 220, 220, 255]);
    const mask = new Uint8ClampedArray([1, 0, 0, 255, 1, 0, 0, 255]);
    recolorPortrait(px, mask, 'ella', 'neon');
    const lum = (i: number) => 0.2126 * px[i]! + 0.7152 * px[i + 1]! + 0.0722 * px[i + 2]!;
    expect(lum(0)).toBeLessThan(lum(4));
  });
});
