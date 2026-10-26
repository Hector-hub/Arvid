// D-116: pantalla de carga con el icono y «ARVID» escrito letra a letra; después, la app.
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Splash } from './Splash';

describe('pantalla de carga (D-116)', () => {
  afterEach(() => vi.useRealTimers());

  it('escribe ARVID bajo el icono y luego muestra la app', async () => {
    vi.useFakeTimers();
    render(
      <Splash>
        <p>App</p>
      </Splash>,
    );
    expect(screen.getByRole('status', { name: 'ARVID' })).toBeInTheDocument();
    expect(screen.queryByText('App')).toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(800));
    expect(screen.getByText(/^AR/)).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    expect(screen.getByText('App')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'ARVID' })).toBeNull();
  });

  it('la app aparece aunque la pantalla de carga se vuelva a pintar durante el fundido', async () => {
    vi.useFakeTimers();
    render(
      <Splash>
        <p>App</p>
      </Splash>,
    );
    // Avance poco a poco, dejando que React pinte entre medias (como en un móvil)
    for (let i = 0; i < 40; i++) await act(async () => vi.advanceTimersByTimeAsync(100));
    expect(screen.getByText('App')).toBeInTheDocument();
  });
});
