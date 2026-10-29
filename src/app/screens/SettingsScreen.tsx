import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { DEFAULT_SOUND, saveSetting, setCategoryActive, type Settings, type SoundSettings } from '../../data/repository';
import { COMPANION_NAME } from '../../domain/arvid/companion';
import { trackPosition } from '../../domain/music/playlist';
import { ALIAS_MAX, castOrder, validateAlias, type Gender } from '../../domain/arvid/arvid';
import type { Avatar } from '../../domain/avatar/catalog';
import type { Category } from '../../domain/categories';
import { getLocale, setLocale, t, type TKey } from '../../i18n';
import { currentPersistState, isIOS, requestPersistentStorage, type PersistState } from '../../pwa/platform';
import { useCategories, useData, useSettings } from '../data';
import { BackLink, CategoryIcon, Panel } from '../design/components';
import { useMusic } from '../music/MusicProvider';
import { trackCover, TRACKS } from '../music/tracks';
import { resumeAudio } from '../sound/audio';
import { previewSfx } from '../sound/sfx';
import { NextTrackIcon, PauseIcon, PlayIcon, PrevTrackIcon } from '../design/icons';
import { NotificationsPanel } from '../notifications/NotificationsPanel';
import { AiCodeField, AliasField, CharacterCarousel, CompanionColorPicker, CompanionPicker, GenderPicker, LanguagePicker } from '../profile/pickers';
import { categoryName, errorText } from '../text';
import { BackupPanel, DeletePanel } from './DataPanels';
import { AccountPanel } from '../account/AccountPanel';

const PERSIST_TEXT: Record<PersistState, { title: TKey; body: TKey }> = {
  granted: { title: 'settings.persistGranted', body: 'settings.persistGrantedText' },
  denied: { title: 'settings.persistDenied', body: 'settings.persistDeniedText' },
  unsupported: { title: 'settings.persistUnsupported', body: 'settings.persistUnsupportedText' },
};

const MOTION_OPTIONS: { value: Settings['reducedMotion']; label: TKey }[] = [
  { value: 'system', label: 'settings.motionSystem' },
  { value: 'on', label: 'settings.motionOn' },
  { value: 'off', label: 'settings.motionOff' },
];

/** Ajustes (SET-01 a SET-03, CAT-02; spec 06 PF-03). */
export function SettingsScreen() {
  const ctx = useData();
  const settings = useSettings();
  const categories = useCategories();
  const [persist, setPersist] = useState<PersistState>();

  useEffect(() => {
    void currentPersistState().then(setPersist);
  }, []);

  async function retryPersist() {
    const state = await requestPersistentStorage();
    setPersist(state);
    await saveSetting(ctx.db, 'persistGranted', state === 'granted');
  }

  if (!settings) return null;

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <BackLink to="/perfil" label={t('nav.profile')} />
      <h1>{t('settings.title')}</h1>

      <ProfilePanel settings={settings} />

      {/* Cuenta y copia en la nube (spec 14): oculta hasta la 2.0 */}
      <AccountPanel />

      <SoundPanel />

      <NotificationsPanel />

      <Panel className="stack">
        <h2>{t('settings.storage')}</h2>
        {persist && (
          <>
            <p className="pixel" style={{ color: persist === 'granted' ? 'var(--success)' : 'var(--level)' }}>
              {t(PERSIST_TEXT[persist].title)}
            </p>
            <p className="small muted">{t(PERSIST_TEXT[persist].body)}</p>
            {persist === 'denied' && (
              <button type="button" className="btn" onClick={() => void retryPersist()}>
                {t('common.retry')}
              </button>
            )}
          </>
        )}
        {isIOS() && (
          <Link to="/ajustes/instalar" className="btn">
            {t('settings.installIphone')}
          </Link>
        )}
      </Panel>

      <Panel className="stack">
        <h2>{t('settings.categories')}</h2>
        <p className="small muted">{t('settings.categoriesNote')}</p>
        <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {categories?.map((c) => (
            <CategoryToggle key={c.id} category={c} />
          ))}
        </ul>
        <Link to="/ajustes/categorias/nueva" className="btn">
          {t('settings.newCategory')}
        </Link>
      </Panel>

      <Panel>
        <fieldset className="field">
          <legend>
            <h2>{t('settings.reduceMotion')}</h2>
          </legend>
          <div className="choice-group" style={{ marginTop: 'var(--s2)' }}>
            {MOTION_OPTIONS.map((o) => (
              <label key={o.value} className="choice">
                <input
                  type="radio"
                  name="motion"
                  checked={settings.reducedMotion === o.value}
                  onChange={() => void saveSetting(ctx.db, 'reducedMotion', o.value)}
                />
                {t(o.label)}
              </label>
            ))}
          </div>
        </fieldset>
      </Panel>

      <BackupPanel />
      <DeletePanel />

      <Link to="/ajustes/creditos" className="btn">
        {t('settings.credits')}
      </Link>

      <p className="small muted">{t('settings.version', { version: __APP_VERSION__ })}</p>
    </div>
  );
}

