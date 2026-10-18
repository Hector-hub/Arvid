// Idiomas de la interfaz (spec 06, I18N). Textos en `es.json` y `en.json` con las mismas claves.
// - Interpolación: "{nombre}".
// - Plurales: claves hermanas `x_one` / `x_other`, elegidas con Intl.PluralRules y la variable `count`.
// - El idioma activo es un estado global: `t()` sirve en cualquier función y `useLocale()` re-renderiza al cambiarlo.
import { useSyncExternalStore } from 'react';
import en from './en.json';
import es from './es.json';

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

type Dict = { [key: string]: string | Dict };
type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
type StripPlural<K> = K extends `${infer B}_one` ? B : K extends `${infer B}_other` ? B : K;
/** Claves válidas (derivadas de es.json); las de plural se usan sin sufijo. */
export type TKey = StripPlural<Leaves<typeof es>>;
export type Vars = Record<string, string | number>;

function flatten(dict: Dict, prefix = '', out = new Map<string, string>()): Map<string, string> {
  for (const [k, v] of Object.entries(dict)) {
    if (typeof v === 'string') out.set(prefix + k, v);
    else flatten(v, `${prefix}${k}.`, out);
  }
  return out;
}

const DICTS: Record<Locale, Map<string, string>> = { es: flatten(es), en: flatten(en) };

let current: Locale = 'es';
const listeners = new Set<() => void>();

export const isLocale = (v: unknown): v is Locale => typeof v === 'string' && (LOCALES as readonly string[]).includes(v);

/** Idioma del navegador si es español o inglés; si no, español (I18N-03). */
export function detectLocale(languages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language]): Locale {
  for (const l of languages) {
    const base = l.slice(0, 2).toLowerCase();
    if (isLocale(base)) return base;
  }
  return 'es';
}

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale): void {
  if (locale === current) return;
  current = locale;
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Re-renderiza el componente al cambiar el idioma. */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getLocale, () => current);
}

/** Lo mismo que `useLocale`, para componentes que solo necesitan traducir. */
export function useT(): typeof t {
  useLocale();
  return t;
}

const pluralRules = new Map<Locale, Intl.PluralRules>();
function plural(locale: Locale, n: number): 'one' | 'other' {
  let rules = pluralRules.get(locale);
  if (!rules) pluralRules.set(locale, (rules = new Intl.PluralRules(locale)));
  return rules.select(n) === 'one' ? 'one' : 'other';
}

/** Traduce `key` al idioma activo. Con `vars.count` numérico se usa la forma de plural si existe. */
export function t(key: TKey, vars?: Vars, locale: Locale = current): string {
  const dict = DICTS[locale];
  let text: string | undefined;
  if (typeof vars?.count === 'number') text = dict.get(`${key}_${plural(locale, vars.count)}`);
  text ??= dict.get(key) ?? DICTS.es.get(key);
  if (text === undefined) return key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : text;
}

/** Para claves construidas en tiempo de ejecución (p. ej. códigos de error del dominio). */
export function tDynamic(key: string, vars?: Vars): string {
  return t(key as TKey, vars);
}

/** Todas las claves de un idioma (para las pruebas de I18N-05). */
export function keysOf(locale: Locale): string[] {
  return [...DICTS[locale].keys()];
}

export function rawText(locale: Locale, key: string): string | undefined {
  return DICTS[locale].get(key);
}
