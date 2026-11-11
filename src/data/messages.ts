// Conversación libre con los vecinos (spec 17, ME-07): lo que escribes y lo que contestan. Se guardan los últimos 300
// mensajes de cada chat; los tuyos se pueden eliminar uno a uno (ME-05).
import type { ArvidDB, MessageRow } from './db';
import { NEIGHBOR_KEEP } from '../domain/origen/neighborChat';

export async function loadMessages(db: ArvidDB, chat: string): Promise<MessageRow[]> {
  return db.messages.where('[chat+at]').between([chat, ''], [chat, '￿']).toArray();
}

export async function addMessages(db: ArvidDB, rows: MessageRow[]): Promise<void> {
  await db.transaction('rw', db.messages, async () => {
    await db.messages.bulkAdd(rows);
    for (const chat of new Set(rows.map((r) => r.chat))) {
      const all = await loadMessages(db, chat);
      const extra = all.length - NEIGHBOR_KEEP;
      if (extra > 0) await db.messages.bulkDelete(all.slice(0, extra).map((r) => r.id));
    }
  });
}

/** Solo los tuyos (ME-05): lo que dice un personaje no se borra. */
export async function deleteOwnMessage(db: ArvidDB, id: string): Promise<void> {
  const row = await db.messages.get(id);
  if (row?.from === 'user') await db.messages.delete(id);
}
