// Capítulos de la temporada 1 (spec 17 §3.5, CA): cada uno es una lista ordenada de pasos con esperas mínimas. Los
// textos están en i18n (`origen.ch.N.*`); aquí solo el orden, las esperas y a qué chat va cada línea.
import type { NeighborId } from '../scene/city';
import type { OrigenState } from './origen';
import { addDays, toLocalDate } from '../time/localDate';
import { currentChapter } from './periods';
import { FRAGMENTS_STEP, readableFragments } from './fragments';

/** Último capítulo que trae esta versión (NFR17-10): más allá, la historia espera sin avisos. */
export const PUBLISHED_CHAPTER = 10;

export type ChatId = 'signal' | NeighborId;

/** Línea de un chat: la dice el vecino o el compañero por ti (ME-04). */
export interface ChatLineDef {
  who: 'them' | 'you';
  key: string;
}

export type StepDef =
  | { id: string; kind: 'session'; session: number; wait?: Wait }
  | { id: string; kind: 'test'; wait?: Wait }
  | { id: string; kind: 'say'; key: string; wait?: Wait }
  | { id: string; kind: 'chat'; chat: NeighborId; lines: ChatLineDef[]; wait?: Wait };

/** Espera desde el paso anterior: horas, u «otro día» (a partir de las 8 del día siguiente). */
export type Wait = { hours: number } | 'nextDay';

const chat = (id: string, chatId: NeighborId, chapter: number, keys: string[], wait?: Wait): StepDef => ({
  id,
  kind: 'chat',
  chat: chatId,
  wait,
  lines: keys.map((k) => ({ who: k.startsWith('you') ? 'you' : 'them', key: `origen.ch.${chapter}.${k}` })),
});
const say = (id: string, chapter: number, key: string, wait?: Wait): StepDef => ({ id, kind: 'say', key: `origen.ch.${chapter}.${key}`, wait });
const SOON: Wait = { hours: 0.01 };

export interface ChapterDef {
  n: number;
  /** Vecinos que el capítulo necesita en la calle aunque el nivel no los haya traído (RI-09). */
  needs: NeighborId[];
  steps: StepDef[];
}

