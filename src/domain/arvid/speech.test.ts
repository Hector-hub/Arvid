import { describe, expect, it } from 'vitest';
import { HOLD_FRAMES, createSpeech, hasMore, pageText, paginate, stepSpeech, tapSpeech, visibleLines } from './speech';

// Medida de prueba: 8 px por carácter
const measure = (s: string) => s.length * 8;

describe('paginación (BP-01, BP-02)', () => {
  it('ajusta al ancho y reparte en páginas de 2 líneas', () => {
    const text = 'uno dos tres cuatro cinco seis siete ocho nueve diez once doce';
    const pages = paginate(text, measure, 15 * 8);
    for (const page of pages) {
      expect(page.length).toBeLessThanOrEqual(2);
      for (const line of page) expect(measure(line)).toBeLessThanOrEqual(15 * 8);
    }
    expect(pages.flat().join(' ')).toBe(text);
  });

  it('corta por caracteres una palabra más ancha que la burbuja', () => {
    const pages = paginate('supercalifragilisticoespialidoso', measure, 10 * 8);
    for (const line of pages.flat()) expect(line.length).toBeLessThanOrEqual(10);
    expect(pages.flat().join('')).toBe('supercalifragilisticoespialidoso');
  });

  it('respeta los saltos de párrafo', () => {
    expect(paginate('Hola.\nAdiós.', measure, 200)).toEqual([['Hola.', 'Adiós.']]);
  });
});

describe('escritura y avance (BP-02, BP-03)', () => {
  const pages = [['Hola, soy', 'ARVID.'], ['Vamos.']];

  it('escribe letra a letra y pasa de página a los 5 s', () => {
    const sp = createSpeech(pages);
    stepSpeech(sp, 6);
    expect(visibleLines(sp)).toEqual(['Hola', '']);
    for (let i = 0; i < 30; i++) stepSpeech(sp, 1);
    expect(visibleLines(sp)).toEqual(['Hola, soy', 'ARVID.']);
    expect(hasMore(sp)).toBe(true);
    for (let i = 0; i < HOLD_FRAMES; i++) stepSpeech(sp, 1);
    expect(sp.page).toBe(1);
    expect(hasMore(sp)).toBe(false);
  });

  it('al tocar: completa la página y después avanza; tras la última, termina', () => {
    const sp = createSpeech(pages);
    tapSpeech(sp);
    expect(pageText(sp)).toBe('Hola, soy ARVID.');
    expect(visibleLines(sp)).toEqual(['Hola, soy', 'ARVID.']);
    tapSpeech(sp);
    expect(sp.page).toBe(1);
    tapSpeech(sp);
    tapSpeech(sp);
    expect(sp.done).toBe(true);
  });

  it('con movimiento reducido cada página aparece entera', () => {
    const sp = createSpeech(pages);
    stepSpeech(sp, 1, true);
    expect(visibleLines(sp)).toEqual(['Hola, soy', 'ARVID.']);
  });
});
