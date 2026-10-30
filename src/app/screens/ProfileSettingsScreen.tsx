import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { saveSetting, type Settings } from '../../data/repository';
import { ALIAS_MAX, ARVID_COLORS, ARVID_RAMPS, castOrder, validateAlias, type ArvidColor, type Gender } from '../../domain/arvid/arvid';
import { COMPANIONS, DARIS_COLORS, DARIS_SWATCH, type Companion, type DarisColor } from '../../domain/arvid/companion';
import { VARIANT_IDS, type Avatar, type CastId } from '../../domain/avatar/catalog';
import { getLocale, setLocale, t } from '../../i18n';
import { applyCompanion } from '../companion';
import { useData, useSettings } from '../data';
import { SwitchOption } from '../design/components';
import { AiCodeField, AliasField, GenderPicker, LanguagePicker, sameAvatar, useOptimistic, VARIANT_SWATCH } from '../profile/pickers';
import { ArvidPreview, AvatarPreview, DarisPreview, Scene } from '../scene/Scene';
import { errorText } from '../text';

/**
 * Ajustes → Perfil (D-197), a la altura de la página Sonido. Arriba, fijo, el protagonista y su compañero caminando
 * por la escena, con el nombre del personaje y sus colores; debajo, los personajes y los compañeros en listas como las
 * pistas, y al final el resto (alias, género, idioma y la IA) plegado.
 */
export function SettingsProfileScreen() {
  const settings = useSettings();
  if (!settings) return null;
  return <ProfileSettings settings={settings} />;
}

