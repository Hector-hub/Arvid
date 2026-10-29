// Amigos en la app (spec 15, §3.1 y EN): llamadas a /api/social con la sesión de la cuenta y los enlaces.
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

async function social<T>(account: Pick<DeviceAccount, 'session'>, method: string, route: string, body?: unknown): Promise<T> {
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
export const unblockFriend = (a: DeviceAccount, id: string) => social(a, 'POST', 'unblock', { id });

/** Enlace de amistad (AM-01). */
export const friendLink = (accountId: string) => `${location.origin}/a/${accountId}`;

/**
 * La ruta de un enlace de ARVID pegado (EN-03): `…/a/<id>` y, desde la 15b, `…/r/<id>`. Admite el enlace con o sin
 * dominio; cualquier otra cosa devuelve `undefined`.
 */
export function linkPath(text: string): string | undefined {
  const m = text.trim().match(/(?:^|\/)(a|r)\/([A-Za-z0-9-]{8,64})\/?$/);
  return m ? `/${m[1]}/${m[2]}` : undefined;
}

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