/**
 * Ajustes → Perfil (PF-03): alias, género, idioma, personaje, color de ARVID y si habla por iniciativa propia.
 * Estado local para el personaje: dos toques seguidos (personaje y color) no deben pisarse mientras se relee el ajuste.
 */
function ProfilePanel({ settings }: { settings: Settings }) {
  const { db } = useData();
  const [alias, setAlias] = useState(settings.profile?.alias ?? '');
  const [aliasError, setAliasError] = useState<string>();
  const [avatar, setAvatar] = useState<Avatar>(settings.avatar);
  const [aiCode, setAiCode] = useState(settings.aiCode ?? '');
  const gender = settings.profile?.gender;

  function saveAlias() {
    const error = validateAlias(alias);
    setAliasError(errorText(error, { max: ALIAS_MAX }));
    if (!error) void saveSetting(db, 'profile', { alias: alias.trim(), gender: gender ?? 'x' });
  }

  return (
    <Panel className="stack">
      <h2>{t('settings.profile')}</h2>
      <AliasField
        label={t('settings.alias')}
        value={alias}
        error={aliasError}
        onChange={(v) => {
          setAlias(v);
          setAliasError(undefined);
        }}
      />
      <button type="button" className="btn" onClick={saveAlias} disabled={alias.trim() === (settings.profile?.alias ?? '')}>
        {t('common.save')}
      </button>

      {settings.profile && (
        <>
          <h3>{t('settings.gender')}</h3>
          <GenderPicker
            value={gender}
            onChange={(g: Gender) => void saveSetting(db, 'profile', { alias: settings.profile!.alias, gender: g })}
          />
        </>
      )}

      <h3>{t('settings.language')}</h3>
      <LanguagePicker
        value={getLocale()}
        onChange={(l) => {
          setLocale(l);
          void saveSetting(db, 'locale', l);
        }}
      />

      <h3>{t('settings.character')}</h3>
      <CharacterCarousel
        value={avatar}
        order={castOrder(gender)}
        onChange={(next: Avatar) => {
          setAvatar(next);
          void saveSetting(db, 'avatar', next);
        }}
      />

      <h3>{t('settings.companion')}</h3>
      <CompanionPicker value={settings.companion} onChange={(c) => void saveSetting(db, 'companion', c)} />

      <h3>{t('settings.arvidColor')}</h3>
      <CompanionColorPicker
        companion={settings.companion}
        arvidColor={settings.arvidColor}
        darisColor={settings.darisColor}
        onArvid={(c) => void saveSetting(db, 'arvidColor', c)}
        onDaris={(c) => void saveSetting(db, 'darisColor', c)}
      />

      <label className="choice">
        <input type="checkbox" checked={settings.arvidAi} onChange={(e) => void saveSetting(db, 'arvidAi', e.target.checked)} />
        <span className="grow">
          {t('settings.arvidAi')}
          <span className="small muted" style={{ display: 'block' }}>
            {t('settings.arvidAiHelp')}
          </span>
        </span>
      </label>

      {settings.arvidAi && (
        <AiCodeField
          value={aiCode}
          onChange={(code) => {
            setAiCode(code);
            void saveSetting(db, 'aiCode', code.trim());
          }}
        />
      )}

      <label className="choice">
        <input type="checkbox" checked={settings.arvidTalks} onChange={(e) => void saveSetting(db, 'arvidTalks', e.target.checked)} />
        <span className="grow">
          {t('settings.arvidTalks')}
          <span className="small muted" style={{ display: 'block' }}>
            {t('settings.arvidTalksHelp')}
          </span>
        </span>
      </label>

      <label className="choice">
        <input type="checkbox" checked={settings.games} onChange={(e) => void saveSetting(db, 'games', e.target.checked)} />
        <span className="grow">
          {t('settings.games')}
          <span className="small muted" style={{ display: 'block' }}>
            {t('settings.gamesHelp')}
          </span>
        </span>
      </label>
    </Panel>
  );
}

