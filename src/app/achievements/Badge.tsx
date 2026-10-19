import { ACHIEVEMENT_IDS, type AchievementId } from '../../domain/achievements/achievements';

/** Atlas de insignias (IN-02): una fila de celdas de 64 px en el orden de ACHIEVEMENT_IDS; scripts/build-badges.sh. */
export const BADGE_ATLAS = '/achievements/badges.png';
export const BADGE_CELL = 64;

/** Insignia de un logro: a color si está ganado y en gris si no (IN-03). Decorativa: el nombre va aparte. */
export function Badge({ id, earned, size = 64 }: { id: AchievementId; earned: boolean; size?: 48 | 64 | 128 }) {
  const index = ACHIEVEMENT_IDS.indexOf(id);
  return (
    <span
      className={earned ? 'badge' : 'badge locked'}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${BADGE_ATLAS})`,
        backgroundSize: `${ACHIEVEMENT_IDS.length * size}px ${size}px`,
        backgroundPosition: `${-index * size}px 0`,
        // Ampliada, nítida; reducida (aviso), suavizada para que no pierda líneas
        imageRendering: size >= BADGE_CELL ? 'pixelated' : 'auto',
      }}
    />
  );
}
