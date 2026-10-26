// Notificaciones en la app (spec 10): permiso, suscripción Web Push, lista de avisos en el servidor y badge.
// Al servidor solo van horas e identificadores opacos (PV-01).
import { loadMissions } from '../../data/missions';
import { DEFAULT_NOTIFICATIONS, loadRecords, loadSettings, saveSetting, type NotificationSettings } from '../../data/repository';
import type { ArvidDB } from '../../data/db';
import { buildDigest } from '../../domain/notifications/digest';
import { missionReminders, upcomingReminders } from '../../domain/notifications/schedule';
import { isIOS, isStandalone } from '../../pwa/platform';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/** `install`: iPhone sin instalar (NT-03); `unsupported`: navegador sin Web Push (NT-04). */
export type PushSupport = 'ok' | 'install' | 'unsupported';

export function pushSupport(): PushSupport {
  if (typeof window === 'undefined' || !VAPID_PUBLIC_KEY) return 'unsupported';
  if (isIOS() && !isStandalone()) return 'install';
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window ? 'ok' : 'unsupported';
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

async function post(body: unknown): Promise<boolean> {
  try {
    const res = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.ok;
  } catch {
    return false;
  }
}

export function currentNotifications(saved: NotificationSettings | undefined): NotificationSettings {
  return { ...DEFAULT_NOTIFICATIONS, deviceId: '', ...saved };
}

/** Activa las notificaciones de este dispositivo (NT-01): `denied` si no hay permiso. */
export async function enablePush(db: ArvidDB): Promise<'ok' | 'denied' | 'error'> {
  if (pushSupport() !== 'ok') return 'error';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  try {
    const registration = await navigator.serviceWorker.ready;
    await (
      (await registration.pushManager.getSubscription()) ??
      registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY!) })
    );
    const settings = currentNotifications((await loadSettings(db)).notifications);
    await saveSetting(db, 'notifications', { ...settings, enabled: true, deviceId: settings.deviceId || crypto.randomUUID() });
    return (await syncPush(db)) ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

/** Las desactiva: baja en el servidor y en el navegador, y quita el número del icono. */
export async function disablePush(db: ArvidDB): Promise<void> {
  const settings = currentNotifications((await loadSettings(db)).notifications);
  await saveSetting(db, 'notifications', { ...settings, enabled: false });
  if (settings.deviceId) await post({ deviceId: settings.deviceId, remove: true });
  const registration = await navigator.serviceWorker?.getRegistration();
  await (await registration?.pushManager.getSubscription())?.unsubscribe().catch(() => undefined);
  await navigator.clearAppBadge?.().catch(() => undefined);
}

/** Sube al servidor las horas de los resúmenes y los recordatorios de los próximos 7 días (PV-04). */
export async function syncPush(db: ArvidDB, now = new Date()): Promise<boolean> {
  const settings = (await loadSettings(db)).notifications;
  if (!settings?.enabled || !settings.deviceId || pushSupport() !== 'ok') return false;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return false;
  const [records, missions] = await Promise.all([loadRecords(db), loadMissions(db)]);
  const reminders = [...upcomingReminders(records, now), ...missionReminders(missions, now)].sort((a, b) => a.at.localeCompare(b.at));
  return post({
    deviceId: settings.deviceId,
    subscription: subscription.toJSON(),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    morning: settings.morning,
    night: settings.night,
    reminders,
  });
}

/** Número de pendientes de hoy en el icono (BG-01, BG-02); sin notificaciones o desactivado, se quita. */
export async function updateBadge(db: ArvidDB, now = new Date()): Promise<void> {
  if (!('setAppBadge' in navigator)) return;
  const settings = (await loadSettings(db)).notifications;
  if (!settings?.enabled || !settings.badge) {
    await navigator.clearAppBadge().catch(() => undefined);
    return;
  }
  const [records, missions] = await Promise.all([loadRecords(db), loadMissions(db)]);
  const { badge } = buildDigest({ records, missions, now, kind: 'night' });
  await (badge ? navigator.setAppBadge(badge) : navigator.clearAppBadge()).catch(() => undefined);
}
