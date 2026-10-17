import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { saveSetting, setCategoryActive, type Settings } from '../../data/repository';
import type { Category } from '../../domain/categories';
import { currentPersistState, isIOS, requestPersistentStorage, type PersistState } from '../../pwa/platform';
import { useCategories, useData, useSettings } from '../data';
import { BackLink, CategoryIcon, Panel } from '../design/components';
import { BackupPanel, DeletePanel } from './DataPanels';

const PERSIST_TEXT: Record<PersistState, { title: string; body: string }> = {
  granted: { title: 'Protegido', body: 'El navegador no borrará tus datos para liberar espacio.' },
  denied: {
    title: 'No protegido',
    body: 'El navegador podría borrar tus datos si falta espacio. Instalar la app suele resolverlo.',
  },
  unsupported: { title: 'No soportado', body: 'Este navegador no permite pedir almacenamiento protegido.' },
};

const MOTION_OPTIONS: { value: Settings['reducedMotion']; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'on', label: 'Activado' },
  { value: 'off', label: 'Desactivado' },
];

/** Ajustes mínimos (SET-01 a SET-03, CAT-02). */
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
      <BackLink to="/personaje" label="Personaje" />
      <h1>Ajustes</h1>

      <Panel className="stack">
        <h2>Almacenamiento</h2>
        {persist && (
          <>
            <p className="pixel" style={{ color: persist === 'granted' ? 'var(--success)' : 'var(--level)' }}>
              {PERSIST_TEXT[persist].title}
            </p>
            <p className="small muted">{PERSIST_TEXT[persist].body}</p>
            {persist === 'denied' && (
              <button type="button" className="btn" onClick={() => void retryPersist()}>
                Reintentar
              </button>
            )}
          </>
        )}
        {isIOS() && (
          <Link to="/ajustes/instalar" className="btn">
            Cómo instalar en iPhone
          </Link>
        )}
      </Panel>

      <Panel className="stack">
        <h2>Categorías</h2>
        <p className="small muted">Las categorías activas aparecen al crear actividades y en tu radar (máximo 8).</p>
        <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {categories?.map((c) => (
            <CategoryToggle key={c.id} category={c} />
          ))}
        </ul>
        <Link to="/ajustes/categorias/nueva" className="btn">
          Nueva categoría
        </Link>
      </Panel>

      <Panel>
        <fieldset className="field">
          <legend>
            <h2>Reducir movimiento</h2>
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
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
      </Panel>

      <BackupPanel />
      <DeletePanel />

      <p className="small muted">ARVID {__APP_VERSION__}</p>
    </div>
  );
}

function CategoryToggle({ category }: { category: Category }) {
  const ctx = useData();
  const [error, setError] = useState<string>();

  async function toggle(active: boolean) {
    const result = await setCategoryActive(ctx, category.id, active);
    if (result.ok) setError(undefined);
    else if (result.reason === 'in-use')
      setError(
        `Tiene ${result.count} ${result.count === 1 ? 'actividad' : 'actividades'}. Archívalas o cámbialas de categoría primero.`,
      );
    else if (result.reason === 'last-active') setError('Necesitas al menos una categoría activa.');
    else setError('Máximo 8 categorías activas.');
  }

  return (
    <li className="stack" style={{ gap: 'var(--s1)' }}>
      <label className="choice">
        <input type="checkbox" checked={category.active} onChange={(e) => void toggle(e.target.checked)} />
        <CategoryIcon category={category} />
        <span className="grow">{category.name}</span>
        <span className={`chip ${category.active ? 'chip-done' : 'chip-muted'}`}>
          {category.active ? 'Activa' : 'Inactiva'}
        </span>
      </label>
      <Link to={`/ajustes/categorias/${category.id}`} className="small" style={{ alignSelf: 'flex-end' }} aria-label={`Editar ${category.name}`}>
        Editar
      </Link>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </li>
  );
}
