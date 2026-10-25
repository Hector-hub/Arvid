// Envío de las notificaciones (spec 10, D-108): manda a cada dispositivo los avisos cuyo instante pasó desde la
// ejecución anterior. Lo ejecutan dos funciones programadas: push-send-day y push-send-night. El aviso va casi vacío (tipo, referencia opaca e instante): el texto lo escribe
// el service worker con los datos del dispositivo (PV-02).
import { getStore } from '@netlify/blobs';
import webpush from 'web-push';
import { dueEvents, PUSH_TTL_S, STALE_MS, type DeviceEntry } from './push.mts';

export async function sendDuePushes(): Promise<void> {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;
  webpush.setVapidDetails('https://arvid-app.netlify.app', publicKey, privateKey);

  const store = getStore('push');
  const now = new Date();
  const { blobs } = await store.list();
  for (const { key } of blobs) {
    const entry = (await store.get(key, { type: 'json' }).catch(() => null)) as DeviceEntry | null;
    if (!entry) continue;
    if (now.getTime() - new Date(entry.updatedAt).getTime() > STALE_MS) {
      await store.delete(key);
      continue;
    }
    let gone = false;
    for (const event of dueEvents(entry, now)) {
      try {
        await webpush.sendNotification(entry.subscription, JSON.stringify(event), { TTL: PUSH_TTL_S, urgency: 'normal' });
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // Suscripción caducada o anulada: se borra el dispositivo
        if (status === 404 || status === 410) {
          gone = true;
          break;
        }
        console.error(`push ${status ?? '?'}`);
      }
    }
    if (gone) await store.delete(key);
    else
      await store.setJSON(key, {
        ...entry,
        sentUpTo: now.toISOString(),
        reminders: entry.reminders.filter((r) => new Date(r.at) > now),
      } satisfies DeviceEntry);
  }
}
