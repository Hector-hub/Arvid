import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildBackup, replaceAllData } from '../../data/backup';
import {
  createActivity,
  loadCategories,
  loadSettings,
  logCompletion,
  saveSetting,
  undoCompletion,
  unlockAchievements,
  type DataContext,
} from '../../data/repository';
import { addDays, toLocalDate } from '../../domain/time/localDate';
import { speak } from '../arvid/voice';
import { LevelUpWatcher } from '../layout/LevelUp';
import { celebrate } from '../scene/engine';
import { ProfileScreen } from '../screens/ProfileScreen';
import { renderRoutes, setupData } from '../test-utils';
import { AchievementsWatcher } from './AchievementsWatcher';

vi.mock('../arvid/voice', () => ({ speak: vi.fn(async () => undefined), noLigatures: (s: string) => s }));
vi.mock('../scene/engine', async (original) => ({
  ...(await original<typeof import('../scene/engine')>()),
  celebrate: vi.fn(),
}));

let ctx: DataContext;
const today = () => toLocalDate(new Date());

beforeEach(async () => {
  ctx = await setupData();
  vi.mocked(speak).mockClear();
  vi.mocked(celebrate).mockClear();
});

afterEach(async () => {
  await ctx.db.delete();
});

/** Actividad diaria creada hace 10 días y registrada los días indicados (0 = hoy). */
async function daily(name: string, daysAgo: number[]) {
  const categoryId = (await loadCategories(ctx.db))[0]!.id;
  const created = addDays(today(), -10);
  const id = await createActivity(
    { ...ctx, now: () => new Date(`${created}T09:00:00`) },
    { name, config: { period: 'day', target: 1, difficulty: 'medium', categoryId } },
  );
  for (const ago of daysAgo) {
    const date = addDays(today(), -ago);
    await logCompletion({ ...ctx, now: () => new Date(`${date}T20:00:00`) }, id, date);
  }
  return id;
}

function render() {
  return renderRoutes(
    ctx,
    [
      {
        path: '/',
        element: (
          <>
            <LevelUpWatcher />
            <AchievementsWatcher />
            <p>Hoy</p>
          </>
        ),
      },
      { path: '/perfil', element: <ProfileScreen /> },
    ],
    '/',
  );
}

const unlocked = async () => (await ctx.db.achievements.toArray()).map((r) => r.id).sort();

describe('desbloqueo en silencio (LO-05)', () => {
  it('la primera vez se guardan los que ya se cumplen, sin aviso ni partículas, y ARVID lo dice una vez', async () => {
    await daily('Caminar', [0]);
    render();
    await waitFor(async () => expect((await loadSettings(ctx.db)).achievementsReady).toBe(true));
    expect(await unlocked()).toEqual(['L-01']);
    expect(screen.queryByRole('status')).toBeNull();
    expect(celebrate).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(speak).toHaveBeenCalledWith('Revisé tu historial: ya tenías 1 logro. Lo tienes en tu perfil.'),
    );
  });

  it('un backup no lleva el ajuste y al importarlo se vuelve a evaluar en silencio', async () => {
    await saveSetting(ctx.db, 'achievementsReady', true);
    const backup = await buildBackup(ctx.db, 'test', new Date());
    expect(backup.data.settings.some((s) => s.key === 'achievementsReady')).toBe(false);
    await replaceAllData(ctx, backup);
    expect((await loadSettings(ctx.db)).achievementsReady).toBeUndefined();
  });
});

