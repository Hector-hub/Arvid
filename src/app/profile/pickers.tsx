// Selectores del perfil (spec 06): personaje en carrusel (CR), color de ARVID (AV-01), género (D-054), idioma (I18N-03)
// y alias. Los usan el onboarding, la presentación de ARVID y Ajustes → Perfil.
import { useRef, useState } from 'react';
import { ALIAS_MAX, ARVID_COLORS, GENDERS, type ArvidColor, type Gender } from '../../domain/arvid/arvid';
import { VARIANT_IDS, type Avatar, type CastId, type VariantId } from '../../domain/avatar/catalog';
import { LOCALES, t, type Locale } from '../../i18n';
import { ArvidPreview, AvatarPreview } from '../scene/Scene';
import { ARVID_RAMPS } from '../../domain/arvid/arvid';

/**
 * Valor que se muestra al momento al elegir, aunque el guardado (que vuelve por los ajustes) tarde unos milisegundos;
 * si el valor de fuera cambia por otra vía, manda ese.
 */
function useOptimistic<T>(value: T, same: (a: T, b: T) => boolean = Object.is): [T, (v: T) => void] {
  const [shown, setShown] = useState(value);
  const [outer, setOuter] = useState(value);
  if (!same(value, outer)) {
    setOuter(value);
    setShown(value);
  }
  return [shown, setShown];
}

const sameAvatar = (a: Avatar, b: Avatar) => a.cast === b.cast && a.variant === b.variant;

/** Color representativo de cada variante para su muestra (CR-03). */
const VARIANT_SWATCH: Record<VariantId, string> = {
  original: '#ffcd75',
  neon: '#05d9e8',
  carmesi: '#ec1e44',
  bosque: '#38b764',
  plata: '#d1f7ff',
  ocaso: '#7a4fd1',
};

/**
 * Carrusel de personajes (CR-01 a CR-04). La accesibilidad la dan dos grupos de `radio` (personaje y color), que
 * además se manejan con las flechas del teclado; la tarjeta es la vista y se desliza con el dedo o con ‹ ›.
 */
export function CharacterCarousel({ value: saved, order, onChange: save }: { value: Avatar; order: CastId[]; onChange: (a: Avatar) => void }) {
  const [value, setValue] = useOptimistic(saved, sameAvatar);
  const onChange = (a: Avatar) => {
    setValue(a);
    save(a);
  };
  const index = Math.max(0, order.indexOf(value.cast));
  const go = (delta: number) => onChange({ ...value, cast: order[(index + delta + order.length) % order.length]! });
  const swipeStart = useRef<number | undefined>(undefined);

  return (
    <div className="carousel stack">
      <fieldset className="sr-only-group">
        <legend className="sr-only">{t('avatar.carousel')}</legend>
        {order.map((cast, i) => (
          <label key={cast} className="sr-only">
            <input
              type="radio"
              name="character"
              checked={value.cast === cast}
              onChange={() => onChange({ ...value, cast })}
              aria-label={t('avatar.cardLabel', {
                name: t(`avatar.styles.${cast}`),
                index: i + 1,
                total: order.length,
                description: t(`avatar.descriptions.${cast}`),
              })}
            />
          </label>
        ))}
      </fieldset>

      <div
        className="carousel-stage"
        onPointerDown={(e) => (swipeStart.current = e.clientX)}
        onPointerUp={(e) => {
          if (swipeStart.current === undefined) return;
          const dx = e.clientX - swipeStart.current;
          swipeStart.current = undefined;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
      >
        <button type="button" className="btn btn-icon btn-ghost carousel-arrow" aria-label={t('common.previous')} onClick={() => go(-1)}>
          ‹
        </button>
        <div className="carousel-card" key={value.cast} aria-hidden="true">
          <AvatarPreview avatar={value} scale={3} />
          <p className="pixel carousel-name">{t(`avatar.styles.${value.cast}`)}</p>
          <p className="small muted">{t(`avatar.descriptions.${value.cast}`)}</p>
        </div>
        <button type="button" className="btn btn-icon btn-ghost carousel-arrow" aria-label={t('common.next')} onClick={() => go(1)}>
          ›
        </button>
      </div>
      <div className="carousel-dots" aria-hidden="true">
        {order.map((cast) => (
          <span key={cast} className={cast === value.cast ? 'on' : undefined} />
        ))}
      </div>

      <fieldset className="field">
        <legend className="pixel small">{t('avatar.colors')}</legend>
        <div className="swatches">
          {VARIANT_IDS.map((variant) => (
            <label key={variant} className="swatch" style={{ background: VARIANT_SWATCH[variant] }} title={t(`avatar.variants.${variant}`)}>
              <input
                type="radio"
                name="variant"
                checked={value.variant === variant}
                onChange={() => onChange({ ...value, variant })}
                aria-label={t(`avatar.variants.${variant}`)}
              />
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

/** Color de ARVID con su vista previa (AV-01). */
export function ArvidColorPicker({ value: saved, onChange: save }: { value: ArvidColor; onChange: (c: ArvidColor) => void }) {
  const [value, setValue] = useOptimistic(saved);
  const onChange = (c: ArvidColor) => {
    setValue(c);
    save(c);
  };
  return (
    <div className="stack" style={{ alignItems: 'center' }}>
      <ArvidPreview color={value} size={96} />
      <fieldset className="field">
        <legend className="sr-only">{t('settings.arvidColor')}</legend>
        <div className="swatches">
          {ARVID_COLORS.map((color) => (
            <label key={color} className="swatch" style={{ background: ARVID_RAMPS[color][3] }} title={t(`arvid.colors.${color}`)}>
              <input
                type="radio"
                name="arvid-color"
                checked={value === color}
                onChange={() => onChange(color)}
                aria-label={t(`arvid.colors.${color}`)}
              />
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export function GenderPicker({ value, onChange }: { value: Gender | undefined; onChange: (g: Gender) => void }) {
  return (
    <fieldset className="field">
      <legend className="sr-only">{t('settings.gender')}</legend>
      <div className="choice-group">
        {GENDERS.map((g) => (
          <label key={g} className="choice">
            <input type="radio" name="gender" checked={value === g} onChange={() => onChange(g)} />
            {t(`gender.${g}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function LanguagePicker({ value, onChange }: { value: Locale; onChange: (l: Locale) => void }) {
  return (
    <fieldset className="field">
      <legend className="sr-only">{t('settings.language')}</legend>
      <div className="choice-group">
        {LOCALES.map((l) => (
          <label key={l} className="choice" lang={l}>
            <input type="radio" name="language" checked={value === l} onChange={() => onChange(l)} />
            {t(`language.${l}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function AliasField({
  value,
  onChange,
  error,
  label = t('onboarding.aliasLabel'),
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  label?: string;
}) {
  return (
    <div className="field">
      <label htmlFor="alias">{label}</label>
      <input
        id="alias"
        type="text"
        value={value}
        maxLength={ALIAS_MAX * 2}
        autoComplete="nickname"
        placeholder={t('onboarding.aliasPlaceholder')}
        aria-invalid={!!error}
        aria-describedby={error ? 'alias-error' : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <p id="alias-error" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
