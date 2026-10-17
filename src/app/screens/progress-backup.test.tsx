import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildBackup } from '../../data/backup';
import { createActivity, loadCategories, logCompletion, saveSetting, type DataContext } from '../../data/repository';
import { addDays, toLocalDate } from '../../domain/time/localDate';
import { renderRoutes, setupData } from '../test-utils';
import { CharacterScreen } from './CharacterScreen';
import { SettingsScreen } from './SettingsScreen';
import { TodayScreen } from './TodayScreen';

vi.mock('../../pwa/platform', () => ({
  needsInstallForSafety: () => false,
  isIOS: () => false,
  currentPersistState: () => Promise.resolve('granted'),
  requestPersistentStorage: () => Promise.resolve('granted'),
}));

let ctx: DataContext;
const today = () => toLocalDate(new Date());

beforeEach(async () => {
  ctx = await setupData();
});

afterEach(async () => {
  await ctx.db.delete();
  vi.restoreAllMocks();
});

async function addDaily(name: string, logsDaysAgo: number[] = []) {
  const categoryId = (await loadCategories(ctx.db))[0]!.id;
  // Creada hace 10 días para poder tener historial.
  const created = addDays(today(), -10);
  const id = await createActivity(
    { ...ctx, now: () => new Date(`${created}T09:00:00`) },
    {
      name,
      config: { period: 'day', target: 1, difficulty: 'medium', categoryId },
    },
  );
  for (const ago of logsDaysAgo) {
    const date = addDays(today(), -ago);
    await logCompletion({ ...ctx, now: () => new Date(`${date}T20:00:00`) }, id, date);
  }
  return id;
}

