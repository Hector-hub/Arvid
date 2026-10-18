import { expect, type Page } from '@playwright/test';

export async function completeOnboarding(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Empezar' }).click();
  await chooseDefaultAvatar(page);
  await page.getByRole('button', { name: 'Continuar' }).click();
  const later = page.getByRole('button', { name: 'Más tarde' });
  if (await later.waitFor({ state: 'visible', timeout: 1500 }).then(() => true, () => false)) await later.click();
  await expect(page).toHaveURL(/\/hoy$/);
}

/** Paso "Elige tu protagonista" del onboarding (spec 05, PRO-02): se acepta la opción preseleccionada. */
export async function chooseDefaultAvatar(page: Page) {
  await expect(page.getByRole('heading', { name: 'Elige tu protagonista' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { name: 'Tus áreas de vida' })).toBeVisible();
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
