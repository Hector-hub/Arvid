// Drones del cielo (spec 05, ESC-13): atlas propio `public/scene/sky.png` generado por scripts/build-sky.sh a partir
// del Free Drones Pack de CraftPix. Una fila por distancia y modelo, con el dron ya reducido y teñido del cielo.
import type { SkyDepth } from '../../domain/scene/scene';
import { SKY_SPRITES } from './sky.generated';

/** Distancias del atlas: lejos, en medio y cerca. */
const DEPTHS = 3;
export const SKY_MODELS = SKY_SPRITES.length / DEPTHS;

/** Fila del atlas de un modelo a una distancia. */
export const skySprite = (model: number, depth: SkyDepth) => SKY_SPRITES[depth * SKY_MODELS + model];
