import { Link } from 'react-router';
import { saveSetting } from '../../data/repository';
import { trend, type Score, type WindowDays } from '../../domain/attributes/attributes';
import { MIN_RADAR_AXES } from '../../domain/attributes/radar';
import { useAnalysis } from '../analysis';
import { useData, useSettings } from '../data';
import { CategoryIcon, Panel, Sprite, XpBar, categoryColor } from '../design/components';
import { Radar } from '../profile/Radar';
import { Scene } from '../scene/Scene';
import { scoreValueText, trendText } from '../profile/scoreText';
import { useProfile } from '../profile/useProfile';
import { intText } from '../text';

const WINDOWS: WindowDays[] = [7, 30, 90];

/** Hoja de personaje: nivel, ventana, radar, Disciplina y lista de atributos (PJ-01 a PJ-07). */
export function CharacterScreen() {
  const { db } = useData();
  const analysis = useAnalysis();
  const settings = useSettings();
  const window = settings?.radarWindow ?? 30;
  const view = useProfile(window);
  if (!analysis || !settings || !view) return null;
  const p = analysis.progress;
  const { profile, categories } = view;
  const hasData = analysis.byActivity.size > 0 || analysis.byMission.size > 0;

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <header className="row">
        <h1 className="grow">Personaje</h1>
        <Link to="/ajustes" className="btn btn-icon btn-ghost" aria-label="Ajustes">
          <Sprite name="nav-settings" />
        </Link>
      </header>

      <Panel className="stack">
        <Scene
          overlay={
            <h2>
              Nivel {p.level} · {p.title}
            </h2>
          }
        />
        <XpBar xp={p.xp} start={p.levelStartXp} next={p.nextLevelXp} />
        <p className="row small">
          <span className="grow pixel" style={{ color: 'var(--xp)' }}>
            {intText(p.xp)} / {intText(p.nextLevelXp)} XP
          </span>
          <span className="muted">
            {intText(p.nextLevelXp - p.xp)} para el nivel {p.level + 1}
          </span>
        </p>
        {p.xpCents === 0 ? (
          <p className="muted">Registra tu primera actividad para ganar XP.</p>
        ) : (
          <p className="muted small">Has ganado {intText(p.xp)} XP en total. La XP nunca se pierde.</p>
        )}
      </Panel>

      <div className="tabs" role="group" aria-label="Periodo de los atributos">
        {WINDOWS.map((w) => (
          <button
            key={w}
            type="button"
            className={w === window ? 'active' : undefined}
            aria-pressed={w === window}
            onClick={() => void saveSetting(db, 'radarWindow', w)}
          >
            {w} días
          </button>
        ))}
      </div>

      {!hasData ? (
        <Panel>
          <p className="muted">Tus atributos aparecerán cuando registres tus primeras actividades.</p>
        </Panel>
      ) : (
        <>
          <Panel className="stack" labelledBy="attrs-title">
            <h2 id="attrs-title">Atributos</h2>
            {categories.length >= MIN_RADAR_AXES ? (
              <>
                <Radar categories={categories} current={profile.current} previous={profile.previous} />
                <p className="small muted row" style={{ gap: 'var(--s4)', justifyContent: 'center' }}>
                  <span>
                    <span aria-hidden="true" style={{ color: 'var(--xp)' }}>
                      ■{' '}
                    </span>
                    Últimos {window} días
                  </span>
                  <span>
                    <span aria-hidden="true" style={{ color: 'var(--c-fog)' }}>
                      - -{' '}
                    </span>
                    {window} días anteriores
                  </span>
                </p>
              </>
            ) : (
              <p className="small muted">Activa al menos 3 categorías para ver el radar.</p>
            )}
            <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 'var(--s3)' }} aria-label="Lista de atributos">
              {categories.map((c) => {
                const score = profile.current.attributes.get(c.id);
                const t = trendText(trend(score?.value, profile.previous.attributes.get(c.id)?.value));
                return (
                  <li key={c.id} className="stack" style={{ gap: 'var(--s1)' }}>
                    <Link to={`/personaje/atributo/${c.id}`} className="row" style={{ color: 'var(--text)', textDecoration: 'none' }}>
                      <CategoryIcon category={c} />
                      <span className="grow">{c.name}</span>
                      {t && <span className="small muted">{t}</span>}
                      <span className="pixel" style={{ minWidth: 32, textAlign: 'right', color: score?.value === undefined ? 'var(--text-muted)' : 'var(--text)' }}>
                        {score?.value ?? '—'}
                      </span>
                    </Link>
                    <ScoreBar score={score} color={categoryColor(c)} />
                    {score?.value === undefined && <p className="small muted">{scoreValueText(score)}</p>}
                  </li>
                );
              })}
            </ul>
            <p className="small muted">
              Los atributos miden cuánto cumpliste lo que te propusiste en cada área durante los últimos {window} días, no tu salud
              ni tu capacidad.
            </p>
          </Panel>

          <DisciplineMeter score={profile.current.discipline} previous={profile.previous.discipline} />
        </>
      )}
    </div>
  );
}

function ScoreBar({ score, color }: { score?: Score; color: string }) {
  const filled = score?.value === undefined ? 0 : Math.round(score.value / 10);
  return (
    <div className="segments" aria-hidden="true" style={{ maxWidth: 'none', ['--seg-color' as string]: color }}>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={i < filled ? 'on' : undefined} />
      ))}
    </div>
  );
}

/** Medidor de Disciplina de 10 bloques (PJ-03, D-025). */
function DisciplineMeter({ score, previous }: { score: Score; previous: Score }) {
  const t = trendText(trend(score.value, previous.value));
  return (
    <Panel className="stack" labelledBy="discipline-title">
      <div className="row">
        <h2 id="discipline-title" className="grow">
          Disciplina
        </h2>
        <span className="pixel" style={{ fontSize: '1.5rem', color: score.value === undefined ? 'var(--text-muted)' : 'var(--level)' }}>
          {score.value ?? '—'}
        </span>
      </div>
      <ScoreBar score={score} color="var(--level)" />
      <p className="small muted">
        {score.value === undefined ? scoreValueText(score) : 'Cuánto cumpliste de todo lo que te propusiste.'}
        {t && ` · ${t}`}
      </p>
      <Link to="/personaje/disciplina" className="btn">
        Ver detalle
      </Link>
    </Panel>
  );
}
