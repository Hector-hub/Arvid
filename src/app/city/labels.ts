// Textos de la ciudad viva (spec 11): nombres de lo que llega, para anuncios y la pantalla «Tu ciudad».
import { isNeighbor, neighbor, type CityItem } from '../../domain/scene/city';
import { t } from '../../i18n';

/** «los coches», «Lía, que vuelve del trabajo»… (AN-01). */
export function itemPhrase(item: CityItem): string {
  return isNeighbor(item) ? `${neighbor(item).name}, ${t(`city.neighbors.${item}.role`)}` : t(`city.things.${item}.phrase`);
}

/** Nombre corto para la pantalla «Tu ciudad». */
export function itemName(item: CityItem): string {
  return isNeighbor(item) ? neighbor(item).name : t(`city.things.${item}.name`);
}

export function itemDescription(item: CityItem): string {
  return isNeighbor(item) ? t(`city.neighbors.${item}.role`) : t(`city.things.${item}.description`);
}

/** «a, b y c». */
export function listPhrase(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join('; ')} ${t('notifications.and')} ${parts.at(-1)}`;
}