/** Ajustes → Sonido (spec 05, MUS-06; spec 16): reproductor de música centrado y efectos de sonido. */
function SoundPanel() {
  const music = useMusic();
  const { db } = useData();
  const settings = useSettings();
  const sound = settings?.sound ?? DEFAULT_SOUND;
  const saveSound = (patch: Partial<SoundSettings>) => void saveSetting(db, 'sound', { ...sound, ...patch });
  // La pista que se ve: la que suena o, si no, la guardada (o la primera)
  const track = music.track ?? TRACKS.find((tr) => tr.id === settings?.music.track) ?? TRACKS[0]!;
  const position = trackPosition(TRACKS, track.id);
  const canSeek = music.playing && music.duration > 0;
  const iosBackground = music.background && isIOS();
  return (
    <Panel className="stack">
      <h2>{t('settings.sound')}</h2>

      {/* La portada de la pista de fondo, difuminada, con su miniatura y un brillo de su color en los bordes (D-168) */}
      <div className="player has-cover" aria-label={t('settings.music')} style={{ '--glow': track.glow } as CSSProperties}>
        <div key={`bg-${track.id}`} className="player-bg" style={{ backgroundImage: `url(${trackCover(track, 192)})` }} aria-hidden="true" />
        <img key={`cover-${track.id}`} className="player-cover" src={trackCover(track, 512)} alt="" width={120} height={120} />
        <p className="player-track" aria-live="polite">
          {track.name}
        </p>
        <p className="small muted">
          {music.playing ? t('settings.trackOf', { n: position, total: TRACKS.length }) : t('settings.musicOff')}
        </p>
        <div className="player-seek">
          <span className="player-time">{clock(music.playing ? music.time : 0)}</span>
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.floor(music.duration))}
            step={1}
            value={canSeek ? Math.floor(music.time) : 0}
            style={fill(canSeek ? music.time / Math.max(1, music.duration) : 0)}
            disabled={!canSeek}
            aria-label={t('settings.progress')}
            onChange={(e) => music.seek(Number(e.target.value))}
            data-music-control=""
          />
          <span className="player-time">{clock(music.playing ? music.duration : 0)}</span>
        </div>
        <div className="player-controls">
          <button type="button" className="btn btn-icon player-btn" aria-label={t('settings.prevTrack')} onClick={music.previous} data-music-control="">
            <PrevTrackIcon />
          </button>
          <button
            type="button"
            className="btn btn-primary btn-icon player-btn player-main"
            aria-label={music.playing ? t('settings.pause') : t('settings.play')}
            aria-pressed={music.playing}
            onClick={music.toggle}
            data-music-control=""
          >
            {music.playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
          </button>
          <button type="button" className="btn btn-icon player-btn" aria-label={t('settings.nextTrack')} onClick={music.next} data-music-control="">
            <NextTrackIcon />
          </button>
        </div>
      </div>
      {music.needsConnection && (
        <p role="status" className="small field-error">
          {t('settings.needsConnection')}
        </p>
      )}
      <label className="field">
        <span className="small muted">{t('settings.musicVolume')}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={music.volume}
          style={fill(music.volume)}
          // En iPhone, sonando en segundo plano, el volumen lo llevan los botones del teléfono (D-163)
          disabled={iosBackground}
          onChange={(e) => music.setVolume(Number(e.target.value))}
          data-music-control=""
        />
      </label>
      <label className="choice">
        <input type="checkbox" checked={music.background} onChange={(e) => music.setBackground(e.target.checked)} data-music-control="" />
        <span className="grow">{t('settings.musicBackground')}</span>
      </label>
      <p className="small muted">{iosBackground ? t('settings.musicBackgroundIos') : t('settings.musicBackgroundHelp')}</p>
      <p className="small muted">{t('settings.musicNote')}</p>

      <label className="choice">
        <input type="checkbox" checked={sound.effects} onChange={(e) => saveSound({ effects: e.target.checked })} />
        <span className="grow">{t('settings.effects')}</span>
      </label>
      <label className="field">
        <span className="small muted">{t('settings.effectsVolume')}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={sound.volume}
          style={fill(sound.volume)}
          disabled={!sound.effects}
          onChange={(e) => saveSound({ volume: Number(e.target.value) })}
        />
      </label>
      <fieldset className="stack" style={{ gap: 'var(--s2)' }} disabled={!sound.effects}>
        <legend className="small muted">{t('settings.timbre')}</legend>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <div className="segmented">
            {(['soft', 'chip'] as const).map((id) => (
              <label key={id}>
                <input type="radio" name="timbre" checked={sound.timbre === id} onChange={() => saveSound({ timbre: id })} />
                <span>{t(id === 'soft' ? 'settings.timbreSoft' : 'settings.timbreChip')}</span>
              </label>
            ))}
          </div>
          <button type="button" className="btn" onClick={() => void resumeAudio().then(() => previewSfx({ ...sound, enabled: true }))}>
            {t('settings.listen')}
          </button>
        </div>
        <p className="small muted">{t('settings.timbreHelp')}</p>
      </fieldset>
      <p className="small muted">{t('settings.effectsNote', { companion: settings ? COMPANION_NAME[settings.companion] : '' })}</p>
    </Panel>
  );
}

