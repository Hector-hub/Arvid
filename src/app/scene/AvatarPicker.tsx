import { CASTS, CAST_IDS, VARIANT_IDS, VARIANT_NAMES, type Avatar } from '../../domain/avatar/catalog';
import { AvatarPreview } from './Scene';

/** Selector de protagonista y variante con vista previa animada (spec 05, PRO-02, PRO-03). */
export function AvatarPicker({ value, onChange }: { value: Avatar; onChange: (avatar: Avatar) => void }) {
  return (
    <div className="stack avatar-picker">
      <div className="row" style={{ justifyContent: 'center' }}>
        <AvatarPreview avatar={value} scale={2} />
      </div>
      <fieldset className="field">
        <legend className="pixel">Protagonista</legend>
        <div className="choice-group" style={{ marginTop: 'var(--s2)' }}>
          {CAST_IDS.map((id) => (
            <label key={id} className="choice">
              <input type="radio" name="avatar-cast" checked={value.cast === id} onChange={() => onChange({ ...value, cast: id })} />
              {CASTS[id].name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="field">
        <legend className="pixel">Colores</legend>
        <div className="choice-group" style={{ marginTop: 'var(--s2)' }}>
          {VARIANT_IDS.map((id) => (
            <label key={id} className="choice">
              <input
                type="radio"
                name="avatar-variant"
                checked={value.variant === id}
                onChange={() => onChange({ ...value, variant: id })}
              />
              {VARIANT_NAMES[id]}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
