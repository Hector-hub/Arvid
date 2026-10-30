import { expect, test } from '@playwright/test';
import { completeOnboarding, createActivity, row } from './helpers';

test.describe('logros (spec 07)', () => {
  test('CE-01 · LP: el primer registro desbloquea "Primer paso", con aviso, y aparece ganado en Perfil', async ({
    page,
  }) => {
    await completeOnboarding(page);
    await createActivity(page, { name: 'Caminar', category: 'Cuerpo' });
    await row(page, 'Caminar').getByRole('button', { name: 'Registrar Caminar' }).click();

    const toast = page.getByRole('button', { name: /Logro: Primer paso/ });
    await expect(toast).toBeVisible();
    await toast.click();

    await expect(page).toHaveURL(/\/perfil$/);
    const sheet = page.getByRole('dialog', { name: 'Primer paso' });
    await expect(sheet).toContainText('Ganado el');
    await sheet.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.getByText('1 / 11')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Semana sólida, pendiente, 1 de 7' })).toBeVisible();
  });

  test('BT-03: con el teclado, el botón enfocado tiene el contorno dorado (y se ve aunque los botones de la escena estén ocultos)', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari no lleva el foco a los botones con Tab por defecto');
    await completeOnboarding(page);
    const button = page.getByRole('link', { name: 'Música' });
    await button.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
    expect(await button.evaluate((b) => getComputedStyle(b).getPropertyValue('--btn-edge').trim())).toBe('#f5c66b');
  });
});
