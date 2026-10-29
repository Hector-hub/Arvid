// Notificaciones de día (D-108): cada minuto de 7:00 a 21:59 en Santo Domingo (UTC−4, sin cambio de hora), para que
// lleguen como mucho 1 minuto tarde. Netlify programa en UTC: 11:00–01:59.
// Cada 10 minutos, además, los avisos de los retos (spec 15, AV-03 y AV-04).
import { getStore } from '@netlify/blobs';
import type { Account, KV, ListKV } from '../lib/account.mts';
import { sendDuePushes } from '../lib/pushSend.mts';
import { pushZone, sendChallengePushes, webNotifier, type SocialDevice } from '../lib/socialPush.mts';

const kv = <T,>(name: string): ListKV<T> => {
  const store = getStore({ name, consistency: 'strong' });
  return {
    get: async (key) => (await store.get(key, { type: 'json' })) as T | null,
    set: async (key, value) => void (await store.setJSON(key, value)),
    delete: (key) => store.delete(key),
    list: async (prefix) => (await store.list({ prefix })).blobs.map((b) => b.key),
  };
};

export default async function run(): Promise<void> {
  await sendDuePushes();
  if (new Date().getUTCMinutes() % 10 !== 0) return;
  const social = kv<{ devices?: SocialDevice[] }>('social');
  const devicesOf = async (id: string) => (await social.get(id))?.devices ?? [];
  await sendChallengePushes({
    challenges: kv('challenges'),
    accounts: kv<Account>('accounts') as KV<Account>,
    notify: webNotifier(devicesOf),
    zoneOf: async (id) => pushZone(await devicesOf(id)),
    now: Date.now(),
  }).catch((e) => console.error('retos', e));
}

export const config = { schedule: '* 11-23,0-1 * * *' };