/** El capítulo 1 es el primer contacto y la pregunta (PC, DE): no tiene pasos aquí. */
export const CHAPTERS: ChapterDef[] = [
  { n: 1, needs: [], steps: [] },
  {
    n: 2,
    needs: ['dex'],
    steps: [
      chat('c2.dex', 'dex', 2, ['dex0', 'you0', 'dex1', 'dex2']),
      say('c2.s0', 2, 'say0', SOON),
      say('c2.s1', 2, 'say1', SOON),
      say('c2.s2', 2, 'say2', 'nextDay'),
      say('c2.s3', 2, 'say3', SOON),
    ],
  },
  {
    n: 3,
    needs: ['omar'],
    steps: [
      { id: 'c3.session', kind: 'session', session: 2 },
      { id: 'c3.test', kind: 'test', wait: SOON },
      say('c3.s0', 3, 'say0', SOON),
      chat('c3.omar', 'omar', 3, ['omar0', 'you0', 'omar1', 'omar2', 'you1', 'omar3'], 'nextDay'),
      say('c3.s1', 3, 'say1', SOON),
      say('c3.s2', 3, 'say2', SOON),
    ],
  },
  {
    n: 4,
    needs: ['lia'],
    steps: [
      say('c4.s0', 4, 'say0'),
      chat('c4.lia', 'lia', 4, ['you0', 'lia0', 'lia1', 'you1', 'lia2', 'lia3', 'lia4'], { hours: 2 }),
      chat('c4.lia2', 'lia', 4, ['lia5', 'lia6'], 'nextDay'),
    ],
  },
  {
    n: 5,
    needs: ['nova', 'pip'],
    steps: [
      { id: 'c5.session', kind: 'session', session: 3 },
      say('c5.s0', 5, 'say0', SOON),
      say('c5.s1', 5, 'say1', SOON),
      say('c5.s2', 5, 'say2', SOON),
      chat('c5.nova', 'nova', 5, ['you0', 'nova0', 'nova1', 'nova2', 'nova3', 'you1', 'nova4'], { hours: 1 }),
      chat('c5.pip', 'pip', 5, ['pip0', 'pip1', 'pip2', 'pip3'], { hours: 3 }),
      say('c5.s3', 5, 'say3', SOON),
      say('c5.s4', 5, 'say4', SOON),
    ],
  },
  // ---------- Acto II · ¿Quién habla? ----------
  {
    n: 6,
    needs: ['kenji'],
    steps: [
      say('c6.s0', 6, 'say0'),
      chat('c6.kenji', 'kenji', 6, ['you0', 'kenji0'], SOON),
      say('c6.s1', 6, 'say1', { hours: 2 }),
      chat('c6.kenji2', 'kenji', 6, ['kenji1', 'kenji2', 'kenji3', 'kenji4', 'kenji5', 'you1', 'kenji6', 'kenji7'], 'nextDay'),
      say('c6.s2', 6, 'say2', SOON),
    ],
  },
  {
    n: 7,
    needs: ['roxy'],
    steps: [
      { id: 'c7.session', kind: 'session', session: 4 },
      say('c7.s0', 7, 'say0', SOON),
      say('c7.s1', 7, 'say1', SOON),
      chat('c7.roxy', 'roxy', 7, ['you0', 'roxy0'], { hours: 1 }),
      chat('c7.roxy2', 'roxy', 7, ['roxy1', 'roxy2', 'roxy3', 'roxy4', 'roxy5'], 'nextDay'),
      say('c7.s2', 7, 'say2', SOON),
    ],
  },
  {
    n: 8,
    needs: ['teo', 'mia'],
    steps: [
      { id: 'c8.session', kind: 'session', session: 5 },
      say('c8.s0', 8, 'say0', SOON),
      say('c8.s1', 8, 'say1', SOON),
      chat('c8.teo', 'teo', 8, ['teo0', 'teo1', 'you0', 'teo2', 'teo3', 'teo4', 'teo5', 'you1', 'teo6'], { hours: 3 }),
      say('c8.s2', 8, 'say2', SOON),
      chat('c8.mia', 'mia', 8, ['mia0', 'mia1', 'mia2'], { hours: 4 }),
      chat(FRAGMENTS_STEP, 'teo', 8, ['teo7'], 'nextDay'),
    ],
  },
  {
    n: 9,
    needs: ['teo', 'dex'],
    steps: [
      say('c9.s0', 9, 'say0'),
      chat('c9.teo', 'teo', 9, ['teo0', 'teo1', 'teo2', 'you0', 'teo3', 'teo4'], { hours: 1 }),
      say('c9.s1', 9, 'say1', SOON),
      chat('c9.dex', 'dex', 9, ['dex0', 'dex1', 'dex2'], 'nextDay'),
      say('c9.s2', 9, 'say2', SOON),
      say('c9.s3', 9, 'say3', SOON),
    ],
  },
  {
    n: 10,
    needs: ['teo'],
    steps: [
      { id: 'c10.session', kind: 'session', session: 6 },
      chat('c10.teo', 'teo', 10, ['teo0', 'teo1', 'teo2', 'teo3', 'teo4'], SOON),
      say('c10.s0', 10, 'say0', SOON),
      // Sombra aparece junto al farol con esta frase (SO-01)
      say('c10.sombra', 10, 'say1', SOON),
    ],
  },
];

export const chapterDef = (n: number) => CHAPTERS.find((c) => c.n === n);

/** Cuándo vence un paso, contando desde `from` (CA-02). */
export function dueAt(wait: Wait | undefined, from: Date): Date {
  if (!wait) return from;
  if (wait === 'nextDay') {
    const next = new Date(`${addDays(toLocalDate(from), 1)}T08:00:00`);
    return next;
  }
  return new Date(from.getTime() + wait.hours * 3_600_000);
}

/**
 * El siguiente paso que toca entregar, o ninguno (CA-02). Los de capítulos ya pasados se entregan sin esperas;
 * los del capítulo en curso, cuando vence su espera desde el anterior (o desde la apertura, para el primero).
 */
