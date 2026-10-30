import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { categoryHasHistory, createCategory, deleteCategory, updateCategory } from '../../data/categories';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  suggestColor,
  type Category,
  type CategoryColor,
  type CategoryInputErrors,
} from '../../domain/categories';
import { useCategories, useData } from '../data';
import { BackLink, Sprite, SwitchOption } from '../design/components';
import { setCategoryActive } from '../../data/repository';
import type { SpriteName } from '../design/sprites.generated';
import { t, tDynamic } from '../../i18n';
import { CATEGORY_NAME_MAX } from '../../domain/config';
import { errorText } from '../text';

/** Ajustes → Categorías → nueva o editar (CAT-04 a CAT-06). */
export function CategoryFormScreen() {
  const { id } = useParams();
  const categories = useCategories();
  if (!categories) return null;
  const category = id ? categories.find((c) => c.id === id) : undefined;
  if (id && !category) return <p>{t('categoryForm.notFound')}</p>;
  return <CategoryForm key={id ?? 'new'} category={category} defaultColor={suggestColor(categories)} />;
}

function CategoryForm({ category, defaultColor }: { category?: Category; defaultColor: CategoryColor }) {
  const ctx = useData();
  const navigate = useNavigate();
  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState<CategoryColor>(category?.color ?? defaultColor);
  const [icon, setIcon] = useState(category?.icon ?? 'cat-key');
  const [errors, setErrors] = useState<CategoryInputErrors>({});
  const [deletable, setDeletable] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (category && !category.presetKey) void categoryHasHistory(ctx, category.id).then((used) => setDeletable(!used));
  }, [ctx, category]);

  // Al editar, cada cambio se guarda al momento (D-200); al crear, con «Crear categoría»
  async function autosave(next: { name: string; color: CategoryColor; icon: string }) {
    if (!category) return;
    const result = await updateCategory(ctx, category.id, next);
    setErrors(result.ok ? {} : result.errors);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (category) return;
    const result = await createCategory(ctx, { name, color, icon });
    if (!result.ok) {
      setErrors(result.errors);
      if (result.errors.name) document.getElementById('category-name')?.focus();
      return;
    }
    navigate('/ajustes/categorias', { replace: true });
  }

  return (
    <form className="stack category-form" style={{ gap: 'var(--s4)', '--c': `var(--cat-${color})` } as CSSProperties} onSubmit={(e) => void submit(e)} noValidate>
      <BackLink to="/ajustes/categorias" label={t('settings.categories')} />
      <h1>{category ? t('categoryForm.editTitle') : t('categoryForm.newTitle')}</h1>

      {/* Vista previa (D-200): así se verá en las actividades y en el radar */}
      <div className="category-preview" aria-hidden="true">
        <span className="category-preview-icon">
          <Sprite name={icon as SpriteName} scale={4} color="var(--c)" />
        </span>
        <p className="category-preview-name">{name.trim() || t('categoryForm.namePlaceholder')}</p>
        <p className="small muted">{t('categoryForm.previewNote')}</p>
      </div>

      <div className="field">
        <label htmlFor="category-name">{t('categoryForm.name')}</label>
        <input
          id="category-name"
          type="text"
          value={name}
          maxLength={40}
          autoComplete="off"
          placeholder={t('categoryForm.namePlaceholder')}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'category-name-error' : undefined}
          onChange={(e) => {
            setName(e.target.value);
            void autosave({ name: e.target.value, color, icon });
          }}
        />
        {errors.name && (
          <p id="category-name-error" className="field-error">
            {errorText(errors.name, { max: CATEGORY_NAME_MAX })}
          </p>
        )}
      </div>

      <fieldset className="field category-section">
        <legend className="sound-heading">{t('categoryForm.color')}</legend>
        <div className="swatches">
          {CATEGORY_COLORS.map((c) => (
            <label key={c} className="swatch" style={{ background: `var(--cat-${c})` }} title={t(`categoryForm.colors.${c}`)}>
              <input
                type="radio"
                name="color"
                checked={color === c}
                aria-label={t(`categoryForm.colors.${c}`)}
                onChange={() => {
                  setColor(c);
                  void autosave({ name, color: c, icon });
                }}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="field category-section">
        <legend className="sound-heading">{t('categoryForm.icon')}</legend>
        <div className="category-icons">
          {CATEGORY_ICONS.map((i) => (
            <label key={i} className="category-icon-option">
              <input
                type="radio"
                name="icon"
                checked={icon === i}
                aria-label={tDynamic(`categoryForm.icons.${i}`)}
                onChange={() => {
                  setIcon(i);
                  void autosave({ name, color, icon: i });
                }}
              />
              <Sprite name={i as SpriteName} color="var(--c)" />
            </label>
          ))}
        </div>
      </fieldset>

      {category && <ActiveSwitch category={category} />}

      {!category && (
        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/ajustes/categorias')}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn-primary grow">
            {t('categoryForm.create')}
          </button>
        </div>
      )}

      {category && !category.presetKey && (
        <div className="stack">
          {deletable ? (
            confirmDelete ? (
              <div className="banner stack" role="alertdialog" aria-labelledby="del-cat" style={{ alignItems: 'stretch' }}>
                <h3 id="del-cat">{t('categoryForm.deleteConfirmTitle')}</h3>
                <p className="small">{t('categoryForm.deleteConfirmText')}</p>
                <div className="row">
                  <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger grow"
                    onClick={() => void deleteCategory(ctx, category.id).then((ok) => ok && navigate('/ajustes/categorias', { replace: true }))}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
                {t('categoryForm.deleteButton')}
              </button>
            )
          ) : (
            <p className="small muted">{t('categoryForm.hasHistory')}</p>
          )}
        </div>
      )}
    </form>
  );
}

/** Activa o inactiva (CAT-02, D-199): se guarda al momento y explica por qué no se puede si no se puede. */
function ActiveSwitch({ category }: { category: Category }) {
  const ctx = useData();
  const [error, setError] = useState<string>();
  async function toggle(active: boolean) {
    const result = await setCategoryActive(ctx, category.id, active);
    if (result.ok) setError(undefined);
    else if (result.reason === 'in-use') setError(t('settings.inUse', { count: result.count }));
    else if (result.reason === 'last-active') setError(t('settings.lastActive'));
    else setError(t('settings.tooMany'));
  }
  return (
    <div>
      <SwitchOption label={t('settings.categoryActive')} help={t('settings.categoryActiveHelp')} checked={category.active} onChange={(on) => void toggle(on)} />
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
