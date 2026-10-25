// Alta, actualización y baja de un dispositivo para las notificaciones (spec 10, PV-01, PV-04).
import { getStore } from '@netlify/blobs';
import { DeviceSchema, type DeviceEntry } from '../lib/push.mts';

const MAX_BODY = 16_000;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export interface Devices {
  get(id: string): Promise<DeviceEntry | null>;
  set(id: string, entry: DeviceEntry): Promise<void>;
  delete(id: string): Promise<void>;
}

const blobDevices = (): Devices => {
  const store = getStore('push');
  return {
    get: async (id) => (await store.get(id, { type: 'json' })) as DeviceEntry | null,
    set: async (id, entry) => void (await store.setJSON(id, entry)),
    delete: (id) => store.delete(id),
  };
};

export async function handle(req: Request, deps: { devices?: Devices; now?: () => Date } = {}): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'method' });
  const raw = await req.text();
  if (raw.length > MAX_BODY) return json(413, { error: 'too-large' });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'invalid' });
  }
  const devices = deps.devices ?? blobDevices();
  const now = (deps.now?.() ?? new Date()).toISOString();

  // Baja: solo hace falta el identificador (aleatorio, solo lo conoce el dispositivo)
  const remove = (body as { remove?: unknown; deviceId?: unknown } | null) ?? {};
  if (remove.remove === true && typeof remove.deviceId === 'string' && /^[0-9a-f-]{36}$/.test(remove.deviceId)) {
    await devices.delete(remove.deviceId);
    return json(200, { ok: true });
  }

  const parsed = DeviceSchema.safeParse(body);
  if (!parsed.success) return json(400, { error: 'invalid' });
  const { deviceId, ...data } = parsed.data;
  const previous = await devices.get(deviceId);
  // Lo ya enviado no se repite; un dispositivo nuevo empieza ahora
  await devices.set(deviceId, { ...data, updatedAt: now, sentUpTo: previous?.sentUpTo ?? now });
  return json(200, { ok: true });
}

export default (req: Request): Promise<Response> => handle(req);

export const config = {
  path: '/api/push',
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
