import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActivity, loadCategories, loadSettings, logCompletion, saveSetting, type DataContext } from '../../data/repository';
import { addDays, toLocalDate } from '../../domain/time/localDate';
import { DisciplineDetailScreen } from '../screens/profile/AttributeDetailScreen';
import { renderRoutes, setupData } from '../test-utils';
import { DisciplineTipWatcher } from './disciplineTip';

let ctx: DataContext;
const today = () => toLocalDate(new Date());

beforeEach(async () => {
  ctx = await setupData();
  const categoryId = (await loadCategories(ctx.db))[0]!.id;
  const id = await createActivity(ctx, { name: 'Caminar', config: { period: 'day', target: 1, difficulty: 'medium', categoryId } });
  await logCompletion(ctx, id, today());
});

afterEach(async () => {
  await ctx.db.delete();
  vi.unstubAllGlobals();
});

const tip = (date: string) => ({ date, locale: 'es' as const, companion: 'arvid' as const, text: 'Vas muy bien con Caminar. Hoy, una vuelta corta.' });

describe('consejo diario de Disciplina con IA (D-097)', () => {
  it('se muestra el de hoy con la IA activada; el de ayer o sin IA, no', async () => {
    await saveSetting(ctx.db, 'arvidAi', true);
    await saveSetting(ctx.db, 'disciplineTip', tip(today()));
    const { unmount } = renderRoutes(ctx, [{ path: '/', element: <DisciplineDetailScreen /> }], '/');
    expect(await screen.findByRole('heading', { name: 'Consejo de ARVID' })).toBeInTheDocument();
    expect(screen.getByText(/Vas muy bien con Caminar/)).toBeInTheDocument();
    unmount();

    await saveSetting(ctx.db, 'disciplineTip', tip(addDays(today(), -1)));
    renderRoutes(ctx, [{ path: '/', element: <DisciplineDetailScreen /> }], '/');
    await screen.findByRole('heading', { name: 'Disciplina' });
    expect(screen.queryByRole('heading', { name: 'Consejo de ARVID' })).toBeNull();
  });

  it('se pide una vez al día con la IA activada y se guarda; sin IA no se pide', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ reply: 'Consejo de prueba.' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { unmount } = renderRoutes(ctx, [{ path: '/', element: <DisciplineTipWatcher /> }], '/');
    await new Promise((r) => setTimeout(r, 100));
    expect(fetchMock).not.toHaveBeenCalled();
    unmount();

    await saveSetting(ctx.db, 'arvidAi', true);
    renderRoutes(ctx, [{ path: '/', element: <DisciplineTipWatcher /> }], '/');
    await waitFor(async () => expect((await loadSettings(ctx.db)).disciplineTip?.text).toBe('Consejo de prueba.'));
    expect((await loadSettings(ctx.db)).disciplineTip?.date).toBe(today());
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string).moment).toBe('discipline');
    await new Promise((r) => setTimeout(r, 100));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
