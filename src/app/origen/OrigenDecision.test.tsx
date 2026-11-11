import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataContext } from '../../data/repository';
import { onChatLine } from '../arvid/voice';
import { DataProvider } from '../data';
import { setupData } from '../test-utils';
import { OrigenDecision } from './OrigenDecision';

let ctx: DataContext;
beforeEach(async () => {
  ctx = await setupData();
  // Sin animación de escritura: los textos salen enteros
  document.documentElement.dataset.motion = 'reduced';
});
afterEach(async () => {
  delete document.documentElement.dataset.motion;
  await ctx.db.delete();
});

describe('la pregunta del compañero (DE, PC-07)', () => {
  it('reacciona, pregunta, no se cierra sin elegir y lo dicho queda en la conversación', async () => {
    const user = userEvent.setup();
    const said: string[] = [];
    const off = onChatLine((l) => said.push(`${l.from}: ${l.text}`));
    const onChoose = vi.fn();
    const onClose = vi.fn();
    render(
      <DataProvider value={ctx}>
        <OrigenDecision onChoose={onChoose} onClose={onClose} />
      </DataProvider>,
    );
    expect(await screen.findByText('…¿Qué fue eso? Algo entró por mi canal. Por nuestro canal.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Seguir' }));
    expect(screen.getByText('«Programa ORIGEN»… No me suena de nada.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Seguir' }));
    expect(screen.getByRole('heading', { name: 'Nos hackearon' })).toBeInTheDocument();
    // No hay forma de cerrarlo sin elegir
    expect(screen.queryByRole('button', { name: 'Cerrar' })).toBeNull();
    await act(async () => {
      await user.keyboard('{Escape}');
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Bloquear la señal' }));
    expect(onChoose).toHaveBeenCalledWith('block');
    expect(screen.getByText('Bloqueada. Si cambias de idea, está en Ajustes.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalled();
    expect(said).toContain('user: Bloquear la señal');
    expect(said.filter((s) => s.startsWith('companion:'))).toHaveLength(4);
    off();
  });
});
