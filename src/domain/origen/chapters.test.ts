import { describe, expect, it } from 'vitest';
import { keysOf } from '../../i18n';
import { anyUnread, CHAPTERS, chatUnread, deliverStep, neededNeighbors, neighborContacts, neighborLines, nextStep } from './chapters';
import { choose, finishContact, type OrigenState } from './origen';
import { openChapter } from './periods';

const T0 = new Date('2026-11-01T10:00:00.000Z');
const H = 3_600_000;
const s1 = (): OrigenState => choose(finishContact(undefined, T0, 0), 'investigate');
const ch2 = () => openChapter(s1(), new Date(T0.getTime() + 7 * 24 * H), 100);

function deliverAll(state: OrigenState, until: Date): OrigenState {
  let s = state;
  for (let i = 0; i < 50; i++) {
    const due = nextStep(s, until);
    if (!due) break;
    s = deliverStep(s, due.step.id, until);
  }
  return s;
}

describe('capítulos (CA)', () => {
  it('todos los textos de los pasos existen en es y en', () => {
    const keys = CHAPTERS.flatMap((c) => c.steps).flatMap((s) => (s.kind === 'say' ? [s.key] : s.kind === 'chat' ? s.lines.map((l) => l.key) : []));
    for (const locale of ['es', 'en'] as const) for (const k of keys) expect(keysOf(locale), `${locale} ${k}`).toContain(k);
  });

  it('los pasos respetan sus esperas: «otro día» no llega el mismo día (CA-02)', () => {
    const s = ch2();
    const opened = new Date(s.periods![1]!.openedAt);
    const sameDay = deliverAll(s, opened);
    expect(Object.keys(sameDay.steps!)).toEqual(['c2.dex']);
    const later = deliverAll(deliverAll(sameDay, new Date(opened.getTime() + 60_000)), new Date(opened.getTime() + 120_000));
    expect(Object.keys(later.steps!)).toEqual(['c2.dex', 'c2.s0', 'c2.s1']);
    const nextDay = deliverAll(deliverAll(later, new Date(opened.getTime() + 30 * H)), new Date(opened.getTime() + 31 * H));
    expect(Object.keys(nextDay.steps!)).toHaveLength(5);
  });

  it('al abrirse el capítulo siguiente, los pasos pendientes del anterior se entregan sin esperar (CA-02)', () => {
    const s = openChapter(deliverAll(ch2(), new Date(ch2().periods![1]!.openedAt)), new Date(T0.getTime() + 14 * 24 * H), 300);
    const due = nextStep(s, new Date(s.periods![2]!.openedAt));
    expect(due?.chapter).toBe(2);
  });

  it('los chats se reconstruyen de los pasos entregados, con las respuestas por ti (ME-04, ME-06)', () => {
    const s = deliverAll(ch2(), new Date(ch2().periods![1]!.openedAt));
    const lines = neighborLines(s, 'dex');
    expect(lines.map((l) => l.who)).toEqual(['them', 'you', 'them', 'them']);
    expect(neighborContacts(s).map((c) => c.chat)).toEqual(['dex']);
    expect(chatUnread(s, 'dex')).toBe(true);
    expect(anyUnread({ ...s, read: { dex: lines.at(-1)!.at, signal: s.sessions!['1']! } })).toBe(false);
  });

  it('cada capítulo trae a sus vecinos a la calle aunque el nivel no lo haya hecho (RI-09)', () => {
    expect(neededNeighbors(s1())).toEqual([]);
    expect(neededNeighbors(ch2())).toEqual(['dex']);
  });
});

describe('acto II (capítulos 6 a 10)', () => {
  /** Abre capítulos hasta `n`, una semana cada uno, y entrega sus pasos con la app abierta cada 10 minutos durante 5 días. */
  function upTo(n: number): OrigenState {
    let s = s1();
    for (let c = 2; c <= n; c++) {
      const opened = T0.getTime() + (c - 1) * 7 * 24 * H;
      s = openChapter(s, new Date(opened), c * 100);
      for (let t = opened; t <= opened + 5 * 24 * H; t += H / 6) s = deliverAll(s, new Date(t));
    }
    return s;
  }

  it('las sesiones 4, 5 y 6 abren los capítulos 7, 8 y 10 (TR-01)', () => {
    const sessions = CHAPTERS.flatMap((c) => c.steps.filter((s) => s.kind === 'session').map((s) => [c.n, s.kind === 'session' ? s.session : 0]));
    expect(sessions).toEqual([[3, 2], [5, 3], [7, 4], [8, 5], [10, 6]]);
    for (const n of [7, 8, 10]) expect(CHAPTERS.find((c) => c.n === n)!.steps[0]!.kind).toBe('session');
  });

  it('cada capítulo cabe en 5 días (CA-02) y deja escritos a sus vecinos', () => {
    const s = upTo(10);
    const ids = CHAPTERS.filter((c) => c.n >= 6).flatMap((c) => c.steps.map((x) => x.id));
    for (const id of ids) expect(s.steps?.[id], id).toBeTruthy();
    expect(neighborContacts(s).map((c) => c.chat).sort()).toEqual(['dex', 'kenji', 'lia', 'mia', 'nova', 'omar', 'pip', 'roxy', 'teo']);
    expect(neededNeighbors(s)).toEqual(expect.arrayContaining(['kenji', 'roxy', 'teo', 'mia']));
  });

  it('Teo recibe los fragmentos del archivo desde el capítulo 8, detrás de su mensaje (PR-10)', () => {
    const passed = (n: number, at: string) => ({ n, type: 'fullDays' as const, times: 3, period: 1, offeredAt: at, offeredOn: '2026-11-10' as never, result: 'passed' as const, resolvedAt: at });
    const s = { ...upTo(8), tests: [passed(1, '2026-11-10T10:00:00.000Z'), passed(2, '2026-11-20T10:00:00.000Z')] };
    const lines = neighborLines(s, 'teo');
    expect(lines.slice(-2).map((l) => l.key)).toEqual(['origen.fragment.1', 'origen.fragment.2']);
    expect(lines.findIndex((l) => l.key === 'origen.ch.8.teo7')).toBeLessThan(lines.findIndex((l) => l.key === 'origen.fragment.1'));
    expect(neighborLines({ ...upTo(7), tests: s.tests }, 'teo')).toEqual([]);
  });
});
