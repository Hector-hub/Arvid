import { describe, expect, it } from 'vitest';
import { shouldRemindBackup } from './backupReminder';
import { activity, d } from './testing/fixtures';

describe('recordatorio de backup (BAK-07)', () => {
  const r = activity('caminar', { period: 'day', target: 1, createdOn: '2026-10-01', logs: ['2026-10-10'] });
  const at = (iso: string) => ({ now: new Date(iso), today: d(iso.slice(0, 10)) });

  it('sin actividades no avisa', () => {
    expect(shouldRemindBackup({ records: [], ...at('2026-10-20T10:00:00Z') })).toBe(false);
  });

  it('sin backup: avisa cuando el primer dato tiene 7 días', () => {
    expect(shouldRemindBackup({ records: [r], ...at('2026-10-07T10:00:00Z') })).toBe(false);
    expect(shouldRemindBackup({ records: [r], ...at('2026-10-08T10:00:00Z') })).toBe(true);
  });

  it('ejemplo spec §6: backup hace 8 días y un registro posterior → avisa', () => {
    expect(shouldRemindBackup({ records: [r], lastBackupAt: '2026-10-05T10:00:00.000Z', ...at('2026-10-13T10:00:00Z') })).toBe(true);
  });

  it('sin cambios desde el backup no avisa', () => {
    expect(shouldRemindBackup({ records: [r], lastBackupAt: '2026-10-11T10:00:00.000Z', ...at('2026-10-25T10:00:00Z') })).toBe(false);
  });

  it('"Más tarde" lo pospone hasta mañana', () => {
    const base = { records: [r], lastBackupAt: '2026-10-05T10:00:00.000Z', snoozedUntil: '2026-10-14' };
    expect(shouldRemindBackup({ ...base, ...at('2026-10-13T10:00:00Z') })).toBe(false);
    expect(shouldRemindBackup({ ...base, ...at('2026-10-14T10:00:00Z') })).toBe(true);
  });
});
