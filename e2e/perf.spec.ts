import { readFile, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { asLocalDate } from '../src/domain/time/localDate';
import { yearData } from '../src/domain/testing/yearData';
import { completeOnboarding, row } from './helpers';

// Spec 07, RE-02: con un año de datos importado, Hoy se puede usar en ≤ 2 s tras la carga.
test('RE-02: Hoy con un año de datos se puede usar en ≤ 2 s', async ({ page }, testInfo) => {
  test.slow();
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }),
  );
  await completeOnboarding(page);

  // Se parte de un backup real (categorías y ajustes de este dispositivo) y se le añade el año de datos
  await page.goto('/ajustes');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar copia' }).click();
  const backup = JSON.parse(await readFile((await (await downloadPromise).path())!, 'utf8'));
  const today = asLocalDate(new Date().toISOString().slice(0, 10));
  const categoryIds = backup.data.categories
    .filter((c: { active: boolean }) => c.active)
    .map((c: { id: string }) => c.id);
  const { records, missions } = yearData(today, categoryIds);
  Object.assign(backup.data, {
    activities: records.map((r) => r.activity),
    activityVersions: records.flatMap((r) => r.versions),
    activityStatusEvents: records.flatMap((r) => r.events),
    completions: records.flatMap((r) => r.completions),
    missions: missions.map((m) => m.mission),
    missionEvents: missions.flatMap((m) => m.events),
  });
  const file = testInfo.outputPath('year.json');
  await writeFile(file, JSON.stringify(backup));

  await page.getByLabel('Archivo de copia de seguridad').setInputFiles(file);
  await page
    .getByRole('alertdialog', { name: '¿Reemplazar tus datos?' })
    .getByRole('button', { name: 'Reemplazar' })
    .click();
  await expect(page.getByText('Datos importados.')).toBeVisible();

  const start = Date.now();
  await page.goto('/hoy');
  await expect(
    row(page, 'Caminar')
      .getByRole('button', { name: /Registrar Caminar|Deshacer/ })
      .first(),
  ).toBeEnabled();
  const elapsed = Date.now() - start;
  testInfo.annotations.push({ type: 'RE-02', description: `Hoy usable en ${elapsed} ms` });
  expect(elapsed).toBeLessThanOrEqual(2000);

  // El resto de la app también responde con esos datos
  await page.goto('/perfil');
  await expect(page.getByRole('heading', { name: 'Logros' })).toBeVisible();
});
