import { useId, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { Category } from '../../domain/categories';
import { SPRITE_COUNT, SPRITE_TILE, SPRITES, type SpriteName } from './sprites.generated';
import { t } from '../../i18n';
import { PIXEL_ICON_RECTS } from './icons';

/** Sprite del 1-Bit Pack recoloreado con `color` (design-system §6). `scale` entero: 2 = 32 px. */
export function Sprite({
  name,
  scale = 2,
  color = 'currentColor',
  label,
}: {
  name: SpriteName;
  scale?: 1 | 2 | 3 | 4 | 6;
  color?: string;
  label?: string;
}) {
  // Los iconos redibujados en el estilo Cristal neón (D-157) se pintan en su cuadrícula de 12 px, a escala entera
  const rects = PIXEL_ICON_RECTS[name];
  if (rects) {
    const px = scale === 1 ? 12 : 12 * scale;
    return (
      <svg
        className="pixel-icon"
        width={px}
        height={px}
        viewBox="0 0 12 12"
        fill="currentColor"
        shapeRendering="crispEdges"
        style={{ color }}
        {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      >
        {rects.map(([x, y, w, h]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} />
        ))}
      </svg>
    );
  }
  const size = 16 * scale;
  const ratio = size / SPRITE_TILE;
  const style: CSSProperties = {
    width: size,
    height: size,
    color,
    WebkitMaskSize: `${SPRITE_COUNT * SPRITE_TILE * ratio}px ${size}px`,
    maskSize: `${SPRITE_COUNT * SPRITE_TILE * ratio}px ${size}px`,
    WebkitMaskPosition: `${-SPRITES[name] * size}px 0`,
    maskPosition: `${-SPRITES[name] * size}px 0`,
  };
  return label ? (
    <span className="sprite" role="img" aria-label={label} style={style} />
  ) : (
    <span className="sprite" aria-hidden="true" style={style} />
  );
}

export function categoryColor(category: Pick<Category, 'color'> | undefined): string {
  return category ? `var(--cat-${category.color})` : 'var(--text-muted)';
}

export function CategoryIcon({ category, scale = 2 }: { category: Category | undefined; scale?: 2 | 3 }) {
  return (
    <Sprite
      name={(category?.icon as SpriteName | undefined) ?? 'info'}
      scale={scale}
      color={categoryColor(category)}
    />
  );
}

/** Barra segmentada "c de N" (design-system §7). Con N grande se agrupa en 10 bloques. */
export function Segments({ count, target, color }: { count: number; target: number; color?: string }) {
  const blocks = Math.min(target, 10);
  const filled = Math.round((Math.min(count, target) / target) * blocks);
  return (
    <div className="segments" aria-hidden="true" style={color ? ({ '--seg-color': color } as CSSProperties) : undefined}>
      {Array.from({ length: blocks }, (_, i) => (
        <span key={i} className={i < filled ? 'on' : undefined} />
      ))}
    </div>
  );
}

export function Panel({
  children,
  className,
  as: Tag = 'section',
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'li';
  /** ID del encabezado que nombra la sección (la convierte en región accesible). */
  labelledBy?: string;
}) {
  return (
    <Tag className={`panel${className ? ` ${className}` : ''}`} aria-labelledby={labelledBy}>
      {children}
    </Tag>
  );
}

/** Enlace de vuelta explícito: instalada en iPhone, la app no tiene botón Atrás del navegador. */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="btn btn-ghost" style={{ alignSelf: 'flex-start', paddingLeft: 0 }}>
      <span aria-hidden="true">‹</span> {label}
    </Link>
  );
}

/** Barra de XP del nivel actual (PRG-03, PRG-04). */
export function XpBar({ xp, start, next, compact = false }: { xp: number; start: number; next: number; compact?: boolean }) {
  const ratio = Math.max(0, Math.min(1, (xp - start) / (next - start)));
  return (
    <div
      className="xpbar"
      role="progressbar"
      aria-label={t('level.xpBar')}
      aria-valuemin={start}
      aria-valuemax={next}
      aria-valuenow={xp}
      style={{ height: compact ? 8 : 14 }}
    >
      <span style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

/** Un ajuste con interruptor a la derecha; la ayuda va debajo del nombre y se anuncia como descripción. */
export function SwitchOption({ label, help, checked, onChange, musicControl = false }: { label: string; help?: string; checked: boolean; onChange: (on: boolean) => void; musicControl?: boolean }) {
  const id = useId();
  return (
    <div className="sound-option">
      <span className="grow">
        <label htmlFor={id}>{label}</label>
        {help && (
          <span id={`${id}-help`} className="small muted">
            {help}
          </span>
        )}
      </span>
      <input
        id={id}
        type="checkbox"
        className="switch"
        checked={checked}
        aria-describedby={help ? `${id}-help` : undefined}
        onChange={(e) => onChange(e.target.checked)}
        data-music-control={musicControl ? '' : undefined}
      />
    </div>
  );
}
