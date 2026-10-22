// Recoloreado de los protagonistas por variante (spec 05, PRO-01, PRO-04).
// Trabaja sobre píxeles RGBA en bruto (el canvas lo pone app/scene), así que es puro y se prueba sin navegador.
// Cada protagonista tiene su método, heredado del prototipo, porque sus paletas se organizan de forma distinta:
// - Ella: colores exactos por rol; un tono es a la vez sombra del pelo y medias, y se separa por altura.
// - Ghost (Él): tres materiales (armadura, luces y piezas blancas) por tono y luminosidad (HSL).
// - Ella 2 y Él 2: roles con varios tonos; cada tono se asigna a la gama nueva por orden de luminosidad.
import type { CastId, VariantId } from './catalog';

type RGB = [number, number, number];
export type Ramp = string[];

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/** Lectura de un canal (los índices siempre están dentro de la hoja). */
const ch = (px: Uint8ClampedArray, i: number) => px[i]!;
const toHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
const lum = ([r, g, b]: RGB) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Gamas de piel de oscuro a claro. */
const SKINS = {
  clara: ['#8f5a4a', '#c98f74', '#f2c9a8'],
  media: ['#6e4128', '#a8683f', '#d9a06b'],
  oscura: ['#40261a', '#6e4128', '#9a6440'],
  palida: ['#9a6c5c', '#d8a890', '#ffe0c8'],
} as const;
type Skin = keyof typeof SKINS;

interface Frame {
  px: Uint8ClampedArray;
  width: number;
  height: number;
  x0: number;
  frameW: number;
  /** Primera fila opaca del fotograma. */
  top: number;
}

function* frames(px: Uint8ClampedArray, width: number, height: number, frameW: number): Generator<Frame> {
  for (let x0 = 0; x0 + frameW <= width; x0 += frameW) {
    let top = height;
    for (let y = 0; y < height && top === height; y++)
      for (let x = x0; x < x0 + frameW; x++)
        if (ch(px, (y * width + x) * 4 + 3) > 0) {
          top = y;
          break;
        }
    yield { px, width, height, x0, frameW, top };
  }
}

function set(px: Uint8ClampedArray, i: number, [r, g, b]: RGB) {
  px[i] = r;
  px[i + 1] = g;
  px[i + 2] = b;
}

// ---------------- Ella (Warped City) ----------------
const ELLA = {
  hair: '#93278f',
  hairLight: '#c51aea',
  jacket: '#ffd800',
  jacketShadow: '#ec7809',
  skin: '#ffb164',
  skinShadow: '#b15c51',
  shoes: '#81709a',
  shoesAccent: '#ff2245',
  /** Sombra del pelo en las primeras filas y medias en el resto. */
  shared: '#442b61',
} as const;
const ELLA_HAIR_ROWS = 13;
const ELLA_SKINS: Record<Skin, [string, string]> = {
  clara: ['#ffb164', '#b15c51'],
  media: ['#d9925b', '#8d5524'],
  oscura: ['#8d5524', '#5c3317'],
  palida: ['#ffd2a6', '#c98b6b'],
};
type EllaRole = Exclude<keyof typeof ELLA, 'shared'> | 'hairShadow' | 'legs';
const ELLA_VARIANTS: Record<Exclude<VariantId, 'original'>, { skin: Skin; colors: Partial<Record<EllaRole, string>> }> = {
  neon: {
    skin: 'media',
    colors: { hair: '#05d9e8', hairLight: '#d1f7ff', hairShadow: '#0b347f', jacket: '#ff2a6d', jacketShadow: '#9b0c8e', legs: '#031b70', shoes: '#d1f7ff', shoesAccent: '#05d9e8' },
  },
  carmesi: {
    skin: 'palida',
    colors: { hair: '#1a1c2c', hairLight: '#566c86', hairShadow: '#050912', jacket: '#ec1e44', jacketShadow: '#880c4f', legs: '#21004b', shoes: '#ffd800', shoesAccent: '#1a1c2c' },
  },
  bosque: {
    skin: 'oscura',
    colors: { hair: '#ffd800', hairLight: '#fff3a0', hairShadow: '#ec7809', jacket: '#38b764', jacketShadow: '#257179', legs: '#3b2a1e', shoes: '#f4f4f4', shoesAccent: '#38b764' },
  },
  plata: {
    skin: 'clara',
    colors: { hair: '#d1f7ff', hairLight: '#ffffff', hairShadow: '#94b0c2', jacket: '#f4f4f4', jacketShadow: '#94b0c2', legs: '#1a1c2c', shoes: '#05d9e8', shoesAccent: '#0b347f' },
  },
  ocaso: {
    skin: 'media',
    colors: { hair: '#f07c36', hairLight: '#ffcd75', hairShadow: '#b13e53', jacket: '#7a4fd1', jacketShadow: '#3b2a8c', legs: '#072b3a', shoes: '#ffcd75', shoesAccent: '#f07c36' },
  },
};

