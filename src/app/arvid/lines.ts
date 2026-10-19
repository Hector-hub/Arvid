// Frases fijas de ARVID (spec 06, DL y LG): están en src/i18n y aquí se cuentan, se eligen y se rellenan.
import type { Gender, Moment } from '../../domain/arvid/arvid';
import { keysOf, getLocale, tDynamic, type Vars } from '../../i18n';

type Group = `lines.${Moment | 'achievement'}` | `onboarding.${string}`;

/** Número de frases de un grupo (`arvid.lines.greeting.0`, `.1`…; las que tienen género cuentan una vez). */
export function lineCount(group: Group): number {
  const prefix = `arvid.${group}.`;
  const indexes = new Set(
    keysOf(getLocale())
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length).split('.')[0]),
  );
  return indexes.size;
}

/** Frase `index` del grupo en la forma del género del usuario (neutra si no lo indicó). */
export function line(group: Group, index: number, gender: Gender | undefined, vars: Vars = {}): string {
  const base = `arvid.${group}.${index}`;
  const gendered = keysOf(getLocale()).includes(`${base}.x`);
  return tDynamic(gendered ? `${base}.${gender ?? 'x'}` : base, vars);
}

/** Todas las frases de un grupo en orden (diálogos del onboarding). */
export function lines(group: Group, gender: Gender | undefined, vars: Vars = {}): string[] {
  return Array.from({ length: lineCount(group) }, (_, i) => line(group, i, gender, vars));
}
