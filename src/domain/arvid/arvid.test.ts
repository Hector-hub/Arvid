import { describe, expect, it } from 'vitest';
import { seededRng } from '../scene/scene';
import type { LocalDate } from '../time/localDate';
import {
  ARVID_ACCENT,
  castOrder,
  chooseMoment,
  helloFor,
  markSaid,
  normalizeProfile,
  pickLine,
  recolorArvid,
  validateAlias,
} from './arvid';

describe('perfil (§4)', () => {
  it('alias de 1 a 20 caracteres visibles', () => {
    expect(validateAlias('  ')).toBe('aliasRequired');
    expect(validateAlias('Héctor')).toBeUndefined();
    expect(validateAlias('a'.repeat(21))).toBe('aliasTooLong');
    expect(validateAlias('🙂'.repeat(20))).toBeUndefined(); // se cuentan caracteres, no unidades UTF-16
  });

  it('normaliza el perfil guardado', () => {
    expect(normalizeProfile(undefined)).toBeUndefined();
    expect(normalizeProfile({ alias: '  Ana ', gender: 'f' })).toEqual({ alias: 'Ana', gender: 'f' });
    expect(normalizeProfile({ alias: 'Ana', gender: 'zz' })).toEqual({ alias: 'Ana', gender: 'x' });
    expect(normalizeProfile({ alias: '' })).toBeUndefined();
  });

  it('PJ-02: orden del carrusel según el género, siempre con los 4', () => {
    expect(castOrder('m')[0]).toBe('el');
    expect(castOrder('f')[0]).toBe('ella');
    expect(castOrder('x')).toEqual(['ella', 'el', 'ella2', 'el2']);
    for (const g of ['m', 'f', 'x', undefined] as const) expect(new Set(castOrder(g)).size).toBe(4);
  });
});

describe('colores de ARVID (AV-01)', () => {
  it('solo cambian los 4 acentos; el cuerpo queda igual', () => {
    const body = [0x56, 0x6a, 0x89, 255];
    const accent = [0xff, 0x81, 0x42, 255]; // el acento más claro
    const px = new Uint8ClampedArray([...body, ...accent]);
    recolorArvid(px, 2, 1, 'cian');
    expect([...px.slice(0, 4)]).toEqual(body);
    expect([...px.slice(4, 8)]).toEqual([0x05, 0xd9, 0xe8, 255]);
    expect(ARVID_ACCENT).toHaveLength(4);
  });

  it('respeta la fila inicial (solo las filas del dron en el atlas)', () => {
    const accent = [0xff, 0x81, 0x42, 255];
    const px = new Uint8ClampedArray([...accent, ...accent]); // 1×2
    recolorArvid(px, 1, 2, 'oro', 1);
    expect([...px.slice(0, 4)]).toEqual(accent);
    expect([...px.slice(4, 8)]).toEqual([0xff, 0xd8, 0x00, 255]);
  });
});

describe('momentos (DL-01 a DL-04)', () => {
  const today = '2026-10-18' as LocalDate;

  it('elige el de mayor prioridad que no se haya dicho hoy', () => {
    expect(chooseMoment(['greeting', 'comeback'], undefined, today)).toBe('comeback');
    expect(chooseMoment(['greeting', 'dayComplete'], undefined, today)).toBe('dayComplete');
    const seen = markSaid(undefined, 'comeback', 0, today);
    expect(chooseMoment(['greeting', 'comeback'], seen, today)).toBe('greeting');
    expect(chooseMoment(['comeback'], seen, today)).toBeUndefined();
    expect(chooseMoment(['comeback'], seen, '2026-10-19' as LocalDate)).toBe('comeback');
  });

  it('no repite la frase anterior', () => {
    const rng = seededRng(3);
    for (let i = 0; i < 200; i++) expect(pickLine(3, 1, rng)).not.toBe(1);
    expect(pickLine(1, 0, rng)).toBe(0);
  });

  it('saludo según la hora', () => {
    expect(helloFor(8)).toBe('morning');
    expect(helloFor(12)).toBe('morning');
    expect(helloFor(13)).toBe('afternoon');
    expect(helloFor(19)).toBe('afternoon');
    expect(helloFor(20)).toBe('evening');
  });
});
