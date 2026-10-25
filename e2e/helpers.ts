import { expect, type Page } from '@playwright/test';

/** Pasa el diálogo de ARVID con "Saltar" si sigue escribiendo (spec 06, ON-04). */
export async function skipDialogue(page: Page) {
  await page.getByRole('button', { name: 'Saltar' }).click({ timeout: 1500 }).catch(() => undefined);
}

/** Paso de las notificaciones (spec 10, NT-02): «Ahora no», o «Continuar» si el navegador no las admite. */
export async function skipNotifications(page: Page) {
  await page.getByRole('button', { name: 'Ahora no' }).or(page.getByRole('button', { name: 'Continuar' })).first().click();
  await skipDialogue(page);
}

/** Onboarding con ARVID (spec 06, ON-02) hasta el paso de áreas de vida. */
export async function onboardingToCategories(page: Page, alias = 'Prueba', ai = false, companion: 'ARVID' | 'DARIS' = 'ARVID') {
  await page.goto('/');
  await skipDialogue(page);
  await page.getByRole('button', { name: 'Continuar' }).click(); // idioma
  await skipDialogue(page);
  if (companion === 'DARIS') await page.getByRole('radio', { name: /DARIS/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click(); // compañero (spec 08)
  await skipDialogue(page);
  await page.getByRole('button', { name: 'Empezar' }).click();
  await skipDialogue(page);
  await page.getByLabel('Tu nombre o alias').fill(alias);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await skipDialogue(page);
  await page.getByRole('radio', { name: 'Prefiero no decirlo' }).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await skipDialogue(page);
  await page.getByRole('button', { name: 'Continuar' }).click(); // personaje
  await skipDialogue(page);
  await page.getByRole('button', { name: 'Continuar' }).click(); // color de ARVID
  await skipDialogue(page);
  // D-100: el código de acceso se puede escribir en el mismo paso
  if (ai) await page.getByLabel('Código de acceso').fill('ARVID-PRUEBA-AAAAAAAAAA');
  await page.getByRole('button', { name: ai ? 'Activar' : 'Ahora no' }).click(); // permiso para la IA
  await skipDialogue(page);
  await skipNotifications(page);
  await expect(page.getByRole('heading', { name: 'Tus áreas de vida' })).toBeVisible();
}

/** Tras las áreas de vida: instalar (solo iPhone sin instalar) y "Ir a Hoy". */
export async function finishOnboarding(page: Page) {
  await skipDialogue(page);
  const understood = page.getByRole('button', { name: 'Entendido' });
  if (await understood.isVisible()) {
    await understood.click();
    await skipDialogue(page);
  }
  await page.getByRole('button', { name: 'Ir a Hoy' }).click();
  await expect(page).toHaveURL(/\/hoy$/);
}

export async function completeOnboarding(page: Page, { ai = false, companion = 'ARVID' as 'ARVID' | 'DARIS' } = {}) {
  await onboardingToCategories(page, 'Prueba', ai, companion);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await finishOnboarding(page);
}

export interface NewActivity {
  name: string;
  period?: 'Diaria' | 'Semanal' | 'Mensual';
  target?: number;
  category?: string;
  difficulty?: 'Fácil' | 'Media' | 'Difícil';
}

export async function createActivity(page: Page, a: NewActivity) {
  await page.goto('/actividades/nueva');
  await page.getByLabel('Nombre').fill(a.name);
  if (a.category) await page.getByLabel(a.category, { exact: true }).check();
  if (a.period) await page.getByLabel(a.period, { exact: true }).check();
  if (a.target) await page.getByLabel(/^Veces por/).fill(String(a.target));
  if (a.difficulty) await page.getByLabel(new RegExp(`^${a.difficulty}`)).check();
  await page.getByRole('button', { name: 'Crear actividad' }).click();
  await expect(page).toHaveURL(/\/hoy$/);
}

export function row(page: Page, name: string) {
  return page.getByRole('listitem').filter({ has: page.getByRole('link', { name, exact: true }) });
}
