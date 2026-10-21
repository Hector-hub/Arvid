import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DARIS_RAMPS, darisMaterial, recolorDaris } from './companion';

const px = (...colors: [number, number, number][]) => new Uint8ClampedArray(colors.flatMap(([r, g, b]) => [r, g, b, 255]));
const hex = (p: Uint8ClampedArray, i: number) => '#' + [p[i * 4]!, p[i * 4 + 1]!, p[i * 4 + 2]!].map((v) => v.toString(16).padStart(2, '0')).join('');

describe('DARIS (spec 08)', () => {
  it('DC-01: materiales del atlas: energía rosa, carcasa blanca, placas, detalles dorados y contorno', () => {
    expect(darisMaterial(0xf3, 0x5f, 0xd1)).toBe('energy');
    expect(darisMaterial(0xf8, 0xef, 0xf1)).toBe('shell');
    expect(darisMaterial(0x35, 0x20, 0x49)).toBe('plating');
    expect(darisMaterial(0xe5, 0xa7, 0x51)).toBe('gold');
    expect(darisMaterial(0x10, 0x05, 0x11)).toBeUndefined();
  });

  it('DC-01: cada material pasa a su gama, el contorno no cambia y "rosa" deja el atlas igual', () => {
    const atlas = px([0xf3, 0x5f, 0xd1], [0xf8, 0xef, 0xf1], [0x10, 0x05, 0x11]);
    const pink = new Uint8ClampedArray(atlas);
    recolorDaris(pink, 'rosa');
    expect(pink).toEqual(atlas);
    const cyan = new Uint8ClampedArray(atlas);
    recolorDaris(cyan, 'cian');
    expect(hex(cyan, 0)).toBe(DARIS_RAMPS.cian.energy.at(-1));
    expect(hex(cyan, 1)).toBe(DARIS_RAMPS.cian.shell.at(-1));
    expect(hex(cyan, 2)).toBe('#100511');
  });

  it('NFR8-01: el atlas pesa ≤ 60 KB y tiene 4 filas de 15 celdas de 48 px', () => {
    const png = readFileSync(join(__dirname, '../../../public/scene/daris.png'));
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([15 * 48, 4 * 48]);
    expect(png.length).toBeLessThanOrEqual(60 * 1024);
  });
});
