import { expect, test } from '@playwright/test';
import { completeOnboarding, createActivity, finishOnboarding, onboardingToCategories, row, skipDialogue } from './helpers';

// Fechas de referencia (Europe/Madrid): 14 oct 2026 es miércoles; 19 oct, lunes.
const WED = new Date('2026-10-14T10:00:00+02:00');

test.describe('onboarding', () => {
  test('ONB-01/02: flujo completo y al menos una categoría', async ({ page }) => {
    await onboardingToCategories(page);
    for (const name of ['Cuerpo', 'Descanso', 'Mente', 'Aprendizaje', 'Relaciones', 'Orden']) {
      await page.getByRole('checkbox', { name: new RegExp(name) }).uncheck();
    }
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('alert')).toHaveText('Activa al menos una categoría');
    await page.getByRole('checkbox', { name: /Mente/ }).check();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await finishOnboarding(page);
    await expect(page.getByRole('heading', { name: 'Crea tu primera actividad' })).toBeVisible();

    await page.goto('/actividades/nueva');
    await expect(page.getByLabel('Mente', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Cuerpo', { exact: true })).toHaveCount(0);
  });

  test('ONB-03/05: en iPhone sin instalar se muestra la guía y el aviso', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Solo con el perfil de iPhone');
    await onboardingToCategories(page);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await skipDialogue(page);
    await expect(page.getByRole('heading', { name: 'Instala ARVID en tu iPhone' })).toBeVisible();
    await page.getByRole('button', { name: 'Entendido' }).click();
    await skipDialogue(page);
    await page.getByRole('button', { name: 'Ir a Hoy' }).click();
    await expect(page.getByText('Instala ARVID en tu pantalla de inicio para proteger tus datos.')).toBeVisible();
  });
});

test.describe('registro diario', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: WED });
    await completeOnboarding(page);
  });

  test('crear, registrar, completar y deshacer (ACT-01, LOG-01, LOG-04, HOY-03)', async ({ page }) => {
    await createActivity(page, { name: 'Caminar', category: 'Cuerpo' });
    await expect(page.getByRole('heading', { name: 'Miércoles, 14 oct' })).toBeVisible();
    await expect(page.getByText('1 actividad pendiente')).toBeVisible();

    await row(page, 'Caminar').getByRole('button', { name: 'Registrar Caminar' }).click();
    await expect(page.getByText('Día completo', { exact: true })).toBeVisible();
    await expect(row(page, 'Caminar').getByText('Hecho')).toBeVisible();

    await row(page, 'Caminar').getByRole('button', { name: 'Deshacer Caminar' }).click();
    await expect(page.getByText('1 actividad pendiente')).toBeVisible();
  });

  test('LOG-06: un doble toque crea un solo registro', async ({ page }) => {
    await createActivity(page, { name: 'Agua', target: 3 });
    await row(page, 'Agua').getByRole('button', { name: 'Registrar Agua' }).dblclick();
    await expect(row(page, 'Agua').getByText('1 de 3', { exact: true })).toBeVisible();
    await page.waitForTimeout(300);
    await expect(row(page, 'Agua').getByText('1 de 3', { exact: true })).toBeVisible();
  });

  test('LOG-02: no se supera N', async ({ page }) => {
    await createActivity(page, { name: 'Leer', target: 2 });
    const register = row(page, 'Leer').getByRole('button', { name: 'Registrar Leer' });
    await register.click();
    await expect(row(page, 'Leer').getByText('1 de 2', { exact: true })).toBeVisible();
    await register.click();
    await expect(row(page, 'Leer').getByText('Hecho')).toBeVisible();
    await expect(register).toHaveCount(0);
  });

  test('ACT-04: cambiar a 4/semana a mitad de semana conserva los registros', async ({ page }) => {
    await createActivity(page, { name: 'Gym', period: 'Semanal', target: 3 });
    const register = row(page, 'Gym').getByRole('button', { name: 'Registrar Gym' });
    await register.click();
    await expect(row(page, 'Gym').getByText('1 de 3 · quedan 5 días')).toBeVisible();
    await register.click();
    await expect(row(page, 'Gym').getByText('2 de 3 · quedan 5 días')).toBeVisible();

    await row(page, 'Gym').getByRole('link', { name: 'Gym' }).click();
    await page.getByRole('link', { name: 'Editar' }).click();
    await page.getByLabel(/^Veces por/).fill('4');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Cuerpo · 4 veces/semana · Media · 10 puntos')).toBeVisible();
    await page.getByRole('link', { name: 'Hoy' }).click();
    await expect(row(page, 'Gym').getByText('2 de 4 · quedan 5 días')).toBeVisible();
  });

  test('ACT-05/06: pausar oculta de Hoy, archivar y restaurar', async ({ page }) => {
    await createActivity(page, { name: 'Meditar', category: 'Mente' });
    await row(page, 'Meditar').getByRole('link', { name: 'Meditar' }).click();
    await page.getByRole('button', { name: 'Pausar' }).click();
    await expect(page.getByText('Pausada', { exact: true })).toBeVisible();
    await expect(page.getByText('Reanuda la actividad para registrar.')).toBeVisible();

    await page.getByRole('link', { name: 'Hoy' }).click();
    await expect(page.getByRole('heading', { name: 'Crea tu primera actividad' })).toBeVisible();

    await page.getByRole('link', { name: 'Actividades' }).click();
    await expect(page.getByRole('heading', { name: 'Pausadas' })).toBeVisible();
    await page.getByRole('link', { name: /Meditar/ }).click();
    await page.getByRole('button', { name: 'Archivar' }).click();
    await page.getByRole('link', { name: 'Actividades' }).first().click();
    await expect(page.getByRole('heading', { name: 'Archivadas' })).toBeVisible();
    await page.getByRole('link', { name: /Meditar/ }).click();
    await page.getByRole('button', { name: 'Restaurar' }).click();
    await page.getByRole('link', { name: 'Hoy' }).click();
    await expect(row(page, 'Meditar')).toBeVisible();
  });

  test('ACT-08: reordenar cambia el orden en Hoy', async ({ page }) => {
    await createActivity(page, { name: 'Primera' });
    await createActivity(page, { name: 'Segunda' });
    await page.getByRole('link', { name: 'Actividades' }).click();
    await page.getByRole('button', { name: 'Subir Segunda' }).click();
    await expect(page.getByRole('button', { name: 'Subir Segunda' })).toBeDisabled();
    await page.getByRole('link', { name: 'Hoy' }).click();
    await expect(page.getByRole('region', { name: 'Hoy' }).getByRole('listitem').getByRole('link')).toHaveText(['Segunda', 'Primera']);
  });
});

