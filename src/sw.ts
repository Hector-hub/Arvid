// Service worker de ARVID (spec 10, D-102): la precarga sin conexión de siempre (offline-strategy) más las
// notificaciones Web Push. Se compila con vite-plugin-pwa (injectManifest).
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { RangeRequestsPlugin } from 'workbox-range-requests';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { noticeFor, type PushData, type SocialPushData } from './app/notifications/handlePush';
import { ArvidDB } from './data/db';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (string | { url: string; revision: string | null })[] };

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

// Música (spec 05, MUS-07): fuera del precache; cada pista se guarda la primera vez que suena y se sirve por rangos
registerRoute(
  ({ url }) => url.pathname.startsWith('/music/'),
  new CacheFirst({
    cacheName: 'arvid-music',
    plugins: [new CacheableResponsePlugin({ statuses: [200] }), new RangeRequestsPlugin(), new ExpirationPlugin({ maxEntries: 20 })],
  }),
);

// Actualización con aviso (registerType: 'prompt'): el banner pide activar la versión nueva
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') void self.skipWaiting();
});

// Aviso recibido (PV-02): siempre se muestra una notificación (Safari lo exige, PV-03)
self.addEventListener('push', (event) => {
  const data = (event.data?.json() ?? { kind: 'night' }) as PushData | SocialPushData;
  // Los de amigos y retos abren su pantalla (un enlace interno de la app, nunca otro sitio)
  const url = data.kind === 'social' && typeof (data as SocialPushData).url === 'string' && /^\/[a-z]/.test((data as SocialPushData).url) ? (data as SocialPushData).url : '/hoy';
  event.waitUntil(
    (async () => {
      const notice = await noticeFor(new ArvidDB(), data, new Date());
      if (notice.badge !== undefined) await self.navigator.setAppBadge?.(notice.badge).catch(() => undefined);
      await self.registration.showNotification(notice.title, {
        body: notice.body,
        icon: '/icons/icon-192.png',
        tag: data.kind === 'activity' ? `arvid-${(data as PushData).ref}` : data.kind === 'social' ? `arvid-${(data as SocialPushData).type}-${url}` : `arvid-${data.kind}`,
        data: { url },
      });
    })(),
  );
});

// Tocar el aviso abre ARVID en Hoy (o en el reto o los amigos), o trae al frente la ventana abierta (PV-05)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = ((event.notification.data as { url?: string } | null)?.url ?? '/hoy').startsWith('/') ? ((event.notification.data as { url: string }).url ?? '/hoy') : '/hoy';
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows[0];
      if (open) {
        await open.focus();
        if (!new URL(open.url).pathname.startsWith(target)) await open.navigate(target).catch(() => undefined);
      } else await self.clients.openWindow(target);
    })(),
  );
});
