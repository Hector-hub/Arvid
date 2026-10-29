// Amigos en la app (spec 15, §3.1 y EN): llamadas a /api/social con la sesión de la cuenta y los enlaces.
import { DEFAULT_SOCIAL_NOTIFICATIONS, type SocialNotifications } from '../../data/repository';
import { AccountError, type DeviceAccount } from '../account/account';

export interface FriendCard {
  id: string;
  alias: string;
  level: number;
}

export interface FriendsList {
  friends: (FriendCard & { since?: string; together: number })[];
  requests: FriendCard[];
  blocked: FriendCard[];
}

export interface LinkProfile extends FriendCard {
  self?: boolean;
  friend?: boolean;
}

export async function social<T>(account: Pick<DeviceAccount, 'session'>, method: string, route: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/social/${route}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${account.session}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AccountError('offline');
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new AccountError(String(data.error ?? 'failed'), res.status, data);
  return data as T;
}

export const loadFriends = (a: DeviceAccount) => social<FriendsList>(a, 'GET', 'friends');
export const linkProfile = (a: DeviceAccount, id: string) => social<LinkProfile>(a, 'GET', `profile/${encodeURIComponent(id)}`);
export const acceptLink = (a: DeviceAccount, id: string) => social(a, 'POST', 'accept', { id });
export const requestFriend = (a: DeviceAccount, id: string) => social<{ friend: boolean }>(a, 'POST', 'request', { id });
export const respondRequest = (a: DeviceAccount, id: string, accept: boolean) => social(a, 'POST', 'respond', { id, accept });
export const removeFriend = (a: DeviceAccount, id: string) => social(a, 'POST', 'remove', { id });
export const blockFriend = (a: DeviceAccount, id: string) => social(a, 'POST', 'block', { id });
/** AV-05: este dispositivo recibe los avisos de la cuenta, con los interruptores de Ajustes → Notificaciones. */
export const linkDevice = (a: DeviceAccount, deviceId: string, prefs: SocialNotifications | undefined, remove = false) =>
  social(a, 'POST', 'device', remove ? { deviceId, remove } : { deviceId, prefs: { ...DEFAULT_SOCIAL_NOTIFICATIONS, ...prefs } });
export const unblockFriend = (a: DeviceAccount, id: string) => social(a, 'POST', 'unblock', { id });

/** Enlace de amistad (AM-01). */
export const friendLink = (accountId: string) => `${location.origin}/a/${accountId}`;

/**
 * La ruta de una invitación de amistad pegada (EN-03, EN-11): el enlace `…/a/<id>` (también dentro de un mensaje) o el
 * código suelto; cualquier otra cosa devuelve `undefined`.
 */
export function linkPath(text: string): string | undefined {
  const value = text.trim();
  const link = value.match(/(?:^|\/)a\/([A-Za-z0-9-]{8,64})(?=$|[/?#\s])/);
  if (link) return `/a/${link[1]}`;
  return /^[A-Za-z0-9]{8}-[A-Za-z0-9-]{4,55}$/.test(value) ? `/a/${value}` : undefined;
}

const PENDING_KEY = 'arvid-pending-link';

/** Recuerda la invitación mientras se hace el onboarding (EN-10). */
export function setPendingLink(path: string) {
  try {
    localStorage.setItem(PENDING_KEY, path);
  } catch {
    // Sin almacenamiento: al terminar se va a Hoy
  }
}

export function takePendingLink(): string | undefined {
  try {
    const path = localStorage.getItem(PENDING_KEY) ?? undefined;
    localStorage.removeItem(PENDING_KEY);
    return path && linkPath(path) ? path : undefined;
  } catch {
    return undefined;
  }
}

/** Alias de quien invita, sin sesión (EN-13). */
export async function publicProfile(id: string): Promise<{ alias: string } | undefined> {
  try {
    const res = await fetch(`/api/social/profile/${encodeURIComponent(id)}`);
    return res.ok ? ((await res.json()) as { alias: string }) : undefined;
  } catch {
    return undefined;
  }
}

/** Código de amigo visible (AM-12): las 8 primeras cifras del ID de cuenta. */
export const friendCode = (id: string) => id.slice(0, 8).toUpperCase();

/** iPhone o iPad en Safari, fuera de la app instalada: los enlaces no llegan a la PWA (EN-03). */
export function iosBrowser(): boolean {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) || (navigator as { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

/** Comparte con la hoja del sistema o, si no hay, copia al portapapeles. Devuelve `'copied'` si lo copió. */
export async function shareLink(url: string, text: string): Promise<'shared' | 'copied'> {
  if (navigator.share) {
    try {
      await navigator.share({ url, text });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'shared';
    }
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}