function recolorElla(f: Frame, variant: Exclude<VariantId, 'original'>) {
  const v = ELLA_VARIANTS[variant];
  const colors: Partial<Record<EllaRole, string>> = { ...v.colors };
  [colors.skin, colors.skinShadow] = ELLA_SKINS[v.skin];
  const map = new Map<string, RGB>();
  for (const role of ['hair', 'hairLight', 'jacket', 'jacketShadow', 'skin', 'skinShadow', 'shoes', 'shoesAccent'] as const) {
    const to = colors[role];
    if (to) map.set(ELLA[role], hex(to));
  }
  for (let y = 0; y < f.height; y++)
    for (let x = f.x0; x < f.x0 + f.frameW; x++) {
      const i = (y * f.width + x) * 4;
      if (ch(f.px, i + 3) === 0) continue;
      const h = toHex(ch(f.px, i), ch(f.px, i + 1), ch(f.px, i + 2));
      const to = h === ELLA.shared ? colors[y < f.top + ELLA_HAIR_ROWS ? 'hairShadow' : 'legs'] : undefined;
      const mapped = to ? hex(to) : map.get(h);
      if (mapped) set(f.px, i, mapped);
    }
}

// ---------------- Ghost (Él), ninja generado con IA (64 × 64, 35 fotogramas) ----------------
// Tres materiales por tono y luminosidad: armadura (azules oscuros), luces (cian del visor y las juntas) y piezas
// blancas (banda, cinturón, faldón y suelas). Dentro de cada uno, los tonos se reparten por luminosidad sobre la gama
// de la variante. El contorno no cambia.
type GhostMaterial = 'armor' | 'energy' | 'light';
const GHOST_VARIANTS: Record<Exclude<VariantId, 'original'>, Record<GhostMaterial, readonly string[]>> = {
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
};

function hsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

/** Material de un color de Ghost; el contorno no cambia (`undefined`). */
export function ghostMaterial(r: number, g: number, b: number): GhostMaterial | undefined {
  const [h, s, l] = hsl(r, g, b);
  if (l < 0.08) return undefined;
  if (h >= 180 && h <= 212 && s >= 0.38 && l >= 0.17) return 'energy';
  if (l >= 0.5) return 'light';
  return 'armor';
}

function recolorGhost(f: Frame, variant: Exclude<VariantId, 'original'>) {
  const ramps = GHOST_VARIANTS[variant];
  const groups = new Map<GhostMaterial, Set<string>>();
  const each = (fn: (i: number, h: string) => void) => {
    for (let y = 0; y < f.height; y++)
      for (let lx = 0; lx < f.frameW; lx++) {
        const i = (y * f.width + f.x0 + lx) * 4;
        if (ch(f.px, i + 3) < 128) continue;
        fn(i, toHex(ch(f.px, i), ch(f.px, i + 1), ch(f.px, i + 2)));
      }
  };
  each((_i, h) => {
    const [r, g, b] = hex(h);
    const m = ghostMaterial(r, g, b);
    if (!m) return;
    let set_ = groups.get(m);
    if (!set_) groups.set(m, (set_ = new Set()));
    set_.add(h);
  });
  const table = new Map<string, RGB>();
  for (const [m, set_] of groups) {
    const cs = [...set_].sort((a, b) => lum(hex(a)) - lum(hex(b)));
    const ramp = ramps[m];
    cs.forEach((c, i) => table.set(c, hex(ramp[cs.length === 1 ? ramp.length - 1 : Math.round((i / (cs.length - 1)) * (ramp.length - 1))]!)));
  }
  each((i, h) => {
    const to = table.get(h);
    if (to) set(f.px, i, to);
  });
}

