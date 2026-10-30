import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding } from './helpers';

const SCENE = 'Tu protagonista camina por un puente de la ciudad de noche, con ARVID a su lado';

/** Huella de la parte baja de la escena (piernas del personaje, acera y barandilla; ARVID y su burbuja van más arriba). */
function snapshot(page: Page) {
  return page.getByRole('img', { name: SCENE }).evaluate((c: HTMLCanvasElement) => {
    // El lienzo va a la resolución de la pantalla (D-161): las coordenadas de la escena (384 de ancho) se escalan
    const k = c.width / 384;
    const d = c.getContext('2d')!.getImageData(0, 135 * k, c.width, c.height - 135 * k).data;
    let h = 0;
    for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]!) | 0;
    return h;
  });
}

/** El lienzo tiene algo dibujado en la zona del protagonista. */
function heroDrawn(page: Page) {
  return page.getByRole('img', { name: SCENE }).evaluate((c: HTMLCanvasElement) => {
    const k = c.width / 384;
    const d = c.getContext('2d')!.getImageData(140 * k, 120 * k, 40 * k, 50 * k).data;
    let opaque = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i]! > 0) opaque++;
    return opaque > 100 * k * k;
  });
}

test.describe('escena neón (spec 05)', () => {
  test('UB-01/ESC-09: Hoy muestra la escena animada con la fecha y el botón de música', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await completeOnboarding(page);
    await expect(page.getByRole('img', { name: SCENE })).toBeVisible();
    await expect.poll(() => heroDrawn(page)).toBe(true);
    const a = await snapshot(page);
    await page.waitForTimeout(400);
    expect(await snapshot(page)).not.toBe(a);
    // La bocina abre la página Sonido (D-195); tachada mientras la música está apagada
    await expect(page.getByRole('link', { name: 'Música' })).toHaveAttribute('href', '/sonido');
  });

  test('UB-05: al hacer scroll en Hoy, la escena, la fecha y el nivel siguen arriba', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 420 });
    await completeOnboarding(page);
    const scene = page.getByRole('img', { name: SCENE });
    const date = page.getByRole('heading', { level: 1 });
    await expect(scene).toBeVisible();
    const before = { scene: (await scene.boundingBox())!.y, date: (await date.boundingBox())!.y };
    await page.evaluate(() => window.scrollTo(0, 400));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(50);
    expect((await scene.boundingBox())!.y).toBeCloseTo(before.scene, 0);
    expect((await date.boundingBox())!.y).toBeCloseTo(before.date, 0);
  });

  test('UB-06: al abrir la app, la fecha se escribe en negro, se abren las bandas y queda arriba a la izquierda', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await completeOnboarding(page);
    await page.reload();
    const intro = page.locator('.scene-intro');
    await expect(intro).toBeVisible();
    await expect(intro).toHaveClass(/open/, { timeout: 5000 });
    await expect(intro).toHaveCount(0);
    const date = page.getByRole('heading', { level: 1 });
    const [d, scene] = [await date.boundingBox(), await page.getByRole('img', { name: SCENE }).boundingBox()];
    expect(d!.x - scene!.x).toBeLessThan(20);
    expect(d!.y - scene!.y).toBeLessThan(20);
    // Al volver a Hoy en la misma apertura no se repite
    await page.goto('/perfil');
    await page.getByRole('link', { name: 'Hoy' }).click();
    await expect(page.locator('.scene-overlay')).toBeVisible();
    await expect(intro).toHaveCount(0);
  });

  test('UB-06: con movimiento reducido no hay presentación; la fecha ya está en la escena', async ({ page }) => {
    await completeOnboarding(page);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.scene-intro')).toHaveCount(0);
  });

  test('ESC-11: con movimiento reducido la escena queda quieta', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await completeOnboarding(page);
    await expect.poll(() => heroDrawn(page)).toBe(true);
    const a = await snapshot(page);
    await page.waitForTimeout(400);
    expect(await snapshot(page)).toBe(a);
  });

  test('UB-02/PRO-03: Perfil muestra la escena con el nivel; el personaje se cambia en Ajustes', async ({ page }) => {
    await completeOnboarding(page);
    await page.goto('/perfil');
    await expect(page.getByRole('img', { name: SCENE })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Nivel 1 · / })).toBeVisible();

    await page.goto('/ajustes/perfil');
    // Los personajes, en lista como las pistas de Sonido (D-197)
    await page.getByRole('radio', { name: /^Drifter,/ }).check();
    await expect(page.getByRole('radio', { name: /^Drifter,/ })).toBeChecked();
    await page.getByRole('radio', { name: 'Ocaso' }).check();
    await expect(page.locator('.profile-hero-name')).toHaveText('Drifter');
    // Antes de recargar, esperar a que el ajuste esté guardado
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            new Promise((resolve) => {
              const req = indexedDB.open('arvid');
              req.onsuccess = () => {
                const get = req.result.transaction('settings').objectStore('settings').get('avatar');
                get.onsuccess = () => {
                  req.result.close();
                  resolve(get.result?.value);
                };
              };
            }),
        ),
      )
      .toEqual({ cast: 'el2', variant: 'ocaso' });
    await page.reload();
    await expect(page.getByRole('radio', { name: /^Drifter,/ })).toBeChecked();
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
