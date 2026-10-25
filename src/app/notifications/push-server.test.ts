// @vitest-environment node
// Servidor de notificaciones (spec 10): qué avisos tocan y el alta de dispositivos.
import { describe, expect, it } from 'vitest';
import { handle, type Devices } from '../../../netlify/functions/push.mts';
import { dueEvents, zonedInstant, type DeviceEntry } from '../../../netlify/lib/push.mts';

const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'p', auth: 'a' } };
const entry = (extra: Partial<DeviceEntry> = {}): DeviceEntry => ({
  subscription,
  tz: 'America/Santo_Domingo', // UTC−4, sin cambio de hora
  morning: '07:00',
  night: '22:00',
  reminders: [],
  updatedAt: '2026-10-25T00:00:00.000Z',
  sentUpTo: '2026-10-25T10:55:00.000Z',
  ...extra,
});

describe('avisos que tocan (RS-04, PV-04)', () => {
  it('la hora local de la zona del dispositivo', () => {
    expect(zonedInstant('2026-10-25', '07:00', 'America/Santo_Domingo').toISOString()).toBe('2026-10-25T11:00:00.000Z');
    // Madrid cambia de hora el 25 de octubre de 2026: a las 07:00 ya es UTC+1
    expect(zonedInstant('2026-10-25', '07:00', 'Europe/Madrid').toISOString()).toBe('2026-10-25T06:00:00.000Z');
  });

  it('el resumen de la mañana entra en la ventana de su ejecución, y no se repite', () => {
    expect(dueEvents(entry(), new Date('2026-10-25T11:00:00Z'))).toEqual([{ kind: 'morning', at: '2026-10-25T11:00:00.000Z' }]);
    expect(dueEvents(entry({ sentUpTo: '2026-10-25T11:00:00.000Z' }), new Date('2026-10-25T11:05:00Z'))).toEqual([]);
  });

  it('recordatorios en la ventana; un resumen desactivado no se envía', () => {
    const e = entry({ morning: null, reminders: [{ at: '2026-10-25T10:58:00.000Z', ref: 'a:0' }, { at: '2026-10-25T12:00:00.000Z', ref: 'a:1' }] });
    expect(dueEvents(e, new Date('2026-10-25T11:00:00Z'))).toEqual([{ kind: 'activity', ref: 'a:0', at: '2026-10-25T10:58:00.000Z' }]);
  });
});

describe('/api/push (PV-01)', () => {
  const memory = () => {
    const map = new Map<string, DeviceEntry>();
    const devices: Devices = { get: async (k) => map.get(k) ?? null, set: async (k, v) => void map.set(k, v), delete: async (k) => void map.delete(k) };
    return { map, devices };
  };
  const post = (body: unknown) => new Request('https://x/api/push', { method: 'POST', body: JSON.stringify(body) });
  const device = { deviceId: '2f0e8a1c-3b4d-4e5f-8a6b-7c8d9e0f1a2b', subscription, tz: 'Europe/Madrid', morning: '07:00', night: null, reminders: [] };

  it('guarda el dispositivo y empieza a contar desde ahora', async () => {
    const { map, devices } = memory();
    const res = await handle(post(device), { devices, now: () => new Date('2026-10-25T09:00:00Z') });
    expect(res.status).toBe(200);
    expect(map.get(device.deviceId)).toMatchObject({ tz: 'Europe/Madrid', sentUpTo: '2026-10-25T09:00:00.000Z' });
  });

  it('rechaza servicios push desconocidos, zonas inválidas y datos de más', async () => {
    const { devices } = memory();
    expect((await handle(post({ ...device, subscription: { ...subscription, endpoint: 'https://evil.example/x' } }), { devices })).status).toBe(400);
    expect((await handle(post({ ...device, tz: 'Marte/Olimpo' }), { devices })).status).toBe(400);
    expect((await handle(post({ ...device, name: 'Leer' }), { devices })).status).toBe(200); // los campos extra se ignoran
  });

  it('baja del dispositivo', async () => {
    const { map, devices } = memory();
    await handle(post(device), { devices });
    await handle(post({ deviceId: device.deviceId, remove: true }), { devices });
    expect(map.size).toBe(0);
  });
});
