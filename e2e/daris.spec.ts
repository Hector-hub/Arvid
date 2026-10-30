import { expect, test } from '@playwright/test';
import { completeOnboarding } from './helpers';

test.describe('DARIS (spec 08)', () => {
  test('CO-02 · CO-03: elegida en el onboarding, DARIS acompaña en Hoy; en Ajustes se vuelve a ARVID', async ({ page }) => {
    await completeOnboarding(page, { companion: 'DARIS' });
    await expect(page.getByRole('img', { name: /con DARIS a su lado/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hablar con DARIS' })).toBeVisible();

    await page.goto('/ajustes/perfil');
    await expect(page.getByRole('heading', { name: 'Color de DARIS' })).toBeVisible();
    await page.getByRole('radio', { name: /ARVID/ }).click();
    await expect(page.getByRole('heading', { name: 'Color de ARVID' })).toBeVisible();
    await page.goto('/hoy');
    await expect(page.getByRole('img', { name: /con ARVID a su lado/ })).toBeVisible();
  });
});
