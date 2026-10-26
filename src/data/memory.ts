// Memoria del compañero (spec 13): guardar las operaciones que propone la IA, borrar una nota (con deshacer) o todas.
import { applyMemoryOps, type Memory, type MemoryNotice, type MemoryOp } from '../domain/arvid/memory';
import type { ArvidDB } from './db';
import type { DataContext } from './repository';

export async function loadMemories(db: ArvidDB): Promise<Memory[]> {
  return db.memories.toArray();
}

/** Aplica las operaciones de memoria de una respuesta (ME-02, MC-03) y devuelve los avisos para el chat. */
export async function saveMemoryOps(ctx: DataContext, ops: readonly MemoryOp[]): Promise<MemoryNotice[]> {
  if (ops.length === 0) return [];
  return ctx.db.transaction('rw', ctx.db.memories, async () => {
    const before = await ctx.db.memories.toArray();
    const { memories, notices } = applyMemoryOps(before, ops, ctx.now().toISOString(), ctx.newId);
    const keep = new Set(memories.map((m) => m.id));
    await ctx.db.memories.bulkDelete(before.filter((m) => !keep.has(m.id)).map((m) => m.id));
    await ctx.db.memories.bulkPut(memories);
    return notices;
  });
}

/** Borra una nota (MI-02) y la devuelve para poder deshacerlo. */
export async function deleteMemory(db: ArvidDB, id: string): Promise<Memory | undefined> {
  const memory = await db.memories.get(id);
  if (memory) await db.memories.delete(id);
  return memory;
}

export async function restoreMemory(db: ArvidDB, memory: Memory): Promise<void> {
  await db.memories.put(memory);
}

/** «Borrar memoria completa» (MI-03): no toca la conversación. */
export async function clearMemories(db: ArvidDB): Promise<void> {
  await db.memories.clear();
}
