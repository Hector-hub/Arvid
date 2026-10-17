import { Link } from 'react-router';
import { Panel, Sprite } from '../design/components';

/** S1-04: el personaje llega en el incremento 2 (nivel y XP) y el 4 (atributos). */
export function CharacterScreen() {
  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <header className="row">
        <h1 className="grow">Personaje</h1>
        <Link to="/ajustes" className="btn btn-icon btn-ghost" aria-label="Ajustes">
          <Sprite name="nav-settings" />
        </Link>
      </header>
      <Panel className="stack" >
        <div className="row" style={{ justifyContent: 'center', padding: 'var(--s4) 0' }}>
          <Sprite name="hero" scale={6} color="var(--level)" label="Tu personaje" />
        </div>
        <p className="pixel" style={{ textAlign: 'center', color: 'var(--xp)' }}>
          Próximamente
        </p>
        <p className="muted" style={{ textAlign: 'center' }}>
          Aquí verás tu nivel, tu título y cómo vas en cada área de tu vida.
        </p>
      </Panel>
    </div>
  );
}
