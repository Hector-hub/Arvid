// Retos en la app (spec 15, 15b): crear, abrir el enlace y unirse, marcar y abandonar. La API se simula con `fetch`.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadRecords, logCompletion, saveSetting, undoCompletion, type DataContext } from '../../data/repository';
import { newDataKey } from '../../domain/account/crypto';
import type { ChallengeView } from '../../domain/challenges/challenges';
import { toLocalDate, type LocalDate } from '../../domain/time/localDate';
import { renderRoutes, setupData } from '../test-utils';
import { TodayScreen } from '../screens/TodayScreen';
import { ChallengeFormScreen, ChallengeScreen } from './ChallengeScreens';
import { syncMarks } from './challenges';

const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const ME = 'luis-000-cuenta';
const ANA = 'ana-0000-cuenta';
const CID = 'reto-0000-0001';

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

const view = (extra: Partial<ChallengeView['challenge']> = {}, participants = [{ id: ANA, alias: 'Ana', level: 4, joinedAt: '1', done: [] as string[] }]): ChallengeView => ({
  challenge: { id: CID, owner: ANA, name: 'Leer', difficulty: 'easy', days: 7, start: today, mode: 'coop', createdAt: '', ...extra },
  participants,
  ownerFriend: false,
});

const routes = [
  { path: '/retos/nuevo', element: <ChallengeFormScreen /> },
  { path: '/retos/:id', element: <ChallengeScreen /> },
  { path: '/hoy', element: <TodayScreen /> },
];

