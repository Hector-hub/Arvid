// Memoria del compañero en la app (spec 13): mantiene las notas al día para la IA y guarda lo que decide recordar,
// con su aviso en la conversación (MC-03).
import { useEffect } from 'react';
import { saveMemoryOps } from '../../data/memory';
import type { DataContext } from '../../data/repository';
import { memoryRefs } from '../../domain/arvid/memory';
import { t } from '../../i18n';
import { useMemories } from '../data';
import type { ChatTurn } from './brain';
import { setMemoryTexts } from './brain';
import { logChat } from './voice';

/** Las notas, en el orden `n1`, `n2`… con el que las ve la IA (MU-01). */
export function MemoryWatcher() {
  const memories = useMemories();
  useEffect(() => {
    setMemoryTexts(memoryRefs(memories ?? []).map(({ memory }) => memory.text));
  }, [memories]);
  return null;
}

/** Guarda las operaciones de memoria de un turno y anota sus avisos en la conversación. */
export async function rememberFromTurn(ctx: DataContext, turn: ChatTurn): Promise<void> {
  if (!turn.memoryOps?.length) return;
  for (const notice of await saveMemoryOps(ctx, turn.memoryOps)) logChat('companion', t(`memory.notice.${notice.kind}`, { text: notice.text }), 'memory');
}
