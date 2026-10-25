// Notificaciones (spec 10): lo que guarda el servidor por dispositivo y qué avisos tocan en cada ejecución.
// Solo horas e identificadores opacos (PV-01): nunca nombres ni datos de actividades.
import { z } from 'zod';

/** Proveedores de Web Push admitidos (evita usar la función para hacer peticiones a cualquier sitio). */
const PUSH_HOSTS = [/\.googleapis\.com$/, /\.push\.services\.mozilla\.com$/, /\.push\.apple\.com$/, /\.notify\.windows\.com$/];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Más de 2 h de retraso: el servicio push descarta el aviso (y el service worker lo trata como tardío). */
export const PUSH_TTL_S = 2 * 60 * 60;
/** Dispositivos sin actualizar en 30 días se borran. */
export const STALE_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_REMINDERS = 200;

const validZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const DeviceSchema = z.object({
  deviceId: z.uuid(),
  subscription: z.object({
    endpoint: z.url().refine((u) => {
      const url = new URL(u);
      return url.protocol === 'https:' && PUSH_HOSTS.some((h) => h.test(url.hostname));
    }),
    keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  }),
  tz: z.string().max(64).refine(validZone),
  morning: z.string().regex(TIME).nullable(),
  night: z.string().regex(TIME).nullable(),
  reminders: z.array(z.object({ at: z.iso.datetime(), ref: z.string().max(80) })).max(MAX_REMINDERS),
});
export type DeviceInput = z.infer<typeof DeviceSchema>;

export interface DeviceEntry extends Omit<DeviceInput, 'deviceId'> {
  updatedAt: string;
  /** Avisos hasta este instante ya enviados. */
  sentUpTo: string;
}

export interface PushEvent {
  kind: 'morning' | 'night' | 'activity';
  ref?: string;
  at: string;
}

/** Fecha (AAAA-MM-DD) en la zona `tz` del instante dado. */
function dateIn(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}

/** Desfase (minutos) de la zona `tz` en ese instante. */
function offsetMinutes(instant: Date, tz: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year!, +parts.month! - 1, +parts.day!, +parts.hour!, +parts.minute!);
  return Math.round((asUtc - Math.floor(instant.getTime() / 60000) * 60000) / 60000);
}

/** Instante de la hora local `time` del día `date` (AAAA-MM-DD) en la zona `tz`. */
export function zonedInstant(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  let guess = naive - offsetMinutes(new Date(naive), tz) * 60000;
  guess = naive - offsetMinutes(new Date(guess), tz) * 60000; // ajuste en los cambios de hora
  return new Date(guess);
}

/** Avisos con instante en (sentUpTo, now]: resúmenes de ayer y de hoy en su zona, y recordatorios. */
export function dueEvents(entry: DeviceEntry, now: Date): PushEvent[] {
  const from = new Date(entry.sentUpTo).getTime();
  const inWindow = (at: Date) => at.getTime() > from && at.getTime() <= now.getTime();
  const events: PushEvent[] = [];
  const today = dateIn(now, entry.tz);
  const yesterday = dateIn(new Date(now.getTime() - 24 * 60 * 60 * 1000), entry.tz);
  for (const date of [yesterday, today]) {
    for (const kind of ['morning', 'night'] as const) {
      const time = entry[kind];
      if (!time) continue;
      const at = zonedInstant(date, time, entry.tz);
      if (inWindow(at)) events.push({ kind, at: at.toISOString() });
    }
  }
  for (const r of entry.reminders) if (inWindow(new Date(r.at))) events.push({ kind: 'activity', ref: r.ref, at: r.at });
  return events.sort((a, b) => a.at.localeCompare(b.at));
}
