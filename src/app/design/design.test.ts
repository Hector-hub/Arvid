import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(__dirname, 'styles.css'), 'utf8');

function palette(): Record<string, string> {
  return Object.fromEntries([...css.matchAll(/--c-([a-z]+):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1]!, m[2]!]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('contraste de los pares de tokens (UI-03, design-system §2)', () => {
  const c = palette();
  it('la paleta es Sweetie 16 completa', () => {
    expect(Object.keys(c)).toHaveLength(16);
  });

  // [texto, fondo, mínimo]
  const pairs: [string, string, number][] = [
    ['white', 'ink', 4.5],
    ['white', 'panel', 4.5],
    ['fog', 'ink', 4.5],
    ['fog', 'panel', 4.5],
    ['gold', 'panel', 4.5],
    ['lime', 'panel', 4.5],
    ['cyan', 'panel', 4.5],
    ['white', 'blue', 4.5],
    ['white', 'red', 4.5],
    ['ink', 'lime', 4.5],
    ['ink', 'fog', 4.5],
    ['white', 'navy', 4.5],
    ['fog', 'navy', 4.5],
    ['gold', 'navy', 4.5],
    // Elementos gráficos (bordes, iconos de categoría) ≥ 3:1.
    ['slate', 'ink', 3],
    ['fog', 'panel', 3],
    ['orange', 'panel', 3],
    ['sky', 'panel', 3],
    ['green', 'panel', 3],
  ];
  it.each(pairs)('%s sobre %s ≥ %s', (fg, bg, min) => {
    expect(contrast(c[fg]!, c[bg]!)).toBeGreaterThanOrEqual(min);
  });
});

describe('sin emojis en la interfaz (UI-04)', () => {
  const EMOJI = /\p{Extended_Pictographic}/u;
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : /\.(tsx?|css)$/.test(name) ? [path] : [];
    });
  }
  it.each(files(join(__dirname, '..')))('%s', (file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(EMOJI);
  });
});
