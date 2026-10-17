import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { saveSetting, setCategoryActive } from '../../data/repository';
import type { Category } from '../../domain/categories';
import { needsInstallForSafety, requestPersistentStorage } from '../../pwa/platform';
import { useCategories, useData } from '../data';
import { CategoryIcon, Panel, Sprite } from '../design/components';
import { InstallGuide } from './InstallGuide';

type Step = 'welcome' | 'categories' | 'install';

/** ONB-01 a ONB-04. */
export function Onboarding({ banner }: { banner?: ReactNode }) {
  const ctx = useData();
  const categories = useCategories();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('welcome');
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string>();

  const isSelected = (c: Category) => selection[c.id] ?? c.active;

  async function finish() {
    const persist = await requestPersistentStorage();
    await saveSetting(ctx.db, 'persistGranted', persist === 'granted');
    await saveSetting(ctx.db, 'onboardingCompletedAt', ctx.now().toISOString());
    navigate('/hoy', { replace: true });
  }

  async function confirmCategories() {
    if (!categories) return;
    if (!categories.some(isSelected)) {
      setError('Activa al menos una categoría');
      return;
    }
    // Primero activar, después desactivar, para no quedarse nunca sin categorías activas.
    const ordered = [...categories].sort((a, b) => Number(isSelected(b)) - Number(isSelected(a)));
    for (const c of ordered) {
      if (c.active !== isSelected(c)) await setCategoryActive(ctx, c.id, isSelected(c));
    }
    if (needsInstallForSafety()) setStep('install');
    else await finish();
  }

  return (
    <main className="main stack" style={{ gap: 'var(--s5)' }}>
      {banner}
      {step === 'welcome' && (
        <>
          <div className="row" style={{ justifyContent: 'center', paddingTop: 'var(--s6)' }}>
            <Sprite name="hero" scale={6} color="var(--level)" />
          </div>
          <h1 style={{ textAlign: 'center' }}>ARVID</h1>
          <p className="pixel" style={{ textAlign: 'center', color: 'var(--xp)' }}>
            Become better, every day.
          </p>
          <Panel>
            <p>
              No necesitas cambiar toda tu vida hoy. Define lo que quieres hacer cada día, semana o mes, márcalo
              cuando lo hagas y deja que tu personaje refleje tu constancia.
            </p>
          </Panel>
          <button type="button" className="btn btn-primary btn-block" onClick={() => setStep('categories')}>
            Empezar
          </button>
        </>
      )}

      {step === 'categories' && (
        <>
          <h1>Tus áreas de vida</h1>
          <p className="muted">Elige las que quieres mejorar. Podrás cambiarlas en Ajustes.</p>
          <fieldset className="stack" aria-describedby={error ? 'cat-error' : undefined}>
            <legend className="sr-only">Categorías</legend>
            {categories?.map((c) => (
              <label key={c.id} className="choice">
                <input
                  type="checkbox"
                  checked={isSelected(c)}
                  onChange={(e) => {
                    setError(undefined);
                    setSelection((s) => ({ ...s, [c.id]: e.target.checked }));
                  }}
                />
                <CategoryIcon category={c} />
                <span className="grow">{c.name}</span>
                {isSelected(c) && <span className="chip chip-done">Activa</span>}
              </label>
            ))}
          </fieldset>
          {error && (
            <p id="cat-error" className="field-error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-primary btn-block" onClick={() => void confirmCategories()}>
            Continuar
          </button>
        </>
      )}

      {step === 'install' && (
        <>
          <InstallGuide />
          <button type="button" className="btn btn-primary btn-block" onClick={() => void finish()}>
            Entendido
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => void finish()}>
            Más tarde
          </button>
        </>
      )}
    </main>
  );
}