// ---------------- Ella 2 y Él 2: roles con varios tonos ----------------
interface RoleSpec<R extends string> {
  roles: Record<R, string[]>;
  /** Rol del píxel según su color, posición local, primera fila opaca y si toca la transparencia. */
  roleOf: (h: string, x: number, y: number, top: number, edge: boolean) => R | undefined;
  variants: Record<Exclude<VariantId, 'original'>, Partial<Record<Exclude<R, 'skin'>, Ramp>> & { skin: Skin }>;
}

const B_RED = ['#8a0b41', '#ce2038'];
const BRAWLER: RoleSpec<'hair' | 'outfit' | 'skin' | 'boots' | 'accent'> = {
  roles: { hair: B_RED, outfit: B_RED, skin: ['#9c5c37', '#d77e4b', '#ffb164'], boots: ['#582d39', '#793d4e'], accent: ['#ed4924', '#edb021'] },
  // El rojo es a la vez pelo y ropa: es pelo en la cabeza y en la coleta que cae por la espalda (lado izquierdo)
  roleOf(h, x, y, top) {
    if (B_RED.includes(h)) return y < top + 11 || (y < top + 19 && x < 46) ? 'hair' : 'outfit';
    for (const r of ['skin', 'boots', 'accent'] as const) if (BRAWLER.roles[r].includes(h)) return r;
    return undefined;
  },
  variants: {
    neon: { hair: ['#0b347f', '#05d9e8'], outfit: ['#9b0c8e', '#ff2a6d'], accent: ['#05d9e8', '#d1f7ff'], boots: ['#031b70', '#0b347f'], skin: 'media' },
    carmesi: { hair: ['#050912', '#333c57'], outfit: ['#880c4f', '#ec1e44'], accent: ['#ffd800', '#ffcd75'], boots: ['#1a1c2c', '#333c57'], skin: 'palida' },
    bosque: { hair: ['#ec7809', '#ffd800'], outfit: ['#257179', '#38b764'], accent: ['#a7f070', '#f4f4f4'], boots: ['#3b2a1e', '#5c3a24'], skin: 'oscura' },
    plata: { hair: ['#94b0c2', '#f4f4f4'], outfit: ['#566c86', '#d1f7ff'], accent: ['#05d9e8', '#73eff7'], boots: ['#1a1c2c', '#333c57'], skin: 'clara' },
    ocaso: { hair: ['#b13e53', '#f07c36'], outfit: ['#3b2a8c', '#7a4fd1'], accent: ['#ffcd75', '#f07c36'], boots: ['#072b3a', '#177daa'], skin: 'media' },
  },
};

