// Catálogo de protagonistas y variantes de color (spec 05, PRO-01). Solo datos: el dibujo vive en app/scene.

export const CAST_IDS = ['ella', 'ella2', 'el', 'el2'] as const;
export type CastId = (typeof CAST_IDS)[number];

export const VARIANT_IDS = ['original', 'neon', 'carmesi', 'bosque', 'plata', 'ocaso'] as const;
export type VariantId = (typeof VARIANT_IDS)[number];

export interface Avatar {
  cast: CastId;
  variant: VariantId;
}

export const DEFAULT_AVATAR: Avatar = { cast: 'ella', variant: 'original' };

/** Hoja de sprites en una fila: `frames` fotogramas de `frameW`×`frameH`. */
export interface SheetSpec {
  file: string;
  frameW: number;
  frameH: number;
  frames: number;
}

export interface CastSpec {
  id: CastId;
  /** Nombre en la interfaz (provisional, S5-09). */
  name: string;
  walk: SheetSpec & {
    /** Fotogramas de 60 Hz que dura cada fotograma de la animación. */
    ticks: number;
  };
  /** Reposo para el movimiento reducido; sin él se usa `restFrame` del ciclo de caminar. */
  idle?: SheetSpec;
  restFrame: number;
  /** Centro del cuerpo y fila de los pies dentro del fotograma (sin espejo ni escala). */
  anchorX: number;
  feetY: number;
  scale: number;
  /** El sprite mira a la izquierda: se dibuja en espejo para caminar hacia la derecha. */
  flip: boolean;
  credit: string;
}

export const CASTS: Record<CastId, CastSpec> = {
  ella: {
    id: 'ella',
    name: 'Ella',
    walk: { file: 'ella-walk.png', frameW: 71, frameH: 67, frames: 16, ticks: 5 },
    idle: { file: 'ella-idle.png', frameW: 71, frameH: 67, frames: 4 },
    restFrame: 0,
    anchorX: 38,
    feetY: 67,
    scale: 1,
    flip: false,
    credit: 'Warped City · Ansimuz',
  },
  ella2: {
    id: 'ella2',
    name: 'Ella 2',
    walk: { file: 'ella2-walk.png', frameW: 96, frameH: 63, frames: 10, ticks: 6 },
    idle: { file: 'ella2-idle.png', frameW: 96, frameH: 63, frames: 4 },
    restFrame: 0,
    anchorX: 48,
    feetY: 63,
    scale: 1,
    flip: false,
    credit: 'Streets of Fight · Ansimuz',
  },
  el: {
    id: 'el',
    name: 'Él',
    walk: { file: 'el-walk.png', frameW: 64, frameH: 64, frames: 8, ticks: 7.5 },
    restFrame: 0,
    anchorX: 29,
    feetY: 64,
    scale: 0.8,
    flip: true,
    credit: 'Propio (sprite-ai.art)',
  },
  el2: {
    id: 'el2',
    name: 'Él 2',
    walk: { file: 'el2-walk.png', frameW: 40, frameH: 60, frames: 8, ticks: 7.5 },
    restFrame: 3, // piernas juntas
    anchorX: 20,
    feetY: 59,
    scale: 1,
    flip: false,
    credit: 'Propio (sprite-ai.art)',
  },
};

export const VARIANT_NAMES: Record<VariantId, string> = {
  original: 'Original',
  neon: 'Neón',
  carmesi: 'Carmesí',
  bosque: 'Bosque',
  plata: 'Plata',
  ocaso: 'Ocaso',
};

const isCast = (v: unknown): v is CastId => typeof v === 'string' && (CAST_IDS as readonly string[]).includes(v);
const isVariant = (v: unknown): v is VariantId => typeof v === 'string' && (VARIANT_IDS as readonly string[]).includes(v);

/** Valor guardado → avatar válido; lo desconocido (backup antiguo o asset retirado) vuelve al valor por defecto (§5). */
export function normalizeAvatar(value: unknown): Avatar {
  if (typeof value !== 'object' || value === null) return DEFAULT_AVATAR;
  const { cast, variant } = value as Record<string, unknown>;
  return isCast(cast) ? { cast, variant: isVariant(variant) ? variant : DEFAULT_AVATAR.variant } : DEFAULT_AVATAR;
}

/** Fotograma de la animación de caminar a partir del tiempo de la escena (en fotogramas de 60 Hz). */
export function walkFrame(cast: CastSpec, t: number): number {
  return Math.floor(t / cast.walk.ticks) % cast.walk.frames;
}
