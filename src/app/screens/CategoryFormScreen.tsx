import { useEffect, useState, type FormEvent } from 'react';
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
import { BackLink, Sprite } from '../design/components';
import type { SpriteName } from '../design/sprites.generated';

const ICON_NAMES: Record<string, string> = {
  'cat-body': 'Corazón',
  'cat-rest': 'Cama',
  'cat-mind': 'Cara sonriente',
  'cat-learning': 'Libro',
  'cat-relationships': 'Bocadillo con corazón',
  'cat-order': 'Casa',
  'cat-key': 'Llave',
  'cat-music': 'Nota musical',
  'cat-coin': 'Moneda',
  'cat-apple': 'Manzana',
  'cat-potion': 'Frasco',
  'cat-gem': 'Gema',
  'cat-tree': 'Árbol',
  'cat-sword': 'Espada',
};

const COLOR_NAMES: Record<CategoryColor, string> = {
  orange: 'Naranja',
  sky: 'Azul',
  cyan: 'Cian',
  gold: 'Dorado',
  lime: 'Lima',
  fog: 'Gris',
  green: 'Verde',
  white: 'Blanco',
};

/** Ajustes → Categorías → nueva o editar (CAT-04 a CAT-06). */
export function CategoryFormScreen() {
  const { id } = useParams();
  const categories = useCategories();
  if (!categories) return null;
  const category = id ? categories.find((c) => c.id === id) : undefined;
  if (id && !category) return <p>Categoría no encontrada.</p>;
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

  async function submit(e: FormEvent) {
    e.preventDefault();
    const input = { name, color, icon };
    const result = category ? await updateCategory(ctx, category.id, input) : await createCategory(ctx, input);
    if (!result.ok) {
      setErrors(result.errors);
      if (result.errors.name) document.getElementById('category-name')?.focus();
      return;
    }
    navigate('/ajustes', { replace: true });
  }

  return (
    <form className="stack" style={{ gap: 'var(--s5)' }} onSubmit={(e) => void submit(e)} noValidate>
      <BackLink to="/ajustes" label="Ajustes" />
      <h1>{category ? 'Editar categoría' : 'Nueva categoría'}</h1>

      <div className="field">
        <label htmlFor="category-name">Nombre</label>
        <input
          id="category-name"
          type="text"
          value={name}
          maxLength={40}
          autoComplete="off"
          placeholder="Música"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'category-name-error' : undefined}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name && (
          <p id="category-name-error" className="field-error">
            {errors.name}
          </p>
        )}
      </div>

      <fieldset className="field">
        <legend>Color</legend>
        <div className="choice-group">
          {CATEGORY_COLORS.map((c) => (
            <label key={c} className="choice">
              <input type="radio" name="color" checked={color === c} onChange={() => setColor(c)} />
              <span aria-hidden="true" style={{ width: 20, height: 20, background: `var(--cat-${c})` }} />
              {COLOR_NAMES[c]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend>Icono</legend>
        <div className="choice-group">
          {CATEGORY_ICONS.map((i) => (
            <label key={i} className="choice" style={{ padding: 'var(--s2)' }}>
              <input type="radio" name="icon" checked={icon === i} onChange={() => setIcon(i)} aria-label={ICON_NAMES[i] ?? i} />
              <Sprite name={i as SpriteName} color={`var(--cat-${color})`} />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/ajustes')}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary grow">
          {category ? 'Guardar' : 'Crear categoría'}
        </button>
      </div>

      {category && !category.presetKey && (
        <div className="stack">
          {deletable ? (
            confirmDelete ? (
              <div className="banner stack" role="alertdialog" aria-labelledby="del-cat" style={{ alignItems: 'stretch' }}>
                <h3 id="del-cat">¿Eliminar la categoría?</h3>
                <p className="small">No tiene actividades ni misiones, así que se borra sin efectos.</p>
                <div className="row">
                  <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger grow"
                    onClick={() => void deleteCategory(ctx, category.id).then((ok) => ok && navigate('/ajustes', { replace: true }))}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
                Eliminar categoría
              </button>
            )
          ) : (
            <p className="small muted">Esta categoría tiene historial: no se puede eliminar, pero puedes desactivarla en Ajustes.</p>
          )}
        </div>
      )}
    </form>
  );
}
