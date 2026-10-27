// Juego incrustado desde su sitio (spec 09, JG): ocupa la pantalla bajo el enlace de volver; sin conexión, un aviso.
// Pantalla completa (JG-06): el marco cubre toda la ventana. No se usa la del navegador: con ella el juego de Unity
// deja de responder a los toques, y Safari en iPhone no la permite para un marco.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Navigate } from 'react-router';
import { t, useLocale } from '../../i18n';
import { BackLink } from '../design/components';
import { CollapseIcon, ExpandIcon } from '../design/icons';
import { GAMES } from '../games';
import { useMusic } from '../music/MusicProvider';
import { suppressSfx } from '../sound/sfx';
import { useSettings } from '../data';

const subscribe = (on: () => void) => {
  window.addEventListener('online', on);
  window.addEventListener('offline', on);
  return () => {
    window.removeEventListener('online', on);
    window.removeEventListener('offline', on);
  };
};

/** Tiempo que se ve el botón de salir de pantalla completa antes de desvanecerse. */
const EXIT_VISIBLE_MS = 3000;

export function GameScreen() {
  useLocale();
  const online = useSyncExternalStore(subscribe, () => navigator.onLine);
  const [full, setFull] = useState(false);
  // En pantalla completa el botón de salir se desvanece; un toque en su esquina lo vuelve a mostrar (JG-09)
  const [shown, setShown] = useState(0);
  const game = GAMES[0]!;
  const settings = useSettings();
  const { hush } = useMusic();

  // La música de ARVID calla mientras se juega (el juego trae la suya) y vuelve al salir (JG-07)
  useEffect(() => hush(), [hush]);
  // Los juegos tienen su propio sonido: los efectos de ARVID se callan (spec 16, EF-03)
  useEffect(() => suppressSfx(), []);

  useEffect(() => {
    if (!full) return;
    const id = window.setTimeout(() => setShown(0), EXIT_VISIBLE_MS);
    return () => clearTimeout(id);
  }, [full, shown]);

  const enter = () => {
    setShown(Date.now());
    setFull(true);
  };

  useEffect(() => {
    if (!full) return;
    // Esc sale (si el foco no está dentro del juego)
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [full]);


  // Con los juegos desactivados en Ajustes, la dirección lleva a Hoy (JG-08)
  if (!settings) return null;
  if (!settings.games) return <Navigate to="/hoy" replace />;

  return (
    <div className="stack game-page" style={{ gap: 'var(--s3)' }}>
      <div className="row">
        <BackLink to="/hoy" label={t('nav.today')} />
        {online && (
          <button type="button" className="btn chat-button" style={{ marginLeft: 'auto' }} aria-label={t('game.fullscreen')} title={t('game.fullscreen')} onClick={enter}>
            <ExpandIcon />
          </button>
        )}
      </div>
      <h1 className="sr-only">{game.name}</h1>
      {online ? (
        <div className={`game-stage${full ? ' full' : ''}`}>
          <iframe className="game-frame" src={game.url} title={game.name} allow="fullscreen; autoplay; gamepad" allowFullScreen />
          {full && !shown && (
            // Los toques dentro del juego no llegan a ARVID: esta esquina invisible es la que los recoge
            <button type="button" className="game-exit-zone" aria-label={t('game.exitFullscreen')} onClick={() => setShown(Date.now())} />
          )}
          {full && !!shown && (
            <button type="button" className="btn chat-button game-exit" aria-label={t('game.exitFullscreen')} title={t('game.exitFullscreen')} onClick={() => setFull(false)}>
              <CollapseIcon />
            </button>
          )}
        </div>
      ) : (
        <p className="banner">{t('game.offline')}</p>
      )}
    </div>
  );
}
