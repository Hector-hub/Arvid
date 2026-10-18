import { expect, test } from '@playwright/test';
import { completeOnboarding, createActivity, row } from './helpers';

const DAY1 = new Date('2026-10-01T10:00:00+02:00');

test('PJ-01/02 · DA-01: radar, ventana recordada y detalle de atributo', async ({ page }) => {
  // 8 recargas de Hoy con la escena animada: en WebKit (renderizado por software) roza el límite de 30 s
  test.slow();
  // Caminar se crea el 1 oct; se registra del 2 al 9; hoy es 12 oct.
  await page.clock.install({ time: DAY1 });
  await completeOnboarding(page);
  await createActivity(page, { name: 'Caminar', category: 'Cuerpo' });
  for (let day = 2; day <= 9; day++) {
    await page.clock.setSystemTime(new Date(`2026-10-0${day}T10:00:00+02:00`));
    await page.goto('/hoy');
    await row(page, 'Caminar').getByRole('button', { name: 'Registrar Caminar' }).click();
    await expect(row(page, 'Caminar').getByText('Completada')).toBeVisible();
  }
  await page.clock.setSystemTime(new Date('2026-10-12T10:00:00+02:00'));
  await page.goto('/perfil');

  // 30 días: 10 días cerrados (2–11 oct), 8 cumplidos → 80.
  const radar = page.getByRole('img', { name: /Radar de atributos/ });
  await expect(radar).toHaveAttribute('aria-label', /Cuerpo 80/);
  await expect(radar).toHaveAttribute('aria-label', /Mente sin datos \(0 de 3\)/);

  // 7 días: ventana 6–12 oct; cerrados 6–11 (6 días), cumplidos 6–9 (4) → 67. Se recuerda tras recargar.
  await page.getByRole('button', { name: '7 días' }).click();
  await expect(radar).toHaveAttribute('aria-label', /Cuerpo 67/);
  await page.reload();
  await expect(page.getByRole('button', { name: '7 días' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('list', { name: 'Lista de atributos' }).getByRole('link', { name: /Cuerpo/ }).click();
  await expect(page.getByText(/Cuerpo 67: ganaste 40 de 60 puntos posibles en los últimos 7 días \(6 días de Caminar\)\./)).toBeVisible();
  await page.getByRole('link', { name: 'Caminar' }).click();
  await expect(page.getByRole('heading', { name: 'Caminar' })).toBeVisible();
});

test('CAT-04/05: categoría propia en el formulario y el radar; renombrar una predefinida', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/ajustes');
  await page.getByRole('link', { name: 'Nueva categoría' }).click();
  await page.getByLabel('Nombre').fill('Música');
  await page.getByLabel('Nota musical').check();
  await page.getByRole('button', { name: 'Crear categoría' }).click();
  await expect(page.getByRole('checkbox', { name: /^Música (Activa|Inactiva)$/ })).toBeChecked();

  await page.getByRole('link', { name: 'Editar Cuerpo' }).click();
  await page.getByLabel('Nombre').fill('Salud');
  await page.getByRole('button', { name: 'Guardar' }).click();
  // Esperar a que se guarde antes de navegar
  await expect(page.getByRole('link', { name: 'Editar Salud' })).toBeVisible();

  await createActivity(page, { name: 'Guitarra', category: 'Música' });
  await createActivity(page, { name: 'Correr', category: 'Salud' });
  await row(page, 'Guitarra').getByRole('button', { name: 'Registrar Guitarra' }).click();
  await expect(row(page, 'Guitarra').getByText('Completada')).toBeVisible();
  await page.goto('/perfil');
  const radar = page.getByRole('img', { name: /Radar de atributos/ });
  await expect(radar).toHaveAttribute('aria-label', /Salud sin datos/);
  await expect(radar).toHaveAttribute('aria-label', /Música sin datos \(1 de 3\)/);
});
