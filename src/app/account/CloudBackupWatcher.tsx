// Copia en la nube automática (spec 14, CP-02): unos 30 s después del último cambio, al pasar la app a segundo plano
// y al abrirla si quedó algo pendiente. Sin conexión queda pendiente y sube al volver.
import Dexie from 'dexie';
import { useEffect, useRef } from 'react';
import { useData, useSettings } from '../data';
import { setCloud, uploadBackup, useCloud } from './account';

export const UPLOAD_DELAY_MS = 30_000;

export function CloudBackupWatcher() {
  const ctx = useData();
  const account = useSettings()?.account;
  const cloud = useCloud();
  const latest = useRef({ ctx, account, cloud });
  useEffect(() => {
    latest.current = { ctx, account, cloud };
  });

  useEffect(() => {
    if (!account) return;
    let timer: number | undefined;
    const upload = () => {
      window.clearTimeout(timer);
      const { ctx: c, account: a, cloud: s } = latest.current;
      if (a && s.dirty && !s.conflict) void uploadBackup(c, a);
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(upload, UPLOAD_DELAY_MS);
    };
    // Cualquier cambio en la base de datos marca la copia como pendiente
    const onChange = () => {
      if (latest.current.cloud.uploading) return;
      setCloud({ dirty: true });
      schedule();
    };
    Dexie.on('storagemutated', onChange);
    const onHide = () => document.hidden && upload();
    const onOnline = () => upload();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('online', onOnline);
    // Al abrir la app, lo que quedó pendiente
    if (latest.current.cloud.dirty) schedule();
    return () => {
      window.clearTimeout(timer);
      Dexie.on('storagemutated').unsubscribe(onChange);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('online', onOnline);
    };
  }, [account]);

  return null;
}
