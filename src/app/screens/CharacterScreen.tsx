import { Link } from 'react-router';
import { useAnalysis } from '../analysis';
import { Panel, Sprite, XpBar } from '../design/components';
import { intText } from '../text';

/** Hoja de personaje: nivel, título y XP (PRG-03). Los atributos llegan en el incremento 4. */
export function CharacterScreen() {
  const analysis = useAnalysis();
  if (!analysis) return null;
  const p = analysis.progress;

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <header className="row">
        <h1 className="grow">Personaje</h1>
        <Link to="/ajustes" className="btn btn-icon btn-ghost" aria-label="Ajustes">
          <Sprite name="nav-settings" />
        </Link>
      </header>

      <Panel className="stack">
        <div className="row" style={{ justifyContent: 'center', padding: 'var(--s3) 0' }}>
          <Sprite name="hero" scale={6} color="var(--level)" label="Tu personaje" />
        </div>
        <h2 style={{ textAlign: 'center', color: 'var(--level)', fontSize: '1.5rem' }}>
          Nivel {p.level} · {p.title}
        </h2>
        <XpBar xp={p.xp} start={p.levelStartXp} next={p.nextLevelXp} />
        <p className="row small">
          <span className="grow pixel" style={{ color: 'var(--xp)' }}>
            {intText(p.xp)} / {intText(p.nextLevelXp)} XP
          </span>
          <span className="muted">{intText(p.nextLevelXp - p.xp)} para el nivel {p.level + 1}</span>
        </p>
        {p.xpCents === 0 ? (
          <p className="muted">Registra tu primera actividad para ganar XP.</p>
        ) : (
          <p className="muted small">Has ganado {intText(p.xp)} XP en total. La XP nunca se pierde.</p>
        )}
      </Panel>

      <Panel className="stack">
        <h2>Atributos</h2>
        <p className="muted">Próximamente: cómo vas en cada área de tu vida y tu Disciplina.</p>
      </Panel>
    </div>
  );
}
