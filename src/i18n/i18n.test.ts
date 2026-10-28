import { afterEach, describe, expect, it } from 'vitest';
import { detectLocale, keysOf, rawText, setLocale, t } from './index';

afterEach(() => setLocale('es'));

// `{selfO}` es la terminación de género del compañero en español: no tiene equivalente en inglés
const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((v) => v !== 'selfO').sort();

describe('idiomas (I18N-05)', () => {
  it('es y en tienen exactamente las mismas claves', () => {
    expect(keysOf('en').sort()).toEqual(keysOf('es').sort());
  });

  it.each(keysOf('es'))('"%s" usa las mismas variables en los dos idiomas', (key) => {
    expect(vars(rawText('en', key)!)).toEqual(vars(rawText('es', key)!));
  });

  it('ningún texto está vacío', () => {
    for (const locale of ['es', 'en'] as const) for (const k of keysOf(locale)) expect(rawText(locale, k)!.trim()).not.toBe('');
  });
});

describe('traducción (I18N-02)', () => {
  it('interpola variables y elige el plural según el idioma', () => {
    expect(t('format.activitiesCount', { count: 1 })).toBe('1 actividad');
    expect(t('format.activitiesCount', { count: 3 })).toBe('3 actividades');
    setLocale('en');
    expect(t('backup.activities', { count: 1 })).toBe('1 activity');
    expect(t('backup.activities', { count: 2 })).toBe('2 activities');
    expect(t('format.progress', { count: 2, target: 4 })).toBe('2 of 4');
  });

  it('el idioma por defecto sale del navegador (I18N-03)', () => {
    expect(detectLocale(['en-US', 'es'])).toBe('en');
    expect(detectLocale(['es-MX'])).toBe('es');
    expect(detectLocale(['fr-FR', 'de'])).toBe('es');
    expect(detectLocale([])).toBe('es');
  });

  it('cambia <html lang> al cambiar el idioma', () => {
    setLocale('en');
    expect(document.documentElement.lang).toBe('en');
  });
});

describe('frases de ARVID (NFR6-02, LG-01)', () => {
  const lineKeys = (locale: 'es' | 'en') => keysOf(locale).filter((k) => k.startsWith('arvid.lines.') || k.startsWith('arvid.onboarding.'));

  it.each(['es', 'en'] as const)('en %s ninguna frase fija supera 120 caracteres', (locale) => {
    for (const k of lineKeys(locale)) expect(rawText(locale, k)!.length, k).toBeLessThanOrEqual(120);
  });

  it('las formas neutras no usan palabras marcadas por género sobre el usuario', () => {
    // "la bienvenida" es un sustantivo (forma neutra); "bienvenido/a" como adjetivo sí marca el género
    const MARKED = /(?<!la )\bbienvenid[oa]\b|\bcampe[oó]na?\b|\bchamp\b/i;
    for (const locale of ['es', 'en'] as const)
      for (const k of keysOf(locale).filter((k) => k.endsWith('.x'))) expect(rawText(locale, k), k).not.toMatch(MARKED);
  });

  it('cada frase con género tiene las tres formas', () => {
    const gendered = keysOf('es').filter((k) => /\.(m|f|x)$/.test(k) && k.startsWith('arvid.'));
    const bases = new Set(gendered.map((k) => k.slice(0, -2)));
    for (const b of bases) for (const g of ['m', 'f', 'x']) expect(rawText('es', `${b}.${g}`), `${b}.${g}`).toBeDefined();
  });
});
