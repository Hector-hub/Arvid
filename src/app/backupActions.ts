import { backupFileName, buildBackup, type BackupError } from '../data/backup';
import { saveSetting, type DataContext } from '../data/repository';

export type ExportResult = 'shared' | 'downloaded' | 'cancelled';

/** Exporta el backup con la hoja de compartir si el navegador admite archivos; si no, lo descarga (BAK-01 a BAK-03). */
export async function exportData(ctx: DataContext): Promise<ExportResult> {
  const now = ctx.now();
  const backup = await buildBackup(ctx.db, __APP_VERSION__, now);
  const file = new File([JSON.stringify(backup, null, 2)], backupFileName(now), { type: 'application/json' });
  const markDone = () => saveSetting(ctx.db, 'lastBackupAt', now.toISOString());

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Copia de seguridad de ARVID' });
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
      return 'El archivo no es un JSON válido.';
    case 'not-arvid':
      return 'Este archivo no es una copia de seguridad de ARVID.';
    case 'too-new':
      return 'Este archivo es de una versión más nueva de ARVID. Actualiza la app.';
    case 'invalid':
      return `El archivo está dañado (${error.detail}).`;
    case 'broken-references':
      return `El archivo está incompleto (${error.detail}).`;
  }
}
