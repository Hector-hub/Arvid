import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding, skipDialogue } from './helpers';

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