test.describe('fechas', () => {
  test('HOY-05 y DET-02: el lunes se registra el domingo olvidado', async ({ page }) => {
    await page.clock.install({ time: WED });
    await completeOnboarding(page);
    await createActivity(page, { name: 'Caminar' });
    await createActivity(page, { name: 'Gym', period: 'Semanal', target: 2 });

    await page.clock.setSystemTime(new Date('2026-10-19T09:00:00+02:00'));
    await page.reload();
    await page.getByRole('button', { name: '¿Olvidaste algo ayer?' }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByRole('heading')).toHaveText('Ayer, domingo, 18 oct');
    await sheet.getByRole('button', { name: 'Registrar Caminar ayer' }).click();
    await expect(sheet.getByText('Caminar')).toHaveCount(0);
    await sheet.getByRole('button', { name: 'Cerrar' }).click();

    // Detalle: el domingo es editable, el sábado no aparece.
    await row(page, 'Gym').getByRole('link', { name: 'Gym' }).click();
    await expect(page.getByText('sáb 17')).toHaveCount(0);
    await page.getByRole('button', { name: 'Registrar el dom 18' }).click();
    await expect(page.getByRole('listitem').filter({ hasText: 'dom 18' }).getByText('1 registro')).toBeVisible();
  });

  test('HOY-07: al pasar la medianoche Hoy cambia de día', async ({ page }) => {
    // Sin animación de la escena: el reloj simulado ejecutaría de golpe los ~10 800 fotogramas de 3 minutos
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install({ time: new Date('2026-10-17T23:58:00+02:00') });
    await completeOnboarding(page);
    await createActivity(page, { name: 'Caminar' });
    await row(page, 'Caminar').getByRole('button', { name: 'Registrar Caminar' }).click();
    await expect(page.getByText('Día completo', { exact: true })).toBeVisible();

    await page.clock.runFor(3 * 60_000);
    await expect(page.getByRole('heading', { name: 'Domingo, 18 oct' })).toBeVisible();
    await expect(page.getByText('1 actividad pendiente')).toBeVisible();
  });
});

test.describe('navegación', () => {
  test('PWA-05: rutas directas y Atrás', async ({ page }) => {
    await completeOnboarding(page);
    await createActivity(page, { name: 'Leer' });
    await page.goto('/actividades');
    await page.getByRole('link', { name: /Leer/ }).click();
    await expect(page.getByRole('heading', { name: 'Leer' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Actividades' })).toBeVisible();
    await page.goto('/ruta-inexistente');
    await expect(page).toHaveURL(/\/hoy$/);
    await page.goto('/perfil');
    await page.getByRole('link', { name: 'Ajustes' }).click();
    await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible();
    await page.getByRole('link', { name: 'Perfil' }).first().click();
    await expect(page.getByRole('heading', { name: 'Prueba · Runner' })).toBeVisible();
  });
});
