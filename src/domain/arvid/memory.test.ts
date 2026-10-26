// Spec 13: aplicar operaciones de memoria (ME-02, MC-03, MC-05) y referencias n1, n2…
import { describe, expect, it } from 'vitest';
import { applyMemoryOps, checkMemoryOp, MEMORY_MAX, memoryRefs, type Memory } from './memory';

let seq = 0;
const note = (text: string, source: Memory['source'], at: string): Memory => ({ id: `m${++seq}`, text, source, createdAt: at, updatedAt: at });
const newId = () => `new-${++seq}`;

describe('operaciones de memoria', () => {
  it('recordar, actualizar y olvidar por su referencia, con un aviso por cada una', () => {
    const list = [note('Le gusta leer', 'companion', '2026-10-01'), note('Trabaja de noche', 'user', '2026-10-02')];
    const { memories, notices } = applyMemoryOps(
      list,
      [
        { op: 'remember', text: 'Prefiere entrenar por la mañana', source: 'companion' },
        { op: 'update_memory', id: 'n1', text: 'Le gusta leer novelas' },
        { op: 'forget', id: 'n2' },
      ],
      '2026-10-26T10:00:00Z',
      newId,
    );
    expect(memories.map((m) => m.text)).toEqual(['Le gusta leer novelas', 'Prefiere entrenar por la mañana']);
    expect(notices.map((n) => n.kind)).toEqual(['remembered', 'updated', 'forgotten']);
  });

  it('no duplica una nota igual', () => {
    const { memories, notices } = applyMemoryOps([note('Le gusta leer', 'user', '2026-10-01')], [{ op: 'remember', text: 'le gusta leer', source: 'companion' }], 'x', newId);
    expect(memories).toHaveLength(1);
    expect(notices).toEqual([]);
  });

  it('ME-02: llena, descarta la más antigua del compañero; nunca una pedida', () => {
    const list = Array.from({ length: MEMORY_MAX }, (_, i) => note(`n${i}`, i === 0 ? 'user' : 'companion', `2026-10-${String(i + 1).padStart(2, '0')}`));
    const { memories } = applyMemoryOps(list, [{ op: 'remember', text: 'Nueva', source: 'companion' }], '2026-11-01', newId);
    expect(memories).toHaveLength(MEMORY_MAX);
    expect(memories.some((m) => m.text === 'n0')).toBe(true); // la pedida sigue
    expect(memories.some((m) => m.text === 'n1')).toBe(false); // la más antigua del compañero se fue
    const allUser = Array.from({ length: MEMORY_MAX }, (_, i) => note(`u${i}`, 'user', '2026-10-01'));
    const full = applyMemoryOps(allUser, [{ op: 'remember', text: 'Otra', source: 'user' }], 'x', newId);
    expect(full.memories).toHaveLength(MEMORY_MAX);
    expect(full.notices).toEqual([{ kind: 'full', text: 'Otra' }]);
  });

  it('MC-05: valida textos y referencias', () => {
    expect(checkMemoryOp('remember', { text: 'x'.repeat(121), source: 'user' }, 0)).toBeUndefined();
    expect(checkMemoryOp('forget', { id: 'n3' }, 2)).toBeUndefined();
    expect(checkMemoryOp('forget', { id: 'n2' }, 2)).toEqual({ op: 'forget', id: 'n2' });
    expect(checkMemoryOp('delete_all', {}, 2)).toBeUndefined();
  });

  it('las referencias siguen el orden de creación', () => {
    const refs = memoryRefs([note('b', 'user', '2026-10-02'), note('a', 'user', '2026-10-01')]);
    expect(refs.map((r) => [r.ref, r.memory.text])).toEqual([
      ['n1', 'a'],
      ['n2', 'b'],
    ]);
  });
});