describe('Personaje (PRG-03)', () => {
  it('estado vacío con nivel 1', async () => {
    renderRoutes(ctx, [{ path: '/personaje', element: <CharacterScreen /> }], '/personaje');
    expect(await screen.findByRole('heading', { name: 'Nivel 1 · Recluta' })).toBeInTheDocument();
    expect(screen.getByText('0 / 100 XP')).toBeInTheDocument();
    expect(screen.getByText('Registra tu primera actividad para ganar XP.')).toBeInTheDocument();
  });

  it('con progreso: nivel, barra y XP total', async () => {
    await addDaily('Caminar', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    renderRoutes(ctx, [{ path: '/personaje', element: <CharacterScreen /> }], '/personaje');
    expect(await screen.findByRole('heading', { name: 'Nivel 2 · Recluta' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Experiencia del nivel' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText(/Has ganado 100 XP en total/)).toBeInTheDocument();
  });
});

describe('Hoy (PRG-04, STR-02)', () => {
  it('indicador de nivel enlazado a Personaje y racha en la fila', async () => {
    await addDaily('Caminar', [1, 2, 3]);
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    expect(await screen.findByRole('link', { name: /Nivel 1, Recluta/ })).toHaveAttribute('href', '/personaje');
    expect(await screen.findByText('0 de 1 · racha 3 días')).toBeInTheDocument();
  });

  it('PRG-05: deshacer muestra la XP perdida', async () => {
    await addDaily('Caminar', [0]);
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    await userEvent.click(await screen.findByRole('button', { name: 'Deshacer Caminar' }));
    expect(await screen.findByText('Registro deshecho · −10 XP')).toBeInTheDocument();
  });

  it('BAK-07: aviso de backup y "Más tarde" lo oculta', async () => {
    await addDaily('Caminar', [1]);
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    const reminder = await screen.findByRole('region', { name: 'Copia de seguridad' });
    await userEvent.click(within(reminder).getByRole('button', { name: 'Más tarde' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Copia de seguridad' })).toBeNull());
    expect((await ctx.db.settings.get('backupReminderSnoozedUntil'))?.value).toBe(addDays(today(), 1));
  });
});

describe('Ajustes → copia de seguridad (BAK-02, BAK-03, BAK-05)', () => {
  function stubShare(impl: () => Promise<void>) {
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', { value: vi.fn(impl), configurable: true });
  }
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'canShare');
    Reflect.deleteProperty(navigator, 'share');
  });

  it('con compartir disponible usa la hoja del sistema y guarda la fecha', async () => {
    stubShare(() => Promise.resolve());
    renderRoutes(ctx, [{ path: '/ajustes', element: <SettingsScreen /> }], '/ajustes');
    await userEvent.click(await screen.findByRole('button', { name: 'Exportar copia' }));
    expect(await screen.findByText('Copia exportada.')).toBeInTheDocument();
    expect(navigator.share).toHaveBeenCalledOnce();
    expect((await ctx.db.settings.get('lastBackupAt'))?.value).toBeTypeOf('string');
  });

  it('cancelar la hoja de compartir no guarda la fecha', async () => {
    stubShare(() => Promise.reject(new DOMException('cancel', 'AbortError')));
    renderRoutes(ctx, [{ path: '/ajustes', element: <SettingsScreen /> }], '/ajustes');
    await userEvent.click(await screen.findByRole('button', { name: 'Exportar copia' }));
    expect(await screen.findByText('Exportación cancelada.')).toBeInTheDocument();
    expect(await ctx.db.settings.get('lastBackupAt')).toBeUndefined();
  });

  it('sin compartir, descarga el archivo', async () => {
    const createUrl = vi.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderRoutes(ctx, [{ path: '/ajustes', element: <SettingsScreen /> }], '/ajustes');
    await userEvent.click(await screen.findByRole('button', { name: 'Exportar copia' }));
    await screen.findByText('Copia exportada.');
    expect(click).toHaveBeenCalledOnce();
    expect(createUrl).toHaveBeenCalledOnce();
  });

  it('importar: archivo inválido muestra el motivo; válido pide confirmación con resumen', async () => {
    await addDaily('Caminar', [1, 2]);
    const backup = await buildBackup(ctx.db, '0.2.0', new Date('2026-10-12T10:00:00Z'));
    renderRoutes(ctx, [{ path: '/ajustes', element: <SettingsScreen /> }], '/ajustes');
    const fileInput = await screen.findByLabelText('Archivo de copia de seguridad');

    await userEvent.upload(fileInput, new File(['{"hola":1}'], 'x.json', { type: 'application/json' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no es una copia de seguridad de ARVID');

    await userEvent.upload(
      fileInput,
      new File([JSON.stringify({ ...backup, formatVersion: 2 })], 'x.json', { type: 'application/json' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('versión más nueva');

    await userEvent.upload(fileInput, new File([JSON.stringify(backup)], 'x.json', { type: 'application/json' }));
    const dialog = await screen.findByRole('alertdialog', { name: '¿Reemplazar tus datos?' });
    expect(dialog).toHaveTextContent('Exportado el 12 oct 2026 · 1 actividad · 2 registros');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reemplazar' }));
    expect(await screen.findByText('Datos importados.')).toBeInTheDocument();
  });

  it('DEL-01: sin escribir BORRAR no elimina', async () => {
    await addDaily('Caminar');
    await saveSetting(ctx.db, 'onboardingCompletedAt', new Date().toISOString());
    renderRoutes(
      ctx,
      [
        { path: '/ajustes', element: <SettingsScreen /> },
        { path: '/', element: <p>inicio</p> },
      ],
      '/ajustes',
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar todos mis datos' }));
    await userEvent.type(screen.getByLabelText('Escribe BORRAR para confirmar'), 'borrar no');
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByText('Escribe BORRAR para confirmar', { selector: 'p' })).toBeInTheDocument();
    expect(await ctx.db.activities.count()).toBe(1);
    await userEvent.clear(screen.getByLabelText('Escribe BORRAR para confirmar'));
    await userEvent.type(screen.getByLabelText('Escribe BORRAR para confirmar'), 'BORRAR');
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByText('inicio')).toBeInTheDocument();
    expect(await ctx.db.activities.count()).toBe(0);
  });
});
