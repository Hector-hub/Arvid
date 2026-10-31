import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createActivity, skipDialogue } from './helpers';

// Spec 07, AC-01: axe (WCAG 2.1 A y AA) en todas las pantallas, en español e inglés. Sin infracciones serias ni
// críticas; las moderadas o menores también se corrigen o se justifican en tests.md.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

interface Finding {
  screen: string;
  id: string;
  impact: string;
  nodes: string[];
}

async function audit(page: Page, screen: string, found: Finding[]) {
  // Sin animaciones a medias (la escena y los diálogos ya usan movimiento reducido en los E2E)
  await page.waitForTimeout(300);
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  for (const v of violations) {
    found.push({ screen, id: v.id, impact: v.impact ?? '—', nodes: v.nodes.map((n) => n.target.join(' ')) });
  }
}

function report(found: Finding[]) {
  return found.map((f) => `[${f.impact}] ${f.screen}: ${f.id} → ${f.nodes.slice(0, 3).join(' | ')}`).join('\n');
}

/** Onboarding paso a paso (cada pantalla del asistente). */
async function auditOnboarding(page: Page, found: Finding[]) {
  await page.goto('/');
  const steps: [string, () => Promise<void>][] = [
    ['onboarding · idioma', () => page.getByRole('button', { name: 'Continuar' }).click()],
    ['onboarding · compañero', () => page.getByRole('button', { name: 'Continuar' }).click()],
    ['onboarding · bienvenida', () => page.getByRole('button', { name: 'Empezar' }).click()],
    [
      'onboarding · alias',
      async () => {
        await page.getByLabel('Tu nombre o alias').fill('Prueba');
        await page.getByRole('button', { name: 'Continuar' }).click();
      },
    ],
    [
      'onboarding · guarda tu progreso',
      async () => {
        await page.getByRole('button', { name: 'Ahora no' }).click();
      },
    ],
    [
      'onboarding · género',
      async () => {
        await page.getByRole('radio', { name: 'Prefiero no decirlo' }).check();
        await page.getByRole('button', { name: 'Continuar' }).click();
      },
    ],
    ['onboarding · personaje', () => page.getByRole('button', { name: 'Continuar' }).click()],
    ['onboarding · color de ARVID', () => page.getByRole('button', { name: 'Continuar' }).click()],
    ['onboarding · IA', () => page.getByRole('button', { name: 'Ahora no' }).click()],
    ['onboarding · notificaciones', () => page.getByRole('button', { name: 'Ahora no' }).or(page.getByRole('button', { name: 'Continuar' })).first().click()],
    ['onboarding · áreas de vida', () => page.getByRole('button', { name: 'Continuar' }).click()],
  ];
  for (const [name, next] of steps) {
    await skipDialogue(page);
    await audit(page, name, found);
    await next();
  }
  await skipDialogue(page);
  const understood = page.getByRole('button', { name: 'Entendido' });
  if (await understood.isVisible()) {
    await audit(page, 'onboarding · instalar', found);
    await understood.click();
    await skipDialogue(page);
  }
  await audit(page, 'onboarding · listo', found);
  await page.getByRole('button', { name: 'Ir a Hoy' }).click();
  await expect(page).toHaveURL(/\/hoy$/);
}

async function auditApp(page: Page, found: Finding[], lang: string) {
  const screens: [string, string][] = [
    ['Hoy', '/hoy'],
    ['Actividades', '/actividades'],
    ['Nueva actividad', '/actividades/nueva'],
    ['Misiones', '/actividades/misiones'],
    ['Nueva misión', '/actividades/misiones/nueva'],
    ['Perfil', '/perfil'],
    ['Disciplina', '/perfil/disciplina'],
    ['Ajustes', '/ajustes'],
    ['Ajustes · Perfil', '/ajustes/perfil'],
    ['Ajustes · Cuenta', '/ajustes/cuenta'],
    ['Ajustes · Categorías', '/ajustes/categorias'],
    ['Instalar', '/ajustes/instalar'],
    ['Créditos', '/ajustes/creditos'],
    ['Nueva categoría', '/ajustes/categorias/nueva'],
  ];
  for (const [name, path] of screens) {
    await page.goto(path);
    await page.locator('main').waitFor();
    await audit(page, `${lang} · ${name}`, found);
  }
  // Detalle de actividad y de misión, y la hoja de un logro
  await page.goto('/actividades');
  await page.getByRole('link', { name: /^Caminar/ }).click();
  await audit(page, `${lang} · Detalle de actividad`, found);
  await page.goto('/actividades/misiones');
  await page.getByRole('link', { name: /Pedir cita/ }).click();
  await audit(page, `${lang} · Detalle de misión`, found);
  await page.goto('/perfil');
  await page.locator('.badge-cell').first().click();
  await audit(page, `${lang} · Hoja de logro`, found);
}

test.describe('accesibilidad (spec 07, AC-01)', () => {
  test.slow();

  test('axe en todas las pantallas, en español e inglés', async ({ page }) => {
    const found: Finding[] = [];
    await auditOnboarding(page, found);
    await createActivity(page, { name: 'Caminar', category: 'Cuerpo' });
    await page.goto('/actividades/misiones/nueva');
    await page.getByLabel('Título').fill('Pedir cita');
    await page.getByRole('button', { name: 'Crear misión' }).click();
    await expect(page).toHaveURL(/\/actividades\/misiones$/);
    await auditApp(page, found, 'es');

    await page.goto('/ajustes/perfil');
    await page.getByText('Alias, idioma e IA').click();
    await page.getByRole('radio', { name: 'English' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await auditApp(page, found, 'en');

    console.log(report(found) || 'axe: sin infracciones');
    expect(report(found.filter((f) => f.impact === 'serious' || f.impact === 'critical'))).toBe('');
  });
});