describe('celebración (CE)', () => {
  beforeEach(async () => {
    await saveSetting(ctx.db, 'achievementsReady', true);
  });

  it('CE-01: un logro nuevo → partículas, ARVID y aviso; tocarlo abre su hoja en Perfil', async () => {
    const user = userEvent.setup();
    const id = await daily('Caminar', []);
    render();
    await screen.findByText('Hoy');
    await logCompletion(ctx, id, today());
    const toast = await screen.findByRole('button', { name: /Logro: Primer paso/ });
    expect(celebrate).toHaveBeenCalledWith('big');
    await waitFor(() => expect(vi.mocked(speak).mock.calls.at(-1)?.[0]).toMatch(/Primer paso/));
    expect(await unlocked()).toEqual(['L-01']);
    await user.click(toast);
    expect(await screen.findByRole('dialog', { name: 'Primer paso' })).toHaveTextContent(/Ganado el/);
  });

  it('CE-02: con "ARVID habla por iniciativa propia" desactivado, solo partículas y aviso', async () => {
    await saveSetting(ctx.db, 'arvidTalks', false);
    const id = await daily('Caminar', []);
    render();
    await screen.findByText('Hoy');
    await logCompletion(ctx, id, today());
    await screen.findByRole('button', { name: /Logro: Primer paso/ });
    expect(celebrate).toHaveBeenCalledWith('big');
    expect(speak).not.toHaveBeenCalled();
  });

  it('CE-03: dos logros a la vez → un solo aviso que los nombra', async () => {
    const id = await daily('Caminar', []);
    render();
    await screen.findByText('Hoy');
    // Siete días de golpe (como al restaurar datos): L-01 y L-02 llegan en el mismo cambio
    await ctx.db.completions.bulkAdd(
      [6, 5, 4, 3, 2, 1, 0].map((ago) => {
        const date = addDays(today(), -ago);
        return { id: `c-${ago}`, activityId: id, date, at: `${date}T18:00:00.000Z`, tzOffsetMin: 0 };
      }),
    );
    expect(await screen.findByRole('button', { name: /2 logros: Primer paso y Semana sólida/ })).toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('CE-04: con subida de nivel, primero el aviso de nivel y al cerrarlo el de logro', async () => {
    const user = userEvent.setup();
    await saveSetting(ctx.db, 'lastCelebratedLevel', 0);
    const id = await daily('Caminar', []);
    render();
    await screen.findByRole('dialog');
    await logCompletion(ctx, id, today());
    await waitFor(async () => expect(await unlocked()).toEqual(['L-01']));
    expect(screen.queryByRole('button', { name: /Logro: Primer paso/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByRole('button', { name: /Logro: Primer paso/ })).toBeInTheDocument();
  });

  it('LO-03: deshacer el registro que lo dio no quita el logro', async () => {
    const id = await daily('Caminar', []);
    render();
    await screen.findByText('Hoy');
    await logCompletion(ctx, id, today());
    await screen.findByRole('button', { name: /Logro: Primer paso/ });
    await undoCompletion(ctx, id, today());
    await new Promise((r) => setTimeout(r, 50));
    expect(await unlocked()).toEqual(['L-01']);
  });
});

describe('logros en Perfil (LP)', () => {
  it('contador, nombres accesibles con estado y progreso, y hoja con la condición', async () => {
    const user = userEvent.setup();
    await daily('Caminar', [2, 1, 0]);
    await saveSetting(ctx.db, 'achievementsReady', true);
    await unlockAchievements(ctx.db, ['L-01'], new Date().toISOString());
    renderRoutes(ctx, [{ path: '/perfil', element: <ProfileScreen /> }], '/perfil');
    expect(await screen.findByText('1 / 11')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Primer paso, ganado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Semana sólida, pendiente, 3 de 7' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rescate, pendiente' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Centenar, pendiente, 3 de 100' }));
    const sheet = screen.getByRole('dialog', { name: 'Centenar' });
    expect(sheet).toHaveTextContent('Llega a 100 registros en total.');
    expect(sheet).toHaveTextContent('3 / 100');
  });
});

describe('insignias (IN-02, NFR7-02)', () => {
  it('el atlas tiene una celda de 64 px por logro y pesa ≤ 30 KB', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const png = readFileSync(join(__dirname, '../../../public/achievements/badges.png'));
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([11 * 64, 64]);
    expect(png.length).toBeLessThanOrEqual(30 * 1024);
  });
});