// Drifter (Él 2), hoja nueva generada con IA (64 × 64, 20 colores): el color no basta (el negro es pelo, contorno
// y camiseta; los marrones, piel y zapatos), así que se usa también la zona respecto a la primera fila opaca.
const M2_HEAD = 12; // filas de pelo
const M2_HAIR_TOP = 7; // por encima de la cara
const M2_WAIST = 28; // por encima, camisa; por debajo, vaqueros
const M2_FEET = 51; // por debajo, solo zapatos
const MALE2: RoleSpec<'hair' | 'shirt' | 'skin' | 'jeans' | 'shoes'> = {
  roles: {
    hair: ['#080815', '#140e19', '#1d1726'],
    shirt: ['#2b4e73', '#4a7494', '#708ba5', '#8da0b3', '#b3bfc9', '#d2dae0', '#f7f8f9'],
    skin: ['#5d373a', '#a54a36', '#b75a3f', '#a37d83', '#ab8d78', '#f49c64'],
    jeans: ['#1b2f5a', '#1c3364', '#2b4e73', '#386a8c', '#4a7494'],
    shoes: ['#1d1726', '#5d373a', '#a54a36', '#b75a3f'],
  },
  roleOf(h, _x, y, top) {
    const r = y - top;
    if (r >= M2_FEET) return MALE2.roles.shoes.includes(h) ? 'shoes' : undefined;
    // Los tonos claros del pelo también son ceja y ojo: solo son pelo en la parte alta de la cabeza
    if (r < M2_HEAD && h === '#080815') return 'hair';
    if (r < M2_HAIR_TOP && MALE2.roles.hair.includes(h)) return 'hair';
    if (MALE2.roles.skin.includes(h)) return 'skin';
    // Los blancos y grises azulados de la cabeza son el ojo: no son camisa
    if (r < M2_HEAD) return undefined;
    if (r < M2_WAIST) return MALE2.roles.shirt.includes(h) ? 'shirt' : undefined;
    return MALE2.roles.jeans.includes(h) ? 'jeans' : undefined;
  },
  variants: {
    neon: { hair: ['#031b70', '#05d9e8'], shirt: ['#031b70', '#0b347f', '#177daa', '#05d9e8'], jeans: ['#160f2b', '#2a1a4a', '#4d3fa0'], shoes: ['#540052', '#ff2a6d'], skin: 'media' },
    carmesi: { hair: ['#050912', '#333c57'], shirt: ['#540052', '#880c4f', '#b13e53', '#ec1e44'], jeans: ['#0b0b14', '#1a1c2c', '#333c57'], shoes: ['#1a1c2c', '#ffd800'], skin: 'palida' },
    bosque: { hair: ['#a04a05', '#ec7809'], shirt: ['#173404', '#257179', '#2e9a5a', '#38b764'], jeans: ['#2a1c12', '#5c3a24', '#8a5a3a'], shoes: ['#173404', '#38b764'], skin: 'oscura' },
    plata: { hair: ['#94b0c2', '#f4f4f4'], shirt: ['#566c86', '#94b0c2', '#d1f7ff', '#ffffff'], jeans: ['#0b0b14', '#1a1c2c', '#333c57'], shoes: ['#0b347f', '#05d9e8'], skin: 'clara' },
    ocaso: { hair: ['#b13e53', '#f07c36'], shirt: ['#1d1238', '#3b2a8c', '#5a3fb0', '#7a4fd1'], jeans: ['#072b3a', '#177daa', '#3aa0c8'], shoes: ['#540052', '#f07c36'], skin: 'media' },
  },
};

function recolorByRoles<R extends string>(f: Frame, spec: RoleSpec<R>, variant: Exclude<VariantId, 'original'>) {
  const { skin, ...ramps } = spec.variants[variant];
  const allRamps: Partial<Record<string, Ramp>> = { ...(ramps as Partial<Record<string, Ramp>>), skin: [...SKINS[skin]] };
  // Por rol: color original → color nuevo, emparejados por orden de luminosidad
  const tables = new Map<string, Map<string, RGB>>();
  for (const [role, originals] of Object.entries(spec.roles) as [R, string[]][]) {
    const ramp = allRamps[role];
    if (!ramp) continue;
    const sorted = [...originals].sort((a, b) => lum(hex(a)) - lum(hex(b)));
    const last = Math.max(1, sorted.length - 1);
    tables.set(role, new Map(sorted.map((c, i) => [c, hex(ramp[Math.round((i / last) * (ramp.length - 1))]!)])));
  }
  const { px, width, height, x0, frameW, top } = f;
  const clear = (x: number, y: number) => x < x0 || x >= x0 + frameW || y < 0 || y >= height || ch(px, (y * width + x) * 4 + 3) === 0;
  const out: [number, RGB][] = [];
  for (let y = 0; y < height; y++)
    for (let x = x0; x < x0 + frameW; x++) {
      const i = (y * width + x) * 4;
      if (ch(px, i + 3) === 0) continue;
      const h = toHex(ch(px, i), ch(px, i + 1), ch(px, i + 2));
      const edge = clear(x + 1, y) || clear(x - 1, y) || clear(x, y + 1) || clear(x, y - 1);
      const role = spec.roleOf(h, x - x0, y, top, edge);
      const to = role && tables.get(role)?.get(h);
      if (to) out.push([i, to]);
    }
  for (const [i, to] of out) set(px, i, to);
}

/**
 * Recolorea en el sitio una hoja de `castId` (todos sus fotogramas) a la variante indicada.
 * `original` deja la hoja tal cual.
 */
export function recolorSheet(px: Uint8ClampedArray, width: number, height: number, frameW: number, castId: CastId, variant: VariantId) {
  for (const f of frames(px, width, height, frameW)) {
    if (variant === 'original') continue;
    if (castId === 'el') recolorGhost(f, variant);
    else if (castId === 'ella') recolorElla(f, variant);
    else recolorByRoles<string>(f, (castId === 'ella2' ? BRAWLER : MALE2) as RoleSpec<string>, variant);
  }
}