/** Hasta dónde se pinta la pista del deslizador (0–1), para el estilo Cristal neón (D-155). */
const fill = (ratio: number) => ({ '--v': `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%` }) as CSSProperties;

/** 83 s → «1:23». */
function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function CategoryToggle({ category }: { category: Category }) {
  const ctx = useData();
  const [error, setError] = useState<string>();
  const name = categoryName(category);

  async function toggle(active: boolean) {
    const result = await setCategoryActive(ctx, category.id, active);
    if (result.ok) setError(undefined);
    else if (result.reason === 'in-use') setError(t('settings.inUse', { count: result.count }));
    else if (result.reason === 'last-active') setError(t('settings.lastActive'));
    else setError(t('settings.tooMany'));
  }

  return (
    <li className="stack" style={{ gap: 'var(--s1)' }}>
      {/* Una sola línea (D-155): la casilla ya dice si está activa; «Editar» a la derecha */}
      <div className="row category-row">
        <label className="choice grow">
          <input type="checkbox" checked={category.active} onChange={(e) => void toggle(e.target.checked)} />
          <CategoryIcon category={category} />
          <span className="grow">{name}</span>
          <span className="sr-only">{category.active ? t('settings.categoryActive') : t('settings.categoryInactive')}</span>
        </label>
        <Link to={`/ajustes/categorias/${category.id}`} className="btn btn-ghost" aria-label={t('settings.editCategory', { name })}>
          {t('common.edit')}
        </Link>
      </div>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </li>
  );
}
