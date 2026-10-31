import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding, skipDialogue, revealSceneControls } from './helpers';

/** Lo que ARVID está diciendo, en la región accesible de la escena (BP-04). */
const arvidSays = (page: Page) => page.getByRole('status').filter({ hasText: /^ARVID dice:/ });

test.describe('ARVID (spec 06)', () => {
  test('MV-01 · DL-01: tras el onboarding, ARVID llega y saluda en Hoy por la hora y con el alias', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await completeOnboarding(page);
    await expect(arvidSays(page)).toHaveText(/ARVID dice: (Buenos días|Buenas tardes|Buenas noches), Prueba\./, { timeout: 10_000 });
  });

  test('CH: el chat se despliega desde el botón, pasa a "Enviar"; sin permiso, ARVID pide activar la IA', async ({ page }) => {
    await completeOnboarding(page);
    await revealSceneControls(page);
    await page.getByRole('button', { name: 'Hablar con ARVID' }).click();
    const input = page.getByRole('textbox', { name: 'Mensaje para ARVID' });
    await expect(input).toBeFocused();
    await expect(page.getByRole('button', { name: 'Enviar' })).toBeVisible();
    await input.fill('¿Qué hago hoy?');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(arvidSays(page)).toHaveText(/activa «ARVID con IA»/, { timeout: 15_000 });
    await page.keyboard.press('Escape');
    await expect(input).toBeHidden();
  });

  test('IA: con permiso, ARVID saluda y conversa con lo que responde /api/arvid', async ({ page }) => {
    const requests: { moment: string; messages: unknown[] }[] = [];
    await page.route('**/api/arvid', async (route) => {
      const body = route.request().postDataJSON() as { moment: string; messages: { content: string }[] };
      requests.push(body);
      const reply = body.moment === 'chat' ? `Respuesta a: ${body.messages.at(-1)!.content}` : 'Hola desde la IA, Prueba.';
      await route.fulfill({ json: { reply } });
    });
    await completeOnboarding(page, { ai: true });
    await expect(arvidSays(page)).toHaveText(/Hola desde la IA, Prueba\./, { timeout: 10_000 });
    await revealSceneControls(page);
    await page.getByRole('button', { name: 'Hablar con ARVID' }).click();
    await page.getByRole('textbox', { name: 'Mensaje para ARVID' }).fill('¿Qué hago hoy?');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(arvidSays(page)).toHaveText(/Respuesta a: ¿Qué hago hoy\?/, { timeout: 15_000 });
    expect(requests.map((r) => r.moment)).toEqual(['greeting', 'chat']);
  });

  test('I18N: el onboarding en inglés deja la app en inglés', async ({ page }) => {
    await page.goto('/');
    await skipDialogue(page);
    await page.getByRole('radio', { name: 'English' }).check();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('PF-01: /personaje redirige a /perfil', async ({ page }) => {
    await completeOnboarding(page);
    await page.goto('/personaje/disciplina');
    await expect(page).toHaveURL(/\/perfil\/disciplina$/);
    await expect(page.getByRole('heading', { name: 'Disciplina', level: 1 })).toBeVisible();
  });

  test('PR-01: quien ya hizo el onboarding sin alias ve la presentación de ARVID', async ({ page }) => {
    await completeOnboarding(page);
    // Simula un usuario de la 0.5.0: sin perfil
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const req = indexedDB.open('arvid');
          req.onsuccess = () => {
            const tx = req.result.transaction('settings', 'readwrite');
            tx.objectStore('settings').delete('profile');
            tx.oncomplete = () => {
              req.result.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        }),
    );
    await page.reload();
    const intro = page.getByRole('dialog', { name: 'ARVID se presenta' });
    await expect(intro).toBeVisible();
    await intro.getByRole('button', { name: 'Más tarde' }).click();
    await expect(intro).toBeHidden();
    await page.reload();
    await expect(page.getByRole('dialog', { name: 'ARVID se presenta' })).toBeHidden();
  });
});

