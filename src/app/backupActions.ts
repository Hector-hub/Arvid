import { backupFileName, buildBackup, type BackupError } from '../data/backup';
import { saveSetting, type DataContext } from '../data/repository';
import { t } from '../i18n';

export type ExportResult = 'shared' | 'downloaded' | 'cancelled';

/** Exporta el backup con la hoja de compartir si el navegador admite archivos; si no, lo descarga (BAK-01 a BAK-03). */
export async function exportData(ctx: DataContext): Promise<ExportResult> {
  const now = ctx.now();
  const backup = await buildBackup(ctx.db, __APP_VERSION__, now);
  const file = new File([JSON.stringify(backup, null, 2)], backupFileName(now), { type: 'application/json' });
  const markDone = () => saveSetting(ctx.db, 'lastBackupAt', now.toISOString());

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: t('backup.shareTitle') });
      await markDone();
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Cualquier otro fallo: se recurre a la descarga.
    }
  }
  download(file);
  await markDone();
  return 'downloaded';
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function backupErrorText(error: BackupError): string {
  switch (error.code) {
    case 'invalid-json':
      return t('backup.errInvalidJson');
    case 'not-arvid':
      return t('backup.errNotArvid');
    case 'too-new':
      return t('backup.errTooNew');
    case 'invalid':
      return t('backup.errInvalid', { detail: error.detail });
    case 'broken-references':
      return t('backup.errBroken', { detail: error.detail });
  }
}
