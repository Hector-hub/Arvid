import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analyze } from '../domain/progress/progress';
import { addDays, asLocalDate, toLocalDate, type LocalDate } from '../domain/time/localDate';
import { backupFileName, buildBackup, deleteAllData, parseBackup, replaceAllData, type Backup } from './backup';
import { ArvidDB } from './db';
import {
  createActivity,
  ensureSeed,
  loadCategories,
  loadRecords,
  loadSettings,
  logCompletion,
  saveSetting,
  type DataContext,
} from './repository';

let db: ArvidDB;
let ctx: DataContext;
let n = 0;

beforeEach(async () => {
  db = new ArvidDB(`backup-${++n}`);
  let id = 0;
  ctx = { db, now: () => new Date('2026-10-14T10:00:00'), newId: () => `id-${++id}` };
  await ensureSeed(ctx);
});

afterEach(async () => {
  await db.delete();
});

async function seedActivity() {
  const categoryId = (await loadCategories(db))[0]!.id;
  const id = await createActivity(ctx, { name: 'Caminar', config: { period: 'day', target: 1, difficulty: 'medium', categoryId } });
  await logCompletion(ctx, id, asLocalDate('2026-10-14'));
  await saveSetting(db, 'persistGranted', true);
  await saveSetting(db, 'reducedMotion', 'on');
  return id;
}

async function exported(): Promise<Backup> {
  return JSON.parse(JSON.stringify(await buildBackup(db, '0.2.0', ctx.now())));
}

describe('exportar (BAK-01)', () => {
  it('incluye todas las tablas, versiones y no los ajustes del dispositivo', async () => {
    await seedActivity();
    const b = await exported();
    expect(b).toMatchObject({ format: 'arvid-backup', formatVersion: 1, schemaVersion: 2, appVersion: '0.2.0' });
    expect(Object.keys(b.data).sort()).toEqual(
      ['achievements', 'activities', 'activityStatusEvents', 'activityVersions', 'categories', 'completions', 'missionEvents', 'missions', 'rests', 'settings'].sort(),
    );
    expect(b.data.completions).toHaveLength(1);
    expect(b.data.settings.map((s) => s.key)).toContain('reducedMotion');
    expect(b.data.settings.map((s) => s.key)).not.toContain('persistGranted');
    expect(parseBackup(JSON.stringify(b)).ok).toBe(true);
  });

  it('nombre del archivo con la fecha local', () => {
    expect(backupFileName(new Date('2026-10-14T23:30:00'))).toBe('arvid-backup-2026-10-14.json');
  });
});

describe('validar (BAK-04)', () => {
  it('rechaza JSON inválido, otro formato y versiones futuras', async () => {
    await seedActivity();
    const b = await exported();
    expect(parseBackup('{no es json')).toEqual({ ok: false, error: { code: 'invalid-json' } });
    expect(parseBackup(JSON.stringify({ hola: 1 }))).toEqual({ ok: false, error: { code: 'not-arvid' } });
    expect(parseBackup(JSON.stringify({ ...b, formatVersion: 2 }))).toEqual({ ok: false, error: { code: 'too-new' } });
    expect(parseBackup(JSON.stringify({ ...b, schemaVersion: 99 }))).toEqual({ ok: false, error: { code: 'too-new' } });
  });

  it('rechaza tipos incorrectos con el detalle', async () => {
    await seedActivity();
    const b = await exported();
    b.data.completions[0]!.date = '2026-02-30' as LocalDate; // fecha imposible
    const result = parseBackup(JSON.stringify(b));
    expect(result).toMatchObject({ ok: false, error: { code: 'invalid' } });
    expect(!result.ok && result.error.code === 'invalid' && result.error.detail).toContain('data.completions.0.date');
  });

  it('rechaza referencias rotas e IDs duplicados', async () => {
    await seedActivity();
    const orphan = await exported();
    orphan.data.completions[0]!.activityId = 'no-existe';
    expect(parseBackup(JSON.stringify(orphan))).toMatchObject({ ok: false, error: { code: 'broken-references' } });
    const dup = await exported();
    dup.data.categories.push({ ...dup.data.categories[0]! });
    expect(parseBackup(JSON.stringify(dup))).toMatchObject({ ok: false, error: { code: 'broken-references' } });
  });

  it('resumen para la confirmación (BAK-05)', async () => {
    await seedActivity();
    const result = parseBackup(JSON.stringify(await exported()));
    expect(result.ok && result.summary).toMatchObject({ activities: 1, completions: 1, appVersion: '0.2.0' });
  });

  it('NFR2-02: valida un archivo de ~5 MB en menos de 1 s', async () => {
    await seedActivity();
    const b = await exported();
    const template = b.data.completions[0]!;
    b.data.completions = Array.from({ length: 46_000 }, (_, i) => ({
      ...template,
      id: `c-${i}`,
      date: addDays(asLocalDate('2020-01-01'), i % 2000),
    }));
    const text = JSON.stringify(b);
    expect(text.length).toBeGreaterThan(4_500_000);
    const start = performance.now();
    expect(parseBackup(text).ok).toBe(true);
    expect(performance.now() - start).toBeLessThan(1000);
  });
});

