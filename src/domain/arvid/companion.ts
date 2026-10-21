// Compañero del usuario (spec 08): ARVID, el dron explorador, o DARIS, el dron conejo. Datos y recoloreado de DARIS.
export const COMPANIONS = ['arvid', 'daris'] as const;
export type Companion = (typeof COMPANIONS)[number];
export const DEFAULT_COMPANION: Companion = 'arvid';
export const isCompanion = (v: unknown): v is Companion => typeof v === 'string' && (COMPANIONS as readonly string[]).includes(v);

export const COMPANION_NAME: Record<Companion, string> = { arvid: 'ARVID', daris: 'DARIS' };
/** Terminación de género en español de lo que el compañero dice de sí mismo (ID-02). */
export const COMPANION_SELF_O: Record<Companion, 'o' | 'a'> = { arvid: 'o', daris: 'a' };

// ---------- Colores de DARIS (DC) ----------
export const DARIS_COLORS = ['rosa', 'cian', 'lima', 'ambar', 'rojo', 'violeta'] as const;
export type DarisColor = (typeof DARIS_COLORS)[number];
export const DEFAULT_DARIS_COLOR: DarisColor = 'rosa';
export const isDarisColor = (v: unknown): v is DarisColor => typeof v === 'string' && (DARIS_COLORS as readonly string[]).includes(v);

type Material = 'energy' | 'shell' | 'plating' | 'gold';
type Ramps = Record<Material, readonly string[]>;

/** Gamas por material, de oscuro a claro. `rosa` es el atlas tal cual. */
export const DARIS_RAMPS: Record<Exclude<DarisColor, 'rosa'>, Ramps> = {
  cian: {
    energy: ['#177daa', '#41a6f6', '#73eff7'],
    shell: ['#94b0c2', '#d1dbe3', '#e8eef2', '#f4f4f4'],
    plating: ['#0b0b14', '#1a1c2c', '#29366f', '#333c57', '#3b5dc9', '#566c86'],
    gold: ['#29366f', '#3b5dc9', '#41a6f6'],
  },
  lima: {
    energy: ['#257179', '#38b764', '#a7f070'],
    shell: ['#566c86', '#94b0c2', '#c4cfd8', '#e0e6ea'],
    plating: ['#0b0b14', '#1a1c2c', '#262b33', '#333c57', '#3d4652', '#566c86'],
    gold: ['#257179', '#38b764', '#a7f070'],
  },
  ambar: {
    energy: ['#a04a05', '#f07c36', '#ffcd75'],
    shell: ['#b9a089', '#e4d2bd', '#f2e6d6', '#fff8ec'],
    plating: ['#1a0f0a', '#2a1c12', '#3d2a1c', '#5c3a24', '#7a4f30', '#8a5a3a'],
    gold: ['#5c3a24', '#a04a05', '#ffcd75'],
  },
  rojo: {
    energy: ['#5d0e1e', '#b13e53', '#ff4a5a'],
    shell: ['#1a1c2c', '#262b33', '#333c57', '#566c86'],
    plating: ['#050508', '#0b0b14', '#14141c', '#1a1c2c', '#262b33', '#333c57'],
    gold: ['#566c86', '#94b0c2', '#f4f4f4'],
  },
  violeta: {
    energy: ['#3b2a8c', '#7a4fd1', '#c8a8ff'],
    shell: ['#9a8fc0', '#c9c0e8', '#e2dcf5', '#f4f1ff'],
    plating: ['#0d0a1f', '#1d1238', '#2a1c52', '#3b2a8c', '#4d3fa0', '#5a3fb0'],
    gold: ['#3b2a8c', '#7a4fd1', '#c8a8ff'],
  },
};

/** Color de muestra de cada variante (el brillo de su energía). */
export const DARIS_SWATCH: Record<DarisColor, string> = {
  rosa: '#f35fd1',
  cian: '#73eff7',
  lima: '#a7f070',
  ambar: '#ffcd75',
  rojo: '#ff4a5a',
  violeta: '#c8a8ff',
};

function hsl(r: number, g: number, b: number): [number, number, number] {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rr ? (gg - bb) / d + (gg < bb ? 6 : 0) : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
  return [h * 60, s, l];
}

/** Material de un color del atlas de DARIS; el contorno no cambia (`undefined`). */
export function darisMaterial(r: number, g: number, b: number): Material | undefined {
  const [h, s, l] = hsl(r, g, b);
  if (l < 0.08) return undefined;
  if (s > 0.55 && h >= 300 && h <= 345 && l >= 0.45 && l <= 0.8) return 'energy';
  if (l >= 0.68 && s < 0.45) return 'shell';
  if ((h <= 40 || h >= 345) && s > 0.4) return 'gold';
  return 'plating';
}

const lum = (c: number) => 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);
const hexInt = (h: string) => parseInt(h.slice(1), 16);

/**
 * Recolorea en el sitio el atlas de DARIS (DC-01): cada color se asigna a su material y, dentro de él, se reparte
 * por luminosidad sobre la gama de la variante.
 */
export function recolorDaris(px: Uint8ClampedArray, color: DarisColor): void {
  if (color === 'rosa') return;
  const ramps = DARIS_RAMPS[color];
  const groups = new Map<Material, Set<number>>();
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3]! < 128) continue;
    const m = darisMaterial(px[i]!, px[i + 1]!, px[i + 2]!);
    if (!m) continue;
    const c = (px[i]! << 16) | (px[i + 1]! << 8) | px[i + 2]!;
    let g = groups.get(m);
    if (!g) groups.set(m, (g = new Set()));
    g.add(c);
  }
  const table = new Map<number, number>();
  for (const [m, set] of groups) {
    const cs = [...set].sort((a, b) => lum(a) - lum(b));
    const ramp = ramps[m];
    cs.forEach((c, i) => {
      const idx = cs.length === 1 ? ramp.length - 1 : Math.round((i / (cs.length - 1)) * (ramp.length - 1));
      table.set(c, hexInt(ramp[idx]!));
    });
  }
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3]! < 128) continue;
    const to = table.get((px[i]! << 16) | (px[i + 1]! << 8) | px[i + 2]!);
    if (to === undefined) continue;
    px[i] = (to >> 16) & 255;
    px[i + 1] = (to >> 8) & 255;
    px[i + 2] = to & 255;
  }
}
