import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding } from './helpers';

// 14 oct 2026 es miércoles (Europe/Madrid).
const WED = new Date('2026-10-14T10:00:00+02:00');

async function createMission(page: Page, title: string, opts: { deadline?: string; difficulty?: 'Fácil' | 'Media' | 'Difícil' } = {}) {
  await page.goto('/actividades/misiones/nueva');
  await page.getByLabel('Título').fill(title);
  if (opts.difficulty) await page.getByLabel(new RegExp(`^${opts.difficulty}`)).check();
  if (opts.deadline) await page.getByLabel('Fecha límite (opcional)').fill(opts.deadline);
  await page.getByRole('button', { name: 'Crear misión' }).click();
  await expect(page).toHaveURL(/\/actividades\/misiones$/);
}

function missionRow(page: Page, title: string) {
  return page.getByRole('region', { name: 'Misiones' }).getByRole('listitem').filter({ has: page.getByRole('link', { name: title, exact: true }) });
}

async function setDay(page: Page, iso: string) {
  await page.clock.setSystemTime(new Date(iso));
  await page.reload();
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: WED });
  await completeOnboarding(page);
});

test('MUI-01/02 · MHOY-02/03: crear con fecha, verla en Hoy y completarla', async ({ page }) => {
  await page.goto('/actividades');
  await page.getByRole('link', { name: 'Misiones' }).click();
  await expect(page.getByRole('heading', { name: 'Crea una misión' })).toBeVisible();
  await createMission(page, 'Pedir cita', { deadline: '2026-10-15' });
  await expect(page.getByRole('region', { name: 'Pendientes' })).toContainText('vence mañana');

  await page.goto('/hoy');
  await expect(missionRow(page, 'Pedir cita')).toContainText('vence mañana');
  await missionRow(page, 'Pedir cita').getByRole('button', { name: 'Completar Pedir cita' }).click();
  await expect(missionRow(page, 'Pedir cita')).toContainText('Misión cumplida · +10 XP');
  await expect(missionRow(page, 'Pedir cita').getByText('Cumplida', { exact: true })).toBeVisible();
});

test('MIS-02 · D-032 · MUI-03/05: vence, se reprograma y se recupera', async ({ page }) => {
  await createMission(page, 'Entregar informe', { deadline: '2026-10-15' });
  await setDay(page, '2026-10-17T10:00:00+02:00');

  await page.goto('/hoy');
  await expect(page.getByText('1 misión para hoy')).toBeVisible();
  await expect(missionRow(page, 'Entregar informe').getByText('Vencida', { exact: true })).toBeVisible();

  await missionRow(page, 'Entregar informe').getByRole('link', { name: 'Entregar informe' }).click();
  await expect(page.getByText('Venció el 15 oct. Complétala cuando puedas para recuperar lo perdido.')).toBeVisible();
  await page.getByLabel('Nueva fecha límite').fill('2026-10-20');
  await page.getByRole('button', { name: 'Guardar fecha' }).click();
  const history = page.getByRole('region', { name: 'Historial' });
  await expect(history).toContainText('Fecha límite: 15 oct');
  await expect(history).toContainText('Venció el 15 oct');
  await expect(history).toContainText('Reprogramada al 20 oct');

  await page.getByRole('button', { name: 'Completar' }).click();
  await expect(page.getByText('Recuperada', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Desmarcar' })).toBeVisible();
});

test('R-M2: "La hice ayer" el día después de la fecha límite cuenta a tiempo', async ({ page }) => {
  await createMission(page, 'Llamar al banco', { deadline: '2026-10-15' });
  await setDay(page, '2026-10-16T09:00:00+02:00');
  await page.goto('/actividades/misiones');
  await page.getByRole('link', { name: 'Llamar al banco' }).click();
  await page.getByRole('button', { name: 'La hice ayer' }).click();
  await expect(page.getByText('Cumplida', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Historial' })).toContainText('Completada el 15 oct');
});

test('MUI-04 · R-M6: abandonar pide confirmación y es definitivo', async ({ page }) => {
  await createMission(page, 'Ordenar armario', { deadline: '2026-10-20' });
  await page.getByRole('link', { name: 'Ordenar armario' }).click();
  await page.getByRole('button', { name: 'Abandonar' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('cuesta la mitad de su valor en tu Disciplina');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Abandonar' }).click();
  await expect(page.getByText('Abandonada', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Completar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Abandonar' })).toHaveCount(0);
});

test('S3-03: eliminar una misión creada hoy por error', async ({ page }) => {
  await createMission(page, 'Error');
  await page.getByRole('link', { name: 'Error' }).click();
  await page.getByRole('button', { name: 'Eliminar (creada por error)' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();
  await expect(page).toHaveURL(/\/actividades\/misiones$/);
  await expect(page.getByRole('heading', { name: 'Crea una misión' })).toBeVisible();
});

test('INT-01: subir de nivel completando misiones muestra el modal', async ({ page }) => {
  for (const t of ['M1', 'M2', 'M3', 'M4', 'M5']) await createMission(page, t, { difficulty: 'Difícil' });
  await page.goto('/hoy');
  for (const t of ['M1', 'M2', 'M3', 'M4']) {
    await missionRow(page, t).getByRole('button', { name: `Completar ${t}` }).click();
    await expect(missionRow(page, t)).toContainText('Misión cumplida');
  }
  await missionRow(page, 'M5').getByRole('button', { name: 'Completar M5' }).click();
  await expect(page.getByRole('dialog', { name: '¡Nivel 2!' })).toBeVisible();
});
