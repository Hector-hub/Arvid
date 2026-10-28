import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Sprite } from './components';

describe('iconos pixel del estilo Cristal neón (D-157)', () => {
  it('las pestañas y el corazón de Cuerpo usan los iconos nuevos, a escala entera de la cuadrícula de 12 px', () => {
    for (const name of ['nav-today', 'nav-activities', 'nav-goals', 'nav-character', 'cat-body'] as const) {
      const { container, unmount } = render(<Sprite name={name} />);
      const svg = container.querySelector('svg.pixel-icon');
      expect(svg, name).not.toBeNull();
      expect(svg).toHaveAttribute('width', '24');
      unmount();
    }
  });

  it('los demás siguen saliendo del atlas, y la etiqueta accesible se conserva', () => {
    const { container } = render(<Sprite name="cat-rest" />);
    expect(container.querySelector('.sprite')).not.toBeNull();
    const { getByRole } = render(<Sprite name="cat-body" label="Cuerpo" />);
    expect(getByRole('img', { name: 'Cuerpo' })).toBeInTheDocument();
  });
});
