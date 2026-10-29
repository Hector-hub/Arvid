// Fase 15c (spec 15): textos de los avisos, el reto en el resumen de la tarde, el resultado, Retos cumplidos en el
// Perfil, invitar desde un amigo y el aviso al planificar un descanso.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActivity, loadCategories, logCompletion, saveSetting, type DataContext } from '../../data/repository';
import { newDataKey } from '../../domain/account/crypto';
import type { ChallengeView, Participant } from '../../domain/challenges/challenges';
import { addDays, toLocalDate, type LocalDate } from '../../domain/time/localDate';
import { noticeFor } from '../notifications/handlePush';
import { FriendsScreen } from '../friends/FriendsScreen';
import { RestsScreen } from '../rests/RestsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { renderRoutes, setupData } from '../test-utils';
import { ChallengeScreen } from './ChallengeScreens';

const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const ME = 'luis-000-cuenta';

let ctx: DataContext;
let today: LocalDate;
beforeEach(async () => {
  ctx = await setupData();
  today = toLocalDate(ctx.now());
  vi.stubEnv('VITE_ACCOUNTS', '1');
  await saveSetting(ctx.db, 'account', { id: ME, alias: 'Luis', session: 's', dataKey: await newDataKey() });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const p = (id: string, alias: string, done: string[], left?: string): Participant => ({ id, alias, level: 1, joinedAt: id, done, left });
const days = (from: LocalDate, n: number) => Array.from({ length: n }, (_, i) => addDays(from, i) as string);

async function storeChallenge(id: string, view: ChallengeView, activityId?: string) {
  await ctx.db.challenges.put({ id, view, activityId, fetchedAt: new Date().toISOString() });
}

describe('avisos en el dispositivo (AV)', () => {
  it('AV-01/AV-03/AV-04: el service worker escribe el texto de cada aviso social', async () => {
    const n = (data: object) => noticeFor(ctx.db, { kind: 'social', url: '/x', ...data } as never, new Date());
    expect((await n({ type: 'friend-request', alias: 'Ana' })).body).toBe('Ana quiere ser tu amigo.');
    expect((await n({ type: 'challenge-progress', name: 'Leer', done: 4, total: 5 })).body).toBe('4 de 5 ya cumplieron hoy en «Leer».');
    expect((await n({ type: 'challenge-overtaken', name: 'Leer', alias: 'Eva' })).body).toBe('Eva te adelantó en «Leer».');
    expect((await n({ type: 'challenge-end', name: 'Leer', success: false, percent: 64 })).body).toBe('«Leer» terminó: esta vez no, llegasteis al 64 %.');
    expect((await n({ type: 'challenge-end', name: 'Leer', winners: ['Ana', 'Luis'], place: 1 })).body).toBe('«Leer» terminó: empate entre Ana, Luis. Quedaste en el puesto 1.');
  });

  it('AV-02: el reto sin marcar hoy entra en el resumen de la tarde; con el interruptor apagado, no', async () => {
    const categoryId = (await loadCategories(ctx.db))[0]!.id;
    const activityId = await createActivity(ctx, { name: 'Leer', challengeId: 'r1', config: { period: 'day', target: 1, difficulty: 'easy', categoryId } });
    await storeChallenge('r1', { challenge: { id: 'r1', owner: ME, name: 'Leer', difficulty: 'easy', days: 7, start: today, mode: 'coop', createdAt: '' }, participants: [p(ME, 'Luis', [])] }, activityId);
    expect((await noticeFor(ctx.db, { kind: 'night' }, new Date())).body).toMatch(/Y el reto: Leer\.$/);
    await saveSetting(ctx.db, 'notifications', { enabled: true, morning: null, night: '22:00', badge: true, deviceId: 'd', social: { invites: true, reminder: false, progress: true, final: true } });
    expect((await noticeFor(ctx.db, { kind: 'night' }, new Date())).body).not.toMatch(/reto/);
    await logCompletion(ctx, activityId, today);
    await saveSetting(ctx.db, 'notifications', undefined);
    expect((await noticeFor(ctx.db, { kind: 'night' }, new Date())).body).not.toMatch(/reto/);
  });
});

describe('el final (FN)', () => {
  const start = (n: number) => addDays(today, -n);

  it('FN-02/FN-04: el detalle muestra «¡Lo lograsteis!» y el Perfil lo cuenta en Retos cumplidos', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(503, {})));
    const s = start(12);
    await storeChallenge('r1', { challenge: { id: 'r1', owner: ME, name: 'Leer', difficulty: 'easy', days: 7, start: s, mode: 'coop', createdAt: '' }, participants: [p(ME, 'Luis', days(s, 7)), p('ana', 'Ana', days(s, 6))] });
    const s2 = start(20);
    await storeChallenge('r2', { challenge: { id: 'r2', owner: ME, name: 'Correr', difficulty: 'easy', days: 10, start: s2, mode: 'versus', createdAt: '' }, participants: [p(ME, 'Luis', days(s2, 5)), p('ana', 'Ana', days(s2, 9))] });
    const { unmount } = renderRoutes(ctx, [{ path: '/retos/:id', element: <ChallengeScreen /> }], '/retos/r1');
    expect(await screen.findByRole('heading', { name: '¡Lo lograsteis!' })).toBeInTheDocument();
    unmount();
    renderRoutes(ctx, [{ path: '/perfil', element: <ProfileScreen /> }], '/perfil');
    expect(await screen.findByRole('heading', { name: 'Retos cumplidos · 1' })).toBeInTheDocument();
    expect(screen.getByText(/Ganó Ana Quedaste en el puesto 2\./)).toBeInTheDocument();
    expect(screen.getByText(/tus días: 7 de 7/)).toBeInTheDocument();
  });

  it('FN-01: terminado, dentro del margen, el resultado aún no está', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(503, {})));
    const s = start(7);
    await storeChallenge('r1', { challenge: { id: 'r1', owner: ME, name: 'Leer', difficulty: 'easy', days: 7, start: s, mode: 'coop', createdAt: '' }, participants: [p(ME, 'Luis', [])] });
    renderRoutes(ctx, [{ path: '/retos/:id', element: <ChallengeScreen /> }], '/retos/r1');
    expect(await screen.findByRole('heading', { name: /Terminado · resultado el/ })).toBeInTheDocument();
  });
});