export function nextStep(state: OrigenState | undefined, now: Date, { noWaits = false } = {}): { chapter: number; step: StepDef } | undefined {
  const current = currentChapter(state);
  const delivered = state?.steps ?? {};
  for (const ch of CHAPTERS) {
    if (ch.n > current) break;
    let previous = state?.periods?.[ch.n - 1]?.openedAt;
    for (const step of ch.steps) {
      const at = delivered[step.id];
      if (at) {
        previous = at;
        continue;
      }
      if (ch.n < current || noWaits || !previous) return { chapter: ch.n, step };
      return dueAt(step.wait, new Date(previous)) <= now ? { chapter: ch.n, step } : undefined;
    }
  }
  return undefined;
}

export const deliverStep = (state: OrigenState | undefined, id: string, at: Date): OrigenState => ({
  ...state,
  steps: { ...state?.steps, [id]: at.toISOString() },
});

/** Vecinos que la historia ya necesita en la calle (RI-09). */
export function neededNeighbors(state: OrigenState | undefined): NeighborId[] {
  const current = currentChapter(state);
  return CHAPTERS.filter((c) => c.n <= current).flatMap((c) => c.needs);
}

// ---------- Chats reconstruidos (ME-06) ----------
export interface ChatLine extends ChatLineDef {
  at: string;
}

/** Líneas de la historia en el chat de un vecino, a partir de los pasos entregados; en el de Teo, los fragmentos (PR-10). */
export function neighborLines(state: OrigenState | undefined, chatId: NeighborId): ChatLine[] {
  const delivered = state?.steps ?? {};
  const story = CHAPTERS.flatMap((c) => c.steps)
    .filter((s): s is Extract<StepDef, { kind: 'chat' }> => s.kind === 'chat' && s.chat === chatId && !!delivered[s.id])
    .flatMap((s) => s.lines.map((line, i) => ({ ...line, at: new Date(Date.parse(delivered[s.id]!) + i * 1000).toISOString() })));
  if (chatId !== 'teo') return story;
  // El fragmento llega un segundo después de lo que lo abrió, para que vaya detrás en el chat
  const fragments = readableFragments(state).map((f) => ({
    who: 'them' as const,
    key: `origen.fragment.${f.n}`,
    at: new Date(Date.parse(f.at) + (story.length + 1) * 1000 + f.n).toISOString(),
  }));
  return [...story, ...fragments].sort((a, b) => a.at.localeCompare(b.at));
}

/** Vecinos que ya te escribieron, del último mensaje al primero (ME-02). */
export function neighborContacts(state: OrigenState | undefined): { chat: NeighborId; lastAt: string }[] {
  const last = new Map<NeighborId, string>();
  for (const line of CHAPTERS.flatMap((c) => c.steps)) {
    if (line.kind !== 'chat') continue;
    const at = state?.steps?.[line.id];
    if (at && at > (last.get(line.chat) ?? '')) last.set(line.chat, at);
  }
  const teo = neighborLines(state, 'teo').at(-1)?.at;
  if (teo && last.has('teo')) last.set('teo', teo);
  return [...last].map(([chat, lastAt]) => ({ chat, lastAt })).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

/** Último movimiento del chat de la señal: sesiones y pruebas (ME-08). */
export function signalLastAt(state: OrigenState | undefined): string {
  const times = [
    ...Object.values(state?.sessions ?? {}),
    ...(state?.tests ?? []).flatMap((t) => [t.offeredAt, t.resolvedAt ?? '']),
  ];
  return times.reduce((a, b) => (b > a ? b : a), '');
}

export function chatLastAt(state: OrigenState | undefined, chatId: ChatId): string {
  if (chatId === 'signal') return signalLastAt(state);
  return neighborLines(state, chatId).at(-1)?.at ?? '';
}

export const chatUnread = (state: OrigenState | undefined, chatId: ChatId) => {
  const last = chatLastAt(state, chatId);
  return !!last && last > (state?.read?.[chatId] ?? '');
};

export const anyUnread = (state: OrigenState | undefined) =>
  chatUnread(state, 'signal') || neighborContacts(state).some((c) => chatUnread(state, c.chat));