test('D-098: desde la escena, expandir abre la conversación con lo escrito; enviar desde allí la guarda', async ({ page }) => {
  await completeOnboarding(page);
  await revealSceneControls(page);
    await page.getByRole('button', { name: 'Hablar con ARVID' }).click();
  await page.getByLabel('Mensaje para ARVID').fill('¿Qué tal?');
  await page.getByRole('button', { name: 'Ver toda la conversación' }).click();
  await expect(page).toHaveURL(/\/chat$/);
  await expect(page.getByLabel('Mensaje para ARVID')).toHaveValue('¿Qué tal?');
  await page.getByRole('button', { name: 'Enviar' }).click();
  // Dentro de la conversación (el campo de texto, un textarea, conserva su texto inicial en el DOM)
  const log = page.getByRole('region', { name: 'Conversación con ARVID' });
  await expect(log.getByText('¿Qué tal?', { exact: true })).toBeVisible();
  await expect(log.getByText(/activa «ARVID con IA»/)).toBeVisible();
  await page.reload();
  await expect(log.getByText('¿Qué tal?', { exact: true })).toBeVisible();
});

test('2.0.1: volver de «Lo que ARVID sabe de ti» no crea un bucle con el chat', async ({ page }) => {
  await completeOnboarding(page);
  await page.getByRole('button', { name: 'Hablar con ARVID' }).click();
  await page.getByRole('button', { name: 'Ver toda la conversación' }).click();
  await expect(page).toHaveURL(/\/chat$/);
  await page.getByRole('button', { name: 'Opciones' }).click();
  await page.getByRole('menuitem', { name: /sabe de ti/ }).click();
  await expect(page).toHaveURL(/\/chat\/memoria$/);
  await page.getByRole('link', { name: /Conversación/ }).click();
  await expect(page).toHaveURL(/\/chat$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/hoy$/);
});

test('2.0.2: Sonido sube como hoja; el reproductor y «Lista» quedan fijos y se cierra deslizándola', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/sonido');
  const sheet = page.getByRole('dialog', { name: 'Sonido' });
  await expect(sheet).toBeVisible();
  // El volumen de la música, en «Ajustes de sonido», solo con «Seguir sonando al salir de la app» desactivado
  await sheet.locator('summary').click();
  await expect(sheet.getByRole('slider', { name: 'Volumen de la música' })).toHaveCount(0);
  const background = sheet.getByRole('checkbox', { name: 'Seguir sonando al salir de la app' });
  await background.click();
  await expect(background).not.toBeChecked();
  await expect(sheet.getByRole('slider', { name: 'Volumen de la música' })).toBeVisible();
  await sheet.locator('summary').click();
  const player = page.locator('.sound-player');
  const head = page.locator('.sound-list-head');
  const before = [(await player.boundingBox())!.y, (await head.boundingBox())!.y];
  await page.locator('.sound-scroll').evaluate((el) => el.scrollTo(0, 400));
  await expect.poll(() => page.locator('.sound-scroll').evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await expect.poll(async () => [(await player.boundingBox())!.y, (await head.boundingBox())!.y]).toEqual(before);
  // Al llegar a los ajustes, el título fijo cambia de «Lista» a «Ajustes de sonido»
  await expect(page.locator('.sound-list-head')).toHaveText('Lista');
  await sheet.locator('summary').click();
  await page.locator('.sound-scroll').evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(page.locator('.sound-list-head')).toHaveText('Ajustes de sonido');
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
});

test('2.0.3: arrastrar hacia abajo sobre la portada cierra la hoja de Sonido sin mover la página de detrás', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('/sonido');
  const sheet = page.getByRole('dialog', { name: 'Sonido' });
  await expect(sheet).toBeVisible();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  const cover = (await page.locator('.sound-player .player-cover').boundingBox())!;
  await page.mouse.move(cover.x + cover.width / 2, cover.y + cover.height / 2);
  await page.mouse.down();
  await page.mouse.move(cover.x + cover.width / 2, cover.y + cover.height / 2 + 80, { steps: 5 });
  await page.mouse.move(cover.x + cover.width / 2, cover.y + cover.height / 2 + 220, { steps: 5 });
  await page.mouse.up();
  await expect(sheet).toHaveCount(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
});