describe('pendientes de la 15b', () => {
  it('IN-01: desde un amigo se le invita a un reto propio que aún admite gente', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn((url: string, init: RequestInit) => {
      calls.push(`${init.method} ${url} ${init.body ?? ''}`);
      if (url.endsWith('friends')) return reply(200, { friends: [{ id: 'eva-0000-cuenta', alias: 'Eva', level: 7, together: 1 }], requests: [], blocked: [] });
      return reply(200, { ok: true });
    }));
    await storeChallenge('r1', { challenge: { id: 'r1', owner: ME, name: 'Leer', difficulty: 'easy', days: 7, start: addDays(today, 2), mode: 'coop', createdAt: '' }, participants: [p(ME, 'Luis', [])] });
    renderRoutes(ctx, [{ path: '/perfil/amigos', element: <FriendsScreen /> }], '/perfil/amigos');
    expect(await screen.findByText(/1 reto juntos/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Eva/ }));
    await user.click(screen.getByRole('button', { name: 'Leer' }));
    expect(await screen.findByRole('button', { name: 'Invitación enviada: Leer' })).toBeDisabled();
    expect(calls.at(-1)).toContain('POST /api/social/challenges/invite');
    expect(calls.at(-1)).toContain('"friendId":"eva-0000-cuenta"');
  });

  it('RT-12: planificar un descanso que coincide con un reto avisa', async () => {
    const categoryId = (await loadCategories(ctx.db))[0]!.id;
    const activityId = await createActivity(ctx, { name: 'Leer', challengeId: 'r1', config: { period: 'day', target: 1, difficulty: 'easy', categoryId } });
    await storeChallenge('r1', { challenge: { id: 'r1', owner: ME, name: 'Leer', difficulty: 'easy', days: 7, start: today, mode: 'coop', createdAt: '' }, participants: [p(ME, 'Luis', [])] }, activityId);
    renderRoutes(ctx, [{ path: '/descansos', element: <RestsScreen /> }], '/descansos');
    await waitFor(() => expect(screen.getByRole('note')).toHaveTextContent('Coincide con el reto Leer'));
  });
});
