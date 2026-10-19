import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { completeOnboarding, createActivity, row } from './helpers';

const WED = new Date('2026-10-14T10:00:00+02:00');

test('PRG-06/07: celebra el nivel 2 una sola vez', async ({ page }) => {
  await page.clock.install({ time: WED });
  await completeOnboarding(page);
  // 5 actividades Difíciles (20 XP) → 100 XP = nivel 2.
  for (const name of ['A1', 'A2', 'A3', 'A4', 'A5']) await createActivity(page, { name, difficulty: 'Difícil' });
  await expect(page.getByRole('link', { name: /Nv 1 · Recluta/ })).toBeVisible();

  for (const name of ['A1', 'A2', 'A3', 'A4']) {
    await row(page, name).getByRole('button', { name: `Registrar ${name}` }).click();
    await expect(row(page, name).getByText('Completada')).toBeVisible();
  }
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await row(page, 'A5').getByRole('button', { name: 'Registrar A5' }).click();

  const modal = page.getByRole('dialog', { name: '¡Nivel 2!' });
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Continuar' }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Nv 2 · Recluta/ })).toBeVisible();

  // Deshacer y volver a registrar no repite la celebración.
  await row(page, 'A5').getByRole('button', { name: 'Deshacer A5' }).click();
  await expect(page.getByRole('link', { name: /Nv 1 · Recluta/ })).toBeVisible();
  await row(page, 'A5').getByRole('button', { name: 'Registrar A5' }).click();
  await expect(page.getByRole('link', { name: /Nv 2 · Recluta/ })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('STR-02/03/04: racha en Hoy y en el detalle, con comodín usado', async ({ page }) => {
  // Flujo largo con varias cargas de Hoy y su escena: en WebKit (renderizado por software) roza los 30 s
  test.slow();
  // Creada el 1 oct; se registra cada día del 1 al 7 (gana comodín), falla el 8 (lo usa), registra el 9.
  await page.clock.install({ time: new Date('2026-10-01T10:00:00+02:00') });
  await completeOnboarding(page);
  await createActivity(page, { name: 'Caminar' });
  for (let day = 1; day <= 9; day++) {
    if (day !== 8) {
      await page.goto('/hoy');
      await row(page, 'Caminar').getByRole('button', { name: 'Registrar Caminar' }).click();
      await expect(row(page, 'Caminar').getByText('Completada')).toBeVisible();
    }
    await page.clock.setSystemTime(new Date(`2026-10-${String(day + 1).padStart(2, '0')}T10:00:00+02:00`));
  }
  // Hoy es 10 oct: racha de 8 días (7 + el 9), comodín consumido el 8.
  await page.goto('/hoy');
  await expect(row(page, 'Caminar').getByText('0 de 1 · racha 8 días')).toBeVisible();
  await row(page, 'Caminar').getByRole('link', { name: 'Caminar' }).click();
  await expect(page.getByText('8 días')).toBeVisible();
  await expect(page.getByText('Comodines 0 de 2')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'jue 8' }).getByText('Comodín usado')).toBeVisible();
});

test('BAK · NFR2-03: exportar, borrar todo e importar recupera los mismos datos', async ({ page }) => {
  // Flujo largo con varias cargas de Hoy y su escena: en WebKit (renderizado por software) roza los 30 s
  test.slow();
  // En headless la hoja de compartir del sistema no se resuelve: se fuerza la ruta de descarga.
  // La de compartir se cubre en los tests de componente y en la checklist manual (M2-01).
  await page.addInitScript(() => Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }));
  await page.clock.install({ time: WED });
  await completeOnboarding(page);
  await createActivity(page, { name: 'Leer', difficulty: 'Difícil' });
  await row(page, 'Leer').getByRole('button', { name: 'Registrar Leer' }).click();
  // Esperar a que el registro se haya guardado antes de navegar.
  await expect(row(page, 'Leer').getByText('Completada')).toBeVisible();

  await page.goto('/ajustes');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar copia' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('arvid-backup-2026-10-14.json');
  const file = await download.path();
  const content = JSON.parse(await readFile(file, 'utf8'));
  expect(content).toMatchObject({ format: 'arvid-backup', formatVersion: 1 });
  await expect(page.getByText('Última copia: hoy')).toBeVisible();

  // DEL-01
  await page.getByRole('button', { name: 'Eliminar todos mis datos' }).click();
  await page.getByLabel('Escribe BORRAR para confirmar').fill('BORRAR');
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Diálogo con ARVID' })).toBeVisible();
  await completeOnboarding(page);
  await expect(page.getByRole('heading', { name: 'Crea tu primera actividad' })).toBeVisible();

  await page.goto('/ajustes');
  await page.getByLabel('Archivo de copia de seguridad').setInputFiles(file);
  const dialog = page.getByRole('alertdialog', { name: '¿Reemplazar tus datos?' });
  await expect(dialog).toContainText('1 actividad · 1 registro');
  await dialog.getByRole('button', { name: 'Reemplazar' }).click();
  await expect(page.getByText('Datos importados.')).toBeVisible();

  await page.goto('/hoy');
  await expect(row(page, 'Leer').getByText('Completada')).toBeVisible();
  await page.goto('/perfil');
  await expect(page.getByText('20 / 100 XP')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
