// Spec 13 en la app: la IA recuerda algo y se avisa; historial de 10 mensajes; pantalla de memoria.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadMemories, saveMemoryOps } from '../../data/memory';
import { saveSetting, type ChatEntry, type DataContext } from '../../data/repository';
import { renderRoutes, setupData } from '../test-utils';
import { ChatScreen } from '../screens/ChatScreen';
import { MemoryScreen } from '../screens/MemoryScreen';
import { ChatLogWatcher } from './chatLog';
import { historyFrom, resetConversation } from './brain';
import { MemoryWatcher } from './memory';

let ctx: DataContext;
beforeEach(async () => {
  ctx = await setupData();
  resetConversation();
  await saveSetting(ctx.db, 'arvidAi', true);
});
afterEach(async () => {
  vi.restoreAllMocks();
  await ctx.db.delete();
});

describe('historial (MU-03)', () => {
  it('los últimos 10 mensajes guardados, sin avisos de memoria', () => {
    const log: ChatEntry[] = Array.from({ length: 14 }, (_, i) => ({ at: `2026-10-26T10:${String(i).padStart(2, '0')}:00Z`, from: i % 2 ? 'companion' : 'user', companion: 'arvid', text: `m${i}` }));
    log.push({ at: 'x', from: 'companion', companion: 'arvid', text: 'Lo recordaré: «x»', kind: 'memory' });
    const h = historyFrom(log);
    expect(h).toHaveLength(10);
    expect(h[0]).toEqual({ role: 'user', content: 'm4' });
    expect(h.at(-1)).toEqual({ role: 'assistant', content: 'm13' });
  });
});

describe('recordar desde el chat (MC-01, MC-03)', () => {
  it('guarda la nota, avisa en la conversación y envía notas + historial', async () => {
    await saveMemoryOps(ctx, [{ op: 'remember', text: 'Le gusta leer', source: 'companion' }]);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response(JSON.stringify({ reply: '¡Hecho!', memoryOps: [{ op: 'remember', text: 'Los lunes trabaja hasta tarde', source: 'user' }] })),
    );
    const user = userEvent.setup();
    renderRoutes(
      ctx,
      [
        {
          path: '/chat',
          element: (
            <>
              <ChatLogWatcher />
              <MemoryWatcher />
              <ChatScreen />
            </>
          ),
        },
      ],
      '/chat',
    );
    await waitFor(async () => expect(await loadMemories(ctx.db)).toHaveLength(1));
    await new Promise((r) => setTimeout(r, 50));
    await user.type(await screen.findByLabelText('Mensaje para ARVID'), 'Recuerda que los lunes trabajo hasta tarde{Enter}');
    expect(await screen.findByText('Lo recordaré: «Los lunes trabaja hasta tarde»')).toBeInTheDocument();
    const memories = await loadMemories(ctx.db);
    expect(memories.find((m) => m.text === 'Los lunes trabaja hasta tarde')?.source).toBe('user');
    const sent = JSON.parse(String(fetchSpy.mock.calls[0]![1]!.body));
    expect(sent.memory).toEqual(['Le gusta leer']);
  });
});

describe('Lo que sabe de ti (MI-02)', () => {
  it('lista las notas, borra una con deshacer y borra todas', async () => {
    await saveMemoryOps(ctx, [
      { op: 'remember', text: 'Le gusta leer', source: 'companion' },
      { op: 'remember', text: 'Trabaja de noche', source: 'user' },
    ]);
    const user = userEvent.setup();
    renderRoutes(ctx, [{ path: '/chat/memoria', element: <MemoryScreen /> }], '/chat/memoria');
    expect(await screen.findByText('Trabaja de noche')).toBeInTheDocument();
    expect(screen.getByText('La pediste')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Olvidar esta nota: Le gusta leer' }));
    await waitFor(() => expect(screen.queryByText('Le gusta leer')).toBeNull());
    await user.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(await screen.findByText('Le gusta leer')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Borrar memoria completa' }));
    await user.click(screen.getByRole('button', { name: 'Borrar memoria' }));
    await waitFor(async () => expect(await loadMemories(ctx.db)).toHaveLength(0));
  });
});
