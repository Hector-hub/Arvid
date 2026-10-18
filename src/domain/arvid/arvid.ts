// ARVID, la mascota (spec 06): colores, perfil del usuario y reglas de cuándo habla. Puro: los textos están en
// src/i18n y la app los elige con estas reglas.
import type { LocalDate } from '../time/localDate';
import type { CastId } from '../avatar/catalog';

// ---------- Perfil (§4) ----------
export type Gender = 'm' | 'f' | 'x';
export const GENDERS: readonly Gender[] = ['m', 'f', 'x'];
export const ALIAS_MAX = 20;

export interface Profile {
  alias: string;
  gender: Gender;
}

/** Alias de 1 a 20 caracteres visibles, sin espacios al principio ni al final. */
export function validateAlias(alias: string): 'aliasRequired' | 'aliasTooLong' | undefined {
  const trimmed = alias.trim();
  if (!trimmed) return 'aliasRequired';
  if ([...trimmed].length > ALIAS_MAX) return 'aliasTooLong';
  return undefined;
}

export function normalizeProfile(value: unknown): Profile | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { alias, gender } = value as Record<string, unknown>;
  if (typeof alias !== 'string' || validateAlias(alias)) return undefined;
  return { alias: alias.trim(), gender: GENDERS.includes(gender as Gender) ? (gender as Gender) : 'x' };
}

/** Orden del carrusel según el género (PJ-02): primero los afines, todos disponibles. */
export function castOrder(gender: Gender | undefined): CastId[] {
  if (gender === 'm') return ['el', 'el2', 'ella', 'ella2'];
  if (gender === 'f') return ['ella', 'ella2', 'el', 'el2'];
  return ['ella', 'el', 'ella2', 'el2'];
}

// ---------- Colores (AV-01) ----------
export const ARVID_COLORS = ['original', 'cian', 'magenta', 'lima', 'oro', 'violeta'] as const;
export type ArvidColor = (typeof ARVID_COLORS)[number];
export const DEFAULT_ARVID_COLOR: ArvidColor = 'cian';

/** Acentos del dron (hélice, banda y luces), de oscuro a claro; el cuerpo no cambia. */
export const ARVID_ACCENT = ['#38002c', '#ab1f65', '#d22f1e', '#ff8142'] as const;
export const ARVID_RAMPS: Record<ArvidColor, readonly string[]> = {
  original: ARVID_ACCENT,
  cian: ['#031b70', '#0b347f', '#177daa', '#05d9e8'],
  magenta: ['#3b0030', '#9b0c8e', '#d91a8c', '#ff2a6d'],
  lima: ['#173404', '#257179', '#38b764', '#a7f070'],
  oro: ['#5c2a00', '#b86a0b', '#ec9b09', '#ffd800'],
  violeta: ['#1d1238', '#3b2a8c', '#7a4fd1', '#a884f3'],
};

const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as const;

/** Recolorea en el sitio los acentos de ARVID en las filas `[fromRow, height)` de una imagen RGBA. */
export function recolorArvid(px: Uint8ClampedArray, width: number, height: number, color: ArvidColor, fromRow = 0): void {
  if (color === 'original') return;
  const map = new Map<string, readonly [number, number, number]>(ARVID_ACCENT.map((a, i) => [a, hex(ARVID_RAMPS[color][i]!)]));
  for (let i = fromRow * width * 4; i < width * height * 4; i += 4) {
    if (px[i + 3] === 0) continue;
    const key = '#' + [px[i]!, px[i + 1]!, px[i + 2]!].map((v) => v.toString(16).padStart(2, '0')).join('');
    const to = map.get(key);
    if (to) [px[i], px[i + 1], px[i + 2]] = to;
  }
}

// ---------- Momentos (DL-01) ----------
/** De mayor a menor prioridad. */
export const MOMENTS = ['levelUp', 'dayComplete', 'firstActivity', 'comeback', 'greeting'] as const;
export type Moment = (typeof MOMENTS)[number];

/** Lo ya dicho: fecha en que se dijo cada momento y última frase usada. */
export interface ArvidSeen {
  said?: Partial<Record<Moment, LocalDate>>;
  lastLine?: Partial<Record<Moment, number>>;
}

/** Entre los momentos que se dan ahora, el de mayor prioridad que aún no se dijo hoy. */
export function chooseMoment(candidates: readonly Moment[], seen: ArvidSeen | undefined, today: LocalDate): Moment | undefined {
  return MOMENTS.find((m) => candidates.includes(m) && seen?.said?.[m] !== today);
}

/** Frase al azar entre `count`, sin repetir la última (DL-04). */
export function pickLine(count: number, last: number | undefined, rng: () => number): number {
  if (count <= 1) return 0;
  const options = Array.from({ length: count }, (_, i) => i).filter((i) => i !== last);
  return options[Math.floor(rng() * options.length)]!;
}

export function markSaid(seen: ArvidSeen | undefined, moment: Moment, line: number, today: LocalDate): ArvidSeen {
  return {
    said: { ...seen?.said, [moment]: today },
    lastLine: { ...seen?.lastLine, [moment]: line },
  };
}

/** Saludo según la hora local (DL-02): días hasta las 12:59, tardes hasta las 19:59 y noches después. */
export function helloFor(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 13) return 'morning';
  if (hour < 20) return 'afternoon';
  return 'evening';
}
