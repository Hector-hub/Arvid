// La 2.0 de principio a fin con dos «teléfonos» (dos contextos de navegador): cuenta, amistad, invitar a un reto,
// aceptar, marcar, marcador, final, Retos cumplidos, eliminar y conflicto de copias. El servidor es el de verdad
// (netlify/functions/account.mts y social.mts) ejecutado en la propia prueba con almacenes en memoria.
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { handle as accountHandle } from '../netlify/functions/account.mts';
import { handle as socialHandle } from '../netlify/functions/social.mts';
import type { KV, ListKV } from '../netlify/lib/account.mts';
import { finishOnboarding, onboardingToCategories, skipDialogue } from './helpers';

test.skip(({ browserName }) => browserName !== 'chromium', 'Un solo motor basta: el flujo no depende del navegador');
test.use({ viewport: { width: 390, height: 844 } });

function memory<T>(): ListKV<T> {
  const map = new Map<string, T>();
  return {
    get: async (k) => (map.has(k) ? structuredClone(map.get(k)!) : null),
    set: async (k, v) => void map.set(k, structuredClone(v)),
    delete: async (k) => void map.delete(k),
    list: async (prefix) => [...map.keys()].filter((k) => k.startsWith(prefix)),
  };
}

const SECRET = 'secreto-e2e';
const stores = {
  accounts: memory(),
  credentials: memory(),
  recovery: memory(),
  backups: memory(),
  challenges: memory(),
  limits: memory(),
  social: memory(),
  socialChallenges: memory(),
};
const pushes: { to: string; type: string; alias?: string; name?: string }[] = [];

async function serve(context: BrowserContext) {
  await context.route('**/api/{account,social}{,/**}', async (route) => {
    const r = route.request();
    const req = new Request(r.url(), { method: r.method(), headers: r.headers(), body: ['GET', 'HEAD'].includes(r.method()) ? undefined : (r.postData() ?? undefined) });
    const res = r.url().includes('/api/account')
      ? await accountHandle(req, {
          stores: { accounts: stores.accounts, credentials: stores.credentials, recovery: stores.recovery, backups: stores.backups, challenges: stores.challenges, limits: stores.limits } as never,
          secret: SECRET,
        })
      : await socialHandle(req, {
          stores: { accounts: stores.accounts as KV<never>, social: stores.social as KV<never>, limits: stores.limits as KV<never>, challenges: stores.socialChallenges },
          secret: SECRET,
          notify: async (to, push) => void pushes.push({ to, ...push }),
        });
    await route.fulfill({ status: res.status, headers: { 'content-type': 'application/json' }, body: await res.text() });
  });
}

async function newPhone(context: BrowserContext, alias: string): Promise<Page> {
  await serve(context);
  // Sin passkeys (ya probadas en los teléfonos): la cuenta se crea con clave de recuperación
  await context.addInitScript(() => {
    delete (window as { PublicKeyCredential?: unknown }).PublicKeyCredential;
  });
  const page = await context.newPage();
  await onboardingToCategories(page, alias);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await finishOnboarding(page);
  await page.goto('/hoy?cuentas=1');
  await skipDialogue(page);
  return page;
}

/** Crea la cuenta con clave de recuperación y devuelve la clave y el id de la cuenta. */
async function createAccount(page: Page): Promise<{ key: string; id: string }> {
  await page.goto('/ajustes');
  await page.getByRole('button', { name: 'Crear con clave de recuperación' }).click();
  const sheet = page.getByRole('dialog', { name: 'Tu clave de recuperación' });
  const key = (await sheet.getByLabel('Clave de recuperación').textContent())!.trim();
  await sheet.getByRole('checkbox', { name: 'La he guardado' }).check();
  await sheet.getByRole('button', { name: 'Continuar' }).click();
  // La copia recién subida al crearla no vuelve a quedar «Pendiente de subir»
  await expect(page.getByText(/Copia al día/)).toBeVisible();
  await page.waitForTimeout(2500);
  await expect(page.getByText(/Copia al día/)).toBeVisible();
  const id = await page.evaluate(
    () =>
      new Promise<string>((ok) => {
        const open = indexedDB.open('arvid');
        open.onsuccess = () => {
          const get = open.result.transaction('settings').objectStore('settings').get('account');
          get.onsuccess = () => ok(get.result.value.id);
        };
      }),
  );
  return { key, id };
}

async function setting<T>(page: Page, key: string): Promise<T | undefined> {
  return page.evaluate(
    (key) =>
      new Promise<T | undefined>((ok) => {
        const open = indexedDB.open('arvid');
        open.onsuccess = () => {
          const get = open.result.transaction('settings').objectStore('settings').get(key);
          get.onsuccess = () => ok(get.result?.value);
        };
      }),
    key,
  );
}

