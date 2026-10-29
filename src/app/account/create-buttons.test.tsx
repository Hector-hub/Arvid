// D-194: los botones de crear la cuenta según dónde puede guardar passkeys el teléfono.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CreateButtons, RemoteOnlyPrompt } from './AccountPanel';

const setup = (support: 'local' | 'remote' | 'none') => {
  const onCreate = vi.fn();
  render(<CreateButtons support={support} disabled={false} onCreate={onCreate} />);
  return onCreate;
};

describe('crear la cuenta según el teléfono (D-194)', () => {
  it('con autenticador propio: la passkey en dorado y la clave aparte', () => {
    setup('local');
    expect(screen.getByRole('button', { name: 'Crear con Face ID / huella' })).toHaveClass('btn-primary');
    expect(screen.getByRole('button', { name: 'Crear con clave de recuperación' })).not.toHaveClass('btn-primary');
  });

  it('solo con otro dispositivo o USB: la clave en dorado, la passkey aparte y el porqué', () => {
    const onCreate = setup('remote');
    expect(screen.getByRole('button', { name: 'Crear con clave de recuperación' })).toHaveClass('btn-primary');
    const remote = screen.getByRole('button', { name: 'Crear con passkey de otro dispositivo' });
    expect(remote).not.toHaveClass('btn-primary');
    expect(screen.getByText(/no puede guardar passkeys por sí mismo/)).toBeInTheDocument();
    remote.click();
    expect(onCreate).toHaveBeenCalledWith(true);
  });

  it('sin passkeys: solo la clave', () => {
    setup('none');
    expect(screen.getByRole('button', { name: 'Crear con clave de recuperación' })).toHaveClass('btn-primary');
    expect(screen.queryByRole('button', { name: /passkey|Face ID/ })).toBeNull();
  });

  it('tras cerrar la ventana: «Sí, usar la clave de recuperación» lo recuerda para este teléfono y la crea', () => {
    localStorage.removeItem('arvid-passkey-remote');
    const onYes = vi.fn();
    render(<RemoteOnlyPrompt disabled={false} onYes={onYes} onNo={vi.fn()} />);
    expect(screen.getByText(/Te ofreció solo «otro dispositivo»/)).toBeInTheDocument();
    screen.getByRole('button', { name: 'Sí, usar la clave de recuperación' }).click();
    expect(onYes).toHaveBeenCalled();
    expect(localStorage.getItem('arvid-passkey-remote')).toBe('1');
  });
});
