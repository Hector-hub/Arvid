import type { Category } from '../../domain/categories';
import { MIN_ITEMS, type ProfileScores } from '../../domain/attributes/attributes';
import { radarGeometry, type Point, type RadarShape } from '../../domain/attributes/radar';
import { CategoryIcon, categoryColor } from '../design/components';
import { t } from '../../i18n';
import { categoryName } from '../text';

const SIZE = 280;
const pts = (points: Point[]) => points.map((p) => `${p.x},${p.y}`).join(' ');

/** Radar de atributos en SVG propio (PJ-02, R-AT6, R-AT7). Devuelve `null` con menos de 3 categorías. */
export function Radar({ categories, current, previous }: { categories: Category[]; current: ProfileScores; previous: ProfileScores }) {
  const g = radarGeometry(
    categories.map((c) => ({
      id: c.id,
      value: current.attributes.get(c.id)?.value,
      previous: previous.attributes.get(c.id)?.value,
    })),
    SIZE,
  );
  if (!g) return null;

  const summary = categories
    .map((c) => {
      const s = current.attributes.get(c.id);
      return `${categoryName(c)} ${s?.value ?? t('score.noData', { items: s?.items ?? 0, min: MIN_ITEMS })}`;
    })
    .join(', ');

  return (
    <div className="radar" style={{ position: 'relative', width: '100%', maxWidth: 320, aspectRatio: '1 / 1', margin: '0 auto' }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={t('score.radar', { summary })} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {g.rings.map((ring, i) => (
          <polygon key={i} points={pts(ring)} fill="none" stroke="var(--border)" strokeWidth={i === g.rings.length - 1 ? 2 : 1} />
        ))}
        {g.axes.map((a) => (
          <line
            key={a.id}
            x1={g.center.x}
            y1={g.center.y}
            x2={a.end.x}
            y2={a.end.y}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray={a.point ? undefined : '3 4'}
          />
        ))}
        <Shape shape={g.previous} stroke="var(--c-fog)" dashed />
        <Shape shape={g.current} stroke="var(--xp)" fill="var(--xp)" />
        {g.axes.map((a) =>
          a.point ? (
            <rect key={a.id} x={a.point.x - 3} y={a.point.y - 3} width={6} height={6} fill="var(--xp)" />
          ) : (
            <text key={a.id} x={a.end.x} y={a.end.y + 5} textAnchor="middle" fontSize={14} fill="var(--text-muted)" fontFamily="var(--font-pixel)">
              ?
            </text>
          ),
        )}
      </svg>
      {g.axes.map((a, i) => (
        <span
          key={a.id}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: `${(a.label.x / SIZE) * 100}%`,
            top: `${(a.label.y / SIZE) * 100}%`,
            transform: 'translate(-50%, -50%)',
            lineHeight: 0,
            color: categoryColor(categories[i]),
          }}
        >
          <CategoryIcon category={categories[i]} />
        </span>
      ))}
    </div>
  );
}

function Shape({ shape, stroke, fill, dashed }: { shape: RadarShape; stroke: string; fill?: string; dashed?: boolean }) {
  const dash = dashed ? '6 4' : undefined;
  if (shape.polygon) {
    return <polygon points={pts(shape.polygon)} fill={fill ?? 'none'} fillOpacity={fill ? 0.3 : undefined} stroke={stroke} strokeWidth={2} strokeDasharray={dash} />;
  }
  return (
    <g>
      {shape.segments.map(([a, b], i) => (
        <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={2} strokeDasharray={dash} />
      ))}
    </g>
  );
}
