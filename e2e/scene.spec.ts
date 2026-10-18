import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding } from './helpers';

const SCENE = 'Tu protagonista camina por un puente de la ciudad de noche';

/** Huella del contenido del lienzo de la escena. */
function snapshot(page: Page) {
  return page.getByRole('img', { name: SCENE }).evaluate((c: HTMLCanvasElement) => c.toDataURL());
}

/** El lienzo tiene algo dibujado en la zona del protagonista. */
function heroDrawn(page: Page) {
  return page.getByRole('img', { name: SCENE }).evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(140, 120, 40, 50).data;
    let opaque = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i]! > 0) opaque++;
    return opaque > 100;
  });
}

test.describe('escena neón (spec 05)', () => {
  test('UB-01/ESC-09: Hoy muestra la escena animada con la fecha y el botón de música', async ({ page }) => {
    await completeOnboarding(page);
    await expect(page.getByRole('img', { name: SCENE })).toBeVisible();
    await expect.poll(() => heroDrawn(page)).toBe(true);
    const a = await snapshot(page);
    await page.waitForTimeout(400);
    expect(await snapshot(page)).not.toBe(a);
    await expect(page.getByRole('button', { name: 'Música' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('ESC-11: con movimiento reducido la escena queda quieta', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await completeOnboarding(page);
    await expect.poll(() => heroDrawn(page)).toBe(true);
    const a = await snapshot(page);
    await page.waitForTimeout(400);
    expect(await snapshot(page)).toBe(a);
  });

  test('UB-02/PRO-03: Personaje muestra la escena con el nivel; el protagonista se cambia en Ajustes', async ({ page }) => {
    await completeOnboarding(page);
    await page.goto('/personaje');
    await expect(page.getByRole('img', { name: SCENE })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Nivel 1 · / })).toBeVisible();

    await page.goto('/ajustes');
    await page.getByRole('radio', { name: 'Él 2' }).check();
    await page.getByRole('radio', { name: 'Ocaso' }).check();
    await expect(page.getByRole('img', { name: 'Él 2 · Ocaso' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('radio', { name: 'Él 2' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Ocaso' })).toBeChecked();
  });

  test('LIC-02: créditos desde Ajustes', async ({ page }) => {
    await completeOnboarding(page);
    await page.goto('/ajustes');
    await page.getByRole('link', { name: 'Créditos' }).click();
    await expect(page.getByRole('heading', { name: 'Créditos' })).toBeVisible();
    await expect(page.getByText(/Warped City/)).toBeVisible();
  });
});
