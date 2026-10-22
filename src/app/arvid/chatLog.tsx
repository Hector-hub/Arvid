// Guarda la conversación con el compañero en el dispositivo (D-098): tus mensajes y todo lo que dice, también por
// iniciativa propia. Las escrituras van en orden, una tras otra.
import { useEffect } from 'react';
import { appendChatLog, type ChatEntry } from '../../data/repository';
import { useData } from '../data';
import { getCompanion } from '../scene/engine';
import { onChatLine } from './voice';

export function ChatLogWatcher() {
  const { db } = useData();
  useEffect(() => {
    let queue = Promise.resolve();
    return onChatLine(({ from, text }) => {
      const entry: ChatEntry = { at: new Date().toISOString(), from, companion: getCompanion(), text };
      queue = queue.then(() => appendChatLog(db, [entry])).catch(() => undefined);
    });
  }, [db]);
  return null;
}
