import { describe, expect, it } from 'vitest';
import { LOCALES } from '../../i18n';
import { RELEASES } from './changelog';
import pkg from '../../../package.json';

describe('novedades (2.0.4)', () => {
  it('la versión publicada tiene su entrada, la primera de la lista', () => {
    expect(RELEASES[0]?.version).toBe(pkg.version);
  });

  it('cada versión aparece una vez, de la más nueva a la más antigua, con textos en todos los idiomas', () => {
    const versions = RELEASES.map((r) => r.version);
    expect(new Set(versions).size).toBe(versions.length);
    const num = (v: string) => v.split('.').reduce((n, part) => n * 1000 + Number(part), 0);
    expect([...versions].sort((a, b) => num(b) - num(a))).toEqual(versions);
    for (const r of RELEASES) for (const l of LOCALES) expect(r.items[l].length).toBeGreaterThan(0);
  });
});