describe('retos (spec 15, 15b)', () => {
  it('RT-02/RT-03/IN-11: crear un reto crea su actividad diaria, invita a los amigos marcados y abre el detalle', async () => {
    const user = userEvent.setup();
    let sent: Record<string, unknown> = {};
    const invited: string[] = [];
    const created = view({ owner: ME, name: 'Correr', mode: 'versus', days: 14 }, [{ id: ME, alias: 'Luis', level: 1, joinedAt: '1', done: [] }]);
    vi.stubGlobal('fetch', vi.fn((url: string, init: RequestInit) => {
      if (url.endsWith('challenges/create')) {
        sent = JSON.parse(init.body as string);
        return reply(200, created);
      }
      if (url.endsWith('friends')) return reply(200, { friends: [{ id: ANA, alias: 'Ana', level: 4, together: 0 }, { id: 'eva-0000-cuenta', alias: 'Eva', level: 2, together: 0 }], requests: [], blocked: [] });
      if (url.endsWith('challenges/invite')) {
        invited.push(JSON.parse(init.body as string).friendId);
        return reply(200, { ok: true });
      }
      return reply(200, created);
    }));
    renderRoutes(ctx, routes, '/retos/nuevo');
    await user.type(await screen.findByLabelText('Actividad'), 'Correr');
    await user.click(screen.getByRole('radio', { name: '14 días' }));
    await user.click(screen.getByRole('radio', { name: /Competitivo/ }));
    await user.click(await screen.findByRole('checkbox', { name: /Ana/ }));
    await user.click(screen.getByRole('button', { name: 'Crear reto e invitar (1)' }));
    expect(await screen.findByRole('heading', { name: 'Correr' })).toBeInTheDocument();
    expect(sent).toMatchObject({ name: 'Correr', days: 14, mode: 'versus', start: today, today });
    expect(invited).toEqual([ANA]);
    const records = await loadRecords(ctx.db);
    const activity = records.find((r) => r.activity.name === 'Correr')!;
    expect(activity.activity.challengeId).toBe(CID);
    expect(activity.versions[0]).toMatchObject({ period: 'day', target: 1, difficulty: 'easy' });
    // IN-12: desde el detalle, más amigos hasta el día de inicio; sin enlace de reto (D-177)
    expect(screen.getByRole('button', { name: 'Invitar amigos' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enlace/i })).toBeNull();
  });

  it('IN-14: la invitación sale en Hoy; aceptar pide el área, crea la actividad y abre el reto', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.endsWith('challenges/join')) return reply(200, view({}, [...view().participants, { id: ME, alias: 'Luis', level: 1, joinedAt: '2', done: [] }]));
      if (url.endsWith('invites')) return reply(200, { invites: [] });
      return reply(200, view());
    }));
    await saveSetting(ctx.db, 'challengeInvites', [{ challenge: view().challenge, from: { id: ANA, alias: 'Ana', level: 4 }, at: '', people: 1 }]);
    renderRoutes(ctx, routes, '/hoy');
    expect(await screen.findByRole('heading', { name: 'Ana te invita a «Leer»' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Aceptar' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Unirme' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Unirme' }));
    expect(await screen.findByRole('heading', { name: 'Leer' })).toBeInTheDocument();
    expect((await loadRecords(ctx.db)).some((r) => r.activity.challengeId === CID)).toBe(true);
    expect((await ctx.db.settings.get('challengeInvites'))?.value).toEqual([]);
  });

  it('IN-14: rechazar la invitación la quita sin avisar', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      calls.push(url);
      return reply(200, { ok: true });
    }));
    await saveSetting(ctx.db, 'challengeInvites', [{ challenge: view().challenge, from: { id: ANA, alias: 'Ana', level: 4 }, at: '', people: 1 }]);
    renderRoutes(ctx, routes, '/hoy');
    await user.click(await screen.findByRole('button', { name: 'Rechazar' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Ana te invita a «Leer»' })).toBeNull());
    expect(calls).toContain('/api/social/invites/decline');
  });

  it('SY-02: registrar la actividad del reto envía la fecha; deshacerlo la retira', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn((url: string, init: RequestInit) => {
      calls.push(`${url.split('/').pop()} ${init.body ?? ''}`);
      if (url.endsWith('mark')) return reply(200, { done: [today] });
      if (url.endsWith('unmark')) return reply(200, { done: [] });
      return reply(200, view({}, [...view().participants, { id: ME, alias: 'Luis', level: 1, joinedAt: '2', done: [] }]));
    }));
    const { joinChallenge } = await import('./challenges');
    const categoryId = (await ctx.db.categories.toArray())[0]!.id;
    const account = (await ctx.db.settings.get('account'))!.value as never;
    await joinChallenge(ctx, account, CID, categoryId);
    const activityId = (await ctx.db.challenges.get(CID))!.activityId!;
    await logCompletion(ctx, activityId, today);
    await syncMarks(ctx, account);
    expect(calls.at(-1)).toBe(`mark ${JSON.stringify({ id: CID, date: today })}`);
    // Sin cambios no se llama al servidor
    const n = calls.length;
    await syncMarks(ctx, account);
    expect(calls).toHaveLength(n);
    await undoCompletion(ctx, activityId, today);
    await syncMarks(ctx, account);
    expect(calls.at(-1)).toBe(`unmark ${JSON.stringify({ id: CID, date: today })}`);
  });

  it('RT-09/MK-04: en Hoy lleva «Reto · día 1 de 7»; abandonar archiva la actividad', async () => {
    const user = userEvent.setup();
    const joined = view({}, [...view().participants, { id: ME, alias: 'Luis', level: 1, joinedAt: '2', done: [] }]);
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.endsWith('leave')) return reply(200, { ...joined, participants: joined.participants.map((p) => (p.id === ME ? { ...p, left: today } : p)) });
      return reply(200, joined);
    }));
    const { joinChallenge } = await import('./challenges');
    const categoryId = (await ctx.db.categories.toArray())[0]!.id;
    await joinChallenge(ctx, (await ctx.db.settings.get('account'))!.value as never, CID, categoryId);
    await saveSetting(ctx.db, 'onboardingCompletedAt', new Date().toISOString());
    const { unmount } = renderRoutes(ctx, routes, '/hoy');
    expect(await screen.findByText('Reto · día 1 de 7')).toBeInTheDocument();
    unmount();
    renderRoutes(ctx, routes, `/retos/${CID}`);
    expect(await screen.findByText('Llevamos 0 de 12 días necesarios')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Abandonar' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Abandonar' }));
    await waitFor(async () => {
      const record = (await loadRecords(ctx.db)).find((r) => r.activity.challengeId === CID)!;
      expect(record.events.some((e) => e.type === 'archived')).toBe(true);
    });
    // D-186: sale de tu lista (la actividad queda archivada con su historial)
    await waitFor(async () => expect(await ctx.db.challenges.get(CID)).toBeUndefined());
  });

  it('D-186: un reto que ya no está en tu lista (abandonado en otro dispositivo o borrado) sale también de este', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.endsWith('challenges/mine')) return reply(200, { challenges: [] });
      return reply(200, view({}, [...view().participants, { id: ME, alias: 'Luis', level: 1, joinedAt: '2', done: [] }]));
    }));
    const { joinChallenge, refreshChallenges } = await import('./challenges');
    const categoryId = (await ctx.db.categories.toArray())[0]!.id;
    const account = (await ctx.db.settings.get('account'))!.value as never;
    await joinChallenge(ctx, account, CID, categoryId);
    await refreshChallenges(ctx, account);
    expect(await ctx.db.challenges.get(CID)).toBeUndefined();
    const record = (await loadRecords(ctx.db)).find((r) => r.activity.challengeId === CID)!;
    expect(record.events.some((e) => e.type === 'archived')).toBe(true);
  });
});
