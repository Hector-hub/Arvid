// Retratos de los protagonistas (spec 18): las caras de cada hoja y su recoloreado por variante (RT-05).
// Puro: trabaja sobre píxeles RGBA en bruto; el lienzo lo pone app/avatar.
import type { CastId, VariantId } from './catalog';

/** Lado de cada cara, en píxeles. Cada hoja tiene 4 × 4 caras. */
export const FACE = 64;
export const FACE_COLUMNS = 4;

/** Caras de la hoja (spec 18 §2), por fila: reposo, hablar, alegría y otras. */
export const FACES = {
  normal: 0,
  blink: [1, 2, 1],
  talk: [4, 5, 6, 5],
  smile: 8,
  grin: 9,
  laugh: 10,
  surprise: 12,
  determined: 13,
  thinking: 14,
  tired: 15,
} as const;

export type Expression = 'normal' | 'happy' | 'surprise' | 'determined' | 'thinking' | 'tired';

/** La cara de cada expresión (RT-03). */
export const EXPRESSION_FACE: Record<Expression, number> = {
  normal: FACES.normal,
  happy: FACES.grin,
  surprise: FACES.surprise,
  determined: FACES.determined,
  thinking: FACES.thinking,
  tired: FACES.tired,
};

/** Duración de cada cara del parpadeo (RT-02) y de la boca al hablar (RT-03), en ms. */
export const BLINK_MS = [60, 90, 60];
export const TALK_MS = 110;
/** Entre parpadeos, de 3 a 6 s (RT-02). */
export const BLINK_EVERY_MS: [number, number] = [3000, 6000];

export const portraitSrc = (cast: CastId) => `/avatar/${cast}-caras.png`;
export const rolesSrc = (cast: CastId) => `/avatar/${cast}-papeles.png`;

/** Papeles de cada retrato, en el orden de la máscara (canal rojo: 1, 2, 3…; 0 = fijo: contorno, ojos, dientes). */
export const PORTRAIT_ROLES: Record<CastId, readonly string[]> = {
  ella: ['hair', 'outfit', 'skin'],
  ella2: ['hair', 'outfit', 'skin', 'accent'],
  el: ['armor', 'energy', 'light'],
  el2: ['hair', 'shirt', 'skin', 'tie'],
};

/** Gamas de piel de oscuro a claro (las mismas que el sprite, PRO-01). */
const SKINS = {
  clara: ['#8f5a4a', '#c98f74', '#f2c9a8'],
  media: ['#6e4128', '#a8683f', '#d9a06b'],
  oscura: ['#40261a', '#6e4128', '#9a6440'],
  palida: ['#9a6c5c', '#d8a890', '#ffe0c8'],
} as const;

type Ramps = Partial<Record<string, readonly string[]>>;

