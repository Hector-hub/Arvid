import { expect, test } from '@playwright/test';
import { completeOnboarding, createActivity, row } from './helpers';

test('PWA-01: el manifest es válido', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest).toMatchObject({ name: 'ARVID', display: 'standalone', theme_color: '#1a1c2c', start_url: '/hoy' });
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  for (const icon of manifest.icons as { src: string }[]) expect((await request.get(icon.src)).ok()).toBe(true);
});

test('PWA-02: el service worker se instala en la primera visita, antes del onboarding', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit no ejecuta service workers');
  await page.goto('/');
  await expect(page.getByRole('group', { name: 'Diálogo con ARVID' })).toBeVisible();
  await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.active)).toBe(true);
});

test('OFF-T1/T2 · PWA-02: sin conexión abre, muestra datos y registra; persiste al reabrir', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit no ejecuta service workers; se verifica en dispositivo (M-04)');
  await completeOnboarding(page);
  await createActivity(page, { name: 'Caminar' });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // El service worker toma el control tras la primera carga.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(row(page, 'Caminar')).toBeVisible();
  await row(page, 'Caminar').getByRole('button', { name: 'Registrar Caminar' }).click();
  await expect(page.getByText('Día completo', { exact: true })).toBeVisible();

  await page.close();
  const again = await context.newPage();
  await again.goto('/hoy');
  await expect(again.getByText('Día completo', { exact: true })).toBeVisible();
});

test('NFR-03: el uso diario no hace peticiones a otros orígenes', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.origin !== 'http://localhost:4173') external.push(req.url());
  });
  await completeOnboarding(page);
  await createActivity(page, { name: 'Leer' });
  await row(page, 'Leer').getByRole('button', { name: 'Registrar Leer' }).click();
  await expect(row(page, 'Leer').getByText('Completada')).toBeVisible();
  await page.goto('/ajustes');
  await page.goto('/perfil');
  expect(external).toEqual([]);
});

test('PWA-04: la app funciona con la CSP estricta y sin violaciones', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (msg) => {
    if (/Content Security Policy|Refused to/i.test(msg.text())) violations.push(msg.text());
  });
  const res = await page.goto('/');
  expect(res?.headers()['content-security-policy']).toContain("default-src 'self'");
  await completeOnboarding(page);
  await createActivity(page, { name: 'Leer' });
  expect(violations).toEqual([]);
});