test('2.0 de principio a fin: amistad, reto con invitación, marcador, final y eliminar', async ({ browser }) => {
  test.setTimeout(180_000);
  const hector = await newPhone(await browser.newContext(), 'Hector');
  const ariti = await newPhone(await browser.newContext(), 'Ariti');
  const h = await createAccount(hector);
  await createAccount(ariti);

  // Amistad por enlace (AM-02): Ariti abre el enlace de Hector y acepta
  await ariti.goto(`/a/${h.id}`);
  await expect(ariti.getByRole('heading', { name: 'Hector quiere ser tu amigo' })).toBeVisible();
  await ariti.getByRole('button', { name: 'Aceptar' }).click();
  await expect(ariti.getByRole('heading', { name: 'Ahora sois amigos: tú y Hector' })).toBeVisible();
  expect(pushes).toContainEqual(expect.objectContaining({ to: h.id, type: 'friend-accepted', alias: 'Ariti' }));
  await hector.goto('/perfil/amigos');
  await expect(hector.getByRole('link', { name: /Ariti/ })).toBeVisible();

  // Hector crea un reto cooperativo de 3 días e invita a Ariti al crearlo (IN-11)
  await hector.goto('/retos/nuevo');
  await hector.getByLabel('Actividad').fill('Leer');
  await hector.getByRole('spinbutton', { name: 'Días (de 3 a 60)' }).fill('3');
  await hector.getByRole('checkbox', { name: /Ariti/ }).check();
  await hector.getByRole('button', { name: 'Crear reto e invitar (1)' }).click();
  await expect(hector.getByRole('heading', { name: 'Leer' })).toBeVisible();
  expect(pushes).toContainEqual(expect.objectContaining({ type: 'challenge-invite', alias: 'Hector', name: 'Leer' }));

  // A Ariti le aparece en Hoy al abrir la app (IN-14); acepta, elige el área y entra
  await ariti.goto('/hoy');
  await expect(ariti.getByRole('heading', { name: 'Hector te invita a «Leer»' })).toBeVisible({ timeout: 10_000 });
  await ariti.getByRole('button', { name: 'Aceptar' }).click();
  await ariti.getByRole('button', { name: 'Unirme' }).click();
  await expect(ariti.getByRole('heading', { name: 'Leer' })).toBeVisible();

  // Los dos marcan hoy desde Hoy (SY-02); el marcador lo refleja en el otro teléfono
  for (const page of [hector, ariti]) {
    await page.goto('/hoy');
    await expect(page.getByText('Reto · día 1 de 3')).toBeVisible();
    await page.getByRole('button', { name: 'Registrar Leer' }).click();
    await page.waitForTimeout(3000); // la marca sale a los 2 s
  }
  await hector.goto(`/objetivos`);
  await hector.getByRole('link', { name: /Leer/ }).click();
  await expect(hector.getByText('Llevamos 2 de 5 días necesarios')).toBeVisible({ timeout: 10_000 });
  await expect(hector.getByText('Hoy ✓')).toHaveCount(2);

  // El final (FN): 6 días después, ya con el resultado; cuenta en Retos cumplidos solo si se logró
  const later = Date.now() + 6 * 86_400_000;
  await hector.clock.install({ time: later });
  await hector.goto('/objetivos');
  await hector.getByRole('link', { name: /Leer/ }).click();
  await expect(hector.getByRole('heading', { name: 'Esta vez no: llegasteis al 33 %' })).toBeVisible();
  await hector.goto('/perfil');
  await expect(hector.getByRole('heading', { name: 'Retos cumplidos · 0' })).toBeVisible();
  // FN-05: el compañero lo celebra una vez al abrir Hoy
  await hector.goto('/hoy');
  await expect.poll(() => setting<string[]>(hector, 'challengesCelebrated'), { timeout: 10_000 }).toHaveLength(1);

  // Eliminar el reto terminado (D-189): sale de la lista y su actividad se borra
  await hector.goto('/objetivos');
  await hector.getByRole('link', { name: /Leer/ }).click();
  await hector.getByRole('button', { name: 'Eliminar reto' }).click();
  await hector.getByRole('dialog').getByRole('button', { name: 'Eliminar reto' }).click();
  await expect(hector).toHaveURL(/\/objetivos$/);
  await expect(hector.getByRole('link', { name: /Leer/ })).toHaveCount(0);
  await hector.goto('/actividades');
  await expect(hector.getByText('Leer')).toHaveCount(0);
});

test('copia en la nube: entrar con la clave en otro teléfono y conflicto entre los dos', async ({ browser }) => {
  test.setTimeout(120_000);
  const first = await newPhone(await browser.newContext(), 'Hector');
  const { key } = await createAccount(first);

  // Otro teléfono entra con la clave (RC-04): sustituye sus datos por los de la cuenta
  const second = await newPhone(await browser.newContext(), 'Otro');
  await second.goto('/ajustes');
  await second.getByRole('button', { name: 'Ya tengo cuenta' }).click();
  await second.getByRole('textbox', { name: 'Clave de recuperación' }).fill(key);
  await second.getByRole('button', { name: 'Entrar con la clave' }).click();
  // Solo pregunta si este teléfono ya tenía actividades o misiones
  await second.getByRole('button', { name: 'Sustituir por mi cuenta' }).click({ timeout: 3000 }).catch(() => undefined);
  await expect(second.getByText(/Listo: (tu progreso está en este dispositivo|has entrado)/)).toBeVisible();
  await second.getByRole('dialog').getByRole('button', { name: 'Continuar' }).click();

  // El segundo sube primero; el primero, con su copia anterior, recibe el aviso de conflicto (CP-05)
  await second.getByRole('button', { name: 'Subir ahora' }).click();
  await expect(second.getByText(/Copia al día/)).toBeVisible();
  await first.goto('/ajustes');
  await first.getByRole('button', { name: 'Subir ahora' }).click();
  await expect(first.getByText('Otro dispositivo subió una copia más nueva')).toBeVisible();
  await first.getByRole('button', { name: 'Usar la de la nube' }).click();
  await expect(first.getByText(/Copia al día/)).toBeVisible();
});