function ProfileSettings({ settings }: { settings: Settings }) {
  const { db } = useData();
  // Lo elegido se ve al momento, aunque el guardado tarde unos milisegundos en volver
  const [avatar, setAvatar] = useOptimistic(settings.avatar, sameAvatar);
  const [companion, setCompanion] = useOptimistic(settings.companion);
  const [arvidColor, setArvidColor] = useOptimistic(settings.arvidColor);
  const [darisColor, setDarisColor] = useOptimistic(settings.darisColor);
  const chooseAvatar = (next: Avatar) => {
    setAvatar(next);
    void saveSetting(db, 'avatar', next);
  };
  const glow = VARIANT_SWATCH[avatar.variant];
  const order = castOrder(settings.profile?.gender);
  const companionColors =
    companion === 'daris'
      ? DARIS_COLORS.map((id) => ({ id, color: DARIS_SWATCH[id], label: t(`daris.colors.${id}`), on: id === darisColor }))
      : ARVID_COLORS.map((id) => ({ id, color: ARVID_RAMPS[id][3]!, label: t(`arvid.colors.${id}`), on: id === arvidColor }));
  const companionGlow = companionColors.find((c) => c.on)?.color ?? 'var(--xp)';

  return (
    <div className="stack profile-page" style={{ gap: 'var(--s4)' }}>
      {/* Fijo arriba como la escena de Hoy: la escena de cerca y, sobre negro, el personaje y sus colores */}
      <div className="scene-sticky profile-hero">
        <h1 className="sr-only">{t('settings.profile')}</h1>
        <Scene controls={false} focus />
        <Link to="/ajustes" className="btn btn-icon scene-icon profile-back" aria-label={t('nav.settings')}>
          <span aria-hidden="true">‹</span>
        </Link>
        <div className="profile-hero-info">
          <p className="profile-hero-name">{t(`avatar.styles.${avatar.cast}`)}</p>
          <p className="small profile-hero-text">{t(`avatar.descriptions.${avatar.cast}`)}</p>
          <fieldset className="field">
            <legend className="sr-only">{t('avatar.colors')}</legend>
            <div className="swatches">
              {VARIANT_IDS.map((variant) => (
                <label key={variant} className="swatch" style={{ background: VARIANT_SWATCH[variant] }} title={t(`avatar.variants.${variant}`)}>
                  <input
                    type="radio"
                    name="variant"
                    checked={avatar.variant === variant}
                    onChange={() => chooseAvatar({ ...avatar, variant })}
                    aria-label={t(`avatar.variants.${variant}`)}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      {/* Arriba de las listas: abajo del todo se perdía (D-197) */}
      <MoreSettings settings={settings} />

      <fieldset className="profile-list">
        <legend className="sound-heading">{t('settings.character')}</legend>
        <div className="profile-rows">
          {order.map((cast, i) => (
            <label key={cast} className={`sound-row${avatar.cast === cast ? ' on' : ''}`} style={{ '--glow': glow } as CSSProperties}>
              <input
                type="radio"
                className="row-radio"
                name="character"
                checked={avatar.cast === cast}
                onChange={() => chooseAvatar({ ...avatar, cast })}
                aria-label={t('avatar.cardLabel', {
                  name: t(`avatar.styles.${cast}`),
                  index: i + 1,
                  total: order.length,
                  description: t(`avatar.descriptions.${cast}`),
                })}
              />
              <span className="profile-thumb" aria-hidden="true">
                <span className="profile-thumb-avatar" style={thumbPosition(cast)}>
                  <AvatarPreview avatar={{ cast, variant: avatar.variant }} scale={2} still />
                </span>
              </span>
              <span className="grow sound-row-name" aria-hidden="true">
                <b>{t(`avatar.styles.${cast}`)}</b>
                <span>{t(`avatar.descriptions.${cast}`)}</span>
              </span>
              {avatar.cast === cast && <span className="profile-check" aria-hidden="true">✓</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="profile-list">
        <legend className="sound-heading">{t('settings.companion')}</legend>
        <div className="profile-rows">
          {COMPANIONS.map((c) => (
            <label key={c} className={`sound-row${companion === c ? ' on' : ''}`} style={{ '--glow': companionGlow } as CSSProperties}>
              <input
                type="radio"
                className="row-radio"
                name="companion"
                checked={companion === c}
                onChange={() => {
                  setCompanion(c as Companion);
                  // Como el idioma: los textos y la escena cambian al momento, antes de que vuelva lo guardado
                  applyCompanion(c);
                  void saveSetting(db, 'companion', c);
                }}
              />
              <span className="profile-thumb" aria-hidden="true">
                {c === 'daris' ? <DarisPreview color={darisColor} size={48} still /> : <ArvidPreview color={arvidColor} size={48} still />}
              </span>
              <span className="grow sound-row-name">
                <b>{t(`companion.${c}.name`)}</b>
                <span>{t(`companion.${c}.tagline`)}</span>
              </span>
              {companion === c && <span className="profile-check" aria-hidden="true">✓</span>}
            </label>
          ))}
        </div>
        <div className="profile-colors">
          <h3 className="small muted">{t('settings.arvidColor')}</h3>
          <fieldset className="field">
            <legend className="sr-only">{t('settings.arvidColor')}</legend>
            <div className="swatches">
              {companionColors.map((c) => (
                <label key={c.id} className="swatch" style={{ background: c.color }} title={c.label}>
                  <input
                    type="radio"
                    name="companion-color"
                    checked={c.on}
                    onChange={() => {
                      if (companion === 'daris') {
                        setDarisColor(c.id as DarisColor);
                        void saveSetting(db, 'darisColor', c.id as DarisColor);
                      } else {
                        setArvidColor(c.id as ArvidColor);
                        void saveSetting(db, 'arvidColor', c.id as ArvidColor);
                      }
                    }}
                    aria-label={c.label}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </fieldset>

    </div>
  );
}

/**
 * Retrato de la cadera para arriba (D-197): el fotograma quieto (100×72) al doble, centrado en cada personaje y con la
 * cabeza arriba. Medido en su fotograma: centro del cuerpo y primera fila con píxeles (Ghost y Drifter son más altos).
 */
const THUMB: Record<CastId, { center: number; top: number }> = {
  ella: { center: 50, top: 24 },
  ella2: { center: 46.5, top: 24 },
  el: { center: 47.5, top: 12 },
  el2: { center: 51, top: 12 },
};
const THUMB_SIZE = 64;
function thumbPosition(cast: CastId): CSSProperties {
  const { center, top } = THUMB[cast];
  return { left: THUMB_SIZE / 2 - center * 2, top: 4 - top * 2 };
}

/** Alias, género, idioma y la IA, plegados como los ajustes de la página Sonido. */
function MoreSettings({ settings }: { settings: Settings }) {
  const { db } = useData();
  const [alias, setAlias] = useState(settings.profile?.alias ?? '');
  const [aliasError, setAliasError] = useState<string>();
  const [aiCode, setAiCode] = useState(settings.aiCode ?? '');
  const gender = settings.profile?.gender;

  function saveAlias() {
    const error = validateAlias(alias);
    setAliasError(errorText(error, { max: ALIAS_MAX }));
    if (!error) void saveSetting(db, 'profile', { alias: alias.trim(), gender: gender ?? 'x' });
  }

  return (
    <details className="sound-settings">
      <summary>
        <h2 className="sound-heading">{t('settings.profileMore')}</h2>
        <span className="sound-settings-chevron" aria-hidden="true">
          ›
        </span>
      </summary>
      <div className="stack profile-more">
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
            <h3 className="small muted">{t('settings.gender')}</h3>
            <GenderPicker
              value={gender}
              onChange={(g: Gender) => void saveSetting(db, 'profile', { alias: settings.profile!.alias, gender: g })}
            />
          </>
        )}

        <h3 className="small muted">{t('settings.language')}</h3>
        <LanguagePicker
          value={getLocale()}
          onChange={(l) => {
            setLocale(l);
            void saveSetting(db, 'locale', l);
          }}
        />
      </div>
      <SwitchOption label={t('settings.arvidAi')} help={t('settings.arvidAiHelp')} checked={settings.arvidAi} onChange={(on) => void saveSetting(db, 'arvidAi', on)} />
      {settings.arvidAi && (
        <div className="profile-more">
          <AiCodeField
            value={aiCode}
            onChange={(code) => {
              setAiCode(code);
              void saveSetting(db, 'aiCode', code.trim());
            }}
          />
        </div>
      )}
      <SwitchOption label={t('settings.arvidTalks')} help={t('settings.arvidTalksHelp')} checked={settings.arvidTalks} onChange={(on) => void saveSetting(db, 'arvidTalks', on)} />
      <SwitchOption label={t('settings.games')} help={t('settings.gamesHelp')} checked={settings.games} onChange={(on) => void saveSetting(db, 'games', on)} />
    </details>
  );
}