/** Gamas de cada variante, de oscuro a claro, tomadas de las del sprite (recolor.ts). */
const RAMPS: Record<CastId, Record<Exclude<VariantId, 'original'>, Ramps>> = {
  ella: {
    neon: { hair: ['#0b347f', '#05d9e8', '#d1f7ff'], outfit: ['#9b0c8e', '#ff2a6d'], skin: SKINS.media },
    carmesi: { hair: ['#050912', '#1a1c2c', '#566c86'], outfit: ['#880c4f', '#ec1e44'], skin: SKINS.palida },
    bosque: { hair: ['#ec7809', '#ffd800', '#fff3a0'], outfit: ['#257179', '#38b764'], skin: SKINS.oscura },
    plata: { hair: ['#94b0c2', '#d1f7ff', '#ffffff'], outfit: ['#94b0c2', '#f4f4f4'], skin: SKINS.clara },
    ocaso: { hair: ['#b13e53', '#f07c36', '#ffcd75'], outfit: ['#3b2a8c', '#7a4fd1'], skin: SKINS.media },
  },
  ella2: {
    neon: {
      hair: ['#0b347f', '#05d9e8'],
      outfit: ['#9b0c8e', '#ff2a6d'],
      accent: ['#05d9e8', '#d1f7ff'],
      skin: SKINS.media,
    },
    carmesi: {
      hair: ['#050912', '#333c57'],
      outfit: ['#880c4f', '#ec1e44'],
      accent: ['#ffd800', '#ffcd75'],
      skin: SKINS.palida,
    },
    bosque: {
      hair: ['#ec7809', '#ffd800'],
      outfit: ['#257179', '#38b764'],
      accent: ['#a7f070', '#f4f4f4'],
      skin: SKINS.oscura,
    },
    plata: {
      hair: ['#94b0c2', '#f4f4f4'],
      outfit: ['#566c86', '#d1f7ff'],
      accent: ['#05d9e8', '#73eff7'],
      skin: SKINS.clara,
    },
    ocaso: {
      hair: ['#b13e53', '#f07c36'],
      outfit: ['#3b2a8c', '#7a4fd1'],
      accent: ['#ffcd75', '#f07c36'],
      skin: SKINS.media,
    },
  },
  // Ghost: la piel no cambia, como en el sprite
  el: {
    neon: {
      armor: ['#0d0a1f', '#1d1238', '#2a1c52', '#3b2a8c', '#4d3fa0', '#5a3fb0'],
      energy: ['#540052', '#c42a8d', '#ff7ad9'],
      light: ['#c9c0e8', '#e2dcf5', '#f4f1ff'],
    },
    carmesi: {
      armor: ['#0b0b10', '#14141c', '#1d1d27', '#2a2a36', '#3a3a48', '#4a4a5a'],
      energy: ['#5d0e1e', '#b13e53', '#ff4a5a'],
      light: ['#94b0c2', '#d1dbe3', '#f4f4f4'],
    },
    bosque: {
      armor: ['#0b1408', '#132412', '#1c331a', '#284426', '#365a33', '#466e40'],
      energy: ['#257179', '#38b764', '#a7f070'],
      light: ['#c8b88a', '#e4d8b0', '#f6f0d8'],
    },
    plata: {
      armor: ['#333c57', '#4c546a', '#566c86', '#6f849c', '#94b0c2', '#b8c8d6'],
      energy: ['#177daa', '#41a6f6', '#73eff7'],
      light: ['#e0e6ea', '#f0f4f6', '#ffffff'],
    },
    ocaso: {
      armor: ['#140a1e', '#24123a', '#3a1c52', '#4d2a6a', '#5e3a80', '#6e4a94'],
      energy: ['#a04a05', '#f07c36', '#ffcd75'],
      light: ['#e4d2bd', '#f2e6d6', '#fff8ec'],
    },
  },
  el2: {
    neon: {
      hair: ['#031b70', '#05d9e8'],
      shirt: ['#031b70', '#0b347f', '#177daa', '#05d9e8'],
      tie: ['#160f2b', '#2a1a4a', '#4d3fa0'],
      skin: SKINS.media,
    },
    carmesi: {
      hair: ['#050912', '#333c57'],
      shirt: ['#540052', '#880c4f', '#b13e53', '#ec1e44'],
      tie: ['#0b0b14', '#1a1c2c', '#333c57'],
      skin: SKINS.palida,
    },
    bosque: {
      hair: ['#a04a05', '#ec7809'],
      shirt: ['#173404', '#257179', '#2e9a5a', '#38b764'],
      tie: ['#2a1c12', '#5c3a24', '#8a5a3a'],
      skin: SKINS.oscura,
    },
    plata: {
      hair: ['#94b0c2', '#f4f4f4'],
      shirt: ['#566c86', '#94b0c2', '#d1f7ff', '#ffffff'],
      tie: ['#0b0b14', '#1a1c2c', '#333c57'],
      skin: SKINS.clara,
    },
    ocaso: {
      hair: ['#b13e53', '#f07c36'],
      shirt: ['#1d1238', '#3b2a8c', '#5a3fb0', '#7a4fd1'],
      tie: ['#072b3a', '#177daa', '#3aa0c8'],
      skin: SKINS.media,
    },
  },
};

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Color de la gama en `t` (0–1), interpolado entre sus tonos. */
function along(ramp: readonly RGB[], t: number): RGB {
  const k = Math.max(0, Math.min(1, t)) * (ramp.length - 1);
  const i = Math.min(Math.floor(k), ramp.length - 2);
  const f = k - i;
  const a = ramp[i]!;
  const b = ramp[i + 1]!;
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

/** Percentil `p` (0–1) de una lista ya ordenada. */
const percentile = (sorted: number[], p: number) =>
  sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))]!;

/**
 * Recolorea en el sitio una hoja de caras a la variante (RT-05). `roles` es la máscara de la misma medida (canal rojo:
 * índice del papel). Cada papel se lleva a su gama por luminosidad, de su 2 % más oscuro a su 98 % más claro; salvo la
 * piel, las gamas empiezan con un tono muy oscuro para las líneas interiores. Lo fijo (0) no cambia.
 */
export function recolorPortrait(
  px: Uint8ClampedArray,
  roles: Uint8ClampedArray,
  cast: CastId,
  variant: VariantId,
): void {
  if (variant === 'original') return;
  const names = PORTRAIT_ROLES[cast];
  const ramps = RAMPS[cast][variant];
  names.forEach((name, index) => {
    const ramp = ramps[name];
    if (!ramp) return;
    const role = index + 1;
    const stops = ramp.map(hex);
    if (name !== 'skin') stops.unshift(stops[0]!.map((v) => Math.round(v * 0.35)) as RGB);
    const lums: number[] = [];
    for (let i = 0; i < px.length; i += 4)
      if (roles[i] === role && px[i + 3]! > 0) lums.push(lum(px[i]!, px[i + 1]!, px[i + 2]!));
    if (lums.length === 0) return;
    lums.sort((a, b) => a - b);
    const lo = percentile(lums, 0.02);
    const span = Math.max(1, percentile(lums, 0.98) - lo);
    for (let i = 0; i < px.length; i += 4) {
      if (roles[i] !== role || px[i + 3] === 0) continue;
      const [r, g, b] = along(stops, (lum(px[i]!, px[i + 1]!, px[i + 2]!) - lo) / span);
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
    }
  });
}