describe('reemplazar (BAK-06) y NFR2-03', () => {
  it('ida y vuelta: mismo estado derivado; conserva los ajustes del dispositivo', async () => {
    await seedActivity();
    const today = toLocalDate(ctx.now());
    const before = analyze(await loadRecords(db), today);
    const backup = await exported();

    await deleteAllData(ctx);
    await saveSetting(db, 'persistGranted', false);
    const parsed = parseBackup(JSON.stringify(backup));
    if (!parsed.ok) throw new Error('backup inválido');
    await replaceAllData(ctx, parsed.backup);

    const after = analyze(await loadRecords(db), today);
    expect(after.progress).toEqual(before.progress);
    expect([...after.byActivity.values()].map((a) => a.streak)).toEqual([...before.byActivity.values()].map((a) => a.streak));
    const settings = await loadSettings(db);
    expect(settings).toMatchObject({ persistGranted: false, reducedMotion: 'on', lastCelebratedLevel: 1, lastBackupAt: backup.exportedAt });
  });

  it('importar dos veces da el mismo resultado', async () => {
    await seedActivity();
    const parsed = parseBackup(JSON.stringify(await exported()));
    if (!parsed.ok) throw new Error();
    await replaceAllData(ctx, parsed.backup);
    await replaceAllData(ctx, parsed.backup);
    expect(await db.completions.count()).toBe(1);
    expect(await db.activities.count()).toBe(1);
  });

  it('si la escritura falla a mitad, los datos anteriores quedan intactos', async () => {
    await seedActivity();
    const parsed = parseBackup(JSON.stringify(await exported()));
    if (!parsed.ok) throw new Error();
    // El archivo trae otra actividad; la escritura de registros falla.
    parsed.backup.data.activities[0]!.name = 'Otra';
    const spy = vi.spyOn(db.completions, 'bulkAdd').mockRejectedValueOnce(new Error('disco lleno'));
    await expect(replaceAllData(ctx, parsed.backup)).rejects.toThrow('disco lleno');
    spy.mockRestore();
    const records = await loadRecords(db);
    expect(records.map((r) => r.activity.name)).toEqual(['Caminar']);
    expect(records[0]!.completions).toHaveLength(1);
  });
});

describe('eliminar todo (DEL-01)', () => {
  it('borra todo y vuelve a sembrar las categorías', async () => {
    await seedActivity();
    await saveSetting(db, 'onboardingCompletedAt', '2026-10-01T00:00:00.000Z');
    await deleteAllData(ctx);
    expect(await db.activities.count()).toBe(0);
    expect(await db.completions.count()).toBe(0);
    expect((await loadSettings(db)).onboardingCompletedAt).toBeUndefined();
    expect(await db.categories.count()).toBe(6);
  });
});
