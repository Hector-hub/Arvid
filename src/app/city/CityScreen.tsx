// Perfil → Tu ciudad (spec 11, TC): lo que ya llegó a tu calle y lo que falta, con el nivel en que llega.
import { CITY_ITEMS, isNeighbor, nextArrivalLevel, type CityItem } from '../../domain/scene/city';
import { t, useLocale } from '../../i18n';
import { useAnalysis } from '../analysis';
import { BackLink, Panel } from '../design/components';
import { CityThumb } from './CityThumb';
import { itemDescription, itemName } from './labels';

export function CityScreen() {
  useLocale();
  const level = useAnalysis()?.progress.level;
  if (level === undefined) return null;
  const done = CITY_ITEMS.filter((u) => u.level <= level).length;
  const next = nextArrivalLevel(level);

  const list = (items: typeof CITY_ITEMS) => (
    <ul className="stack city-list" style={{ gap: 'var(--s2)' }}>
      {items.map(({ item, level: at }) => (
        <CityRow key={item} item={item} at={at} unlocked={at <= level} />
      ))}
    </ul>
  );

  return (
    <div className="stack" style={{ gap: 'var(--s4)' }}>
      <BackLink to="/perfil" label={t('nav.profile')} />
      <h1>{t('city.title')}</h1>
      <p className="pixel">
        {t('city.progress', { done, total: CITY_ITEMS.length })} · {next ? t('city.next', { level: next }) : t('city.complete')}
      </p>
      <Panel className="stack">
        <h2>{t('city.thingsTitle')}</h2>
        {list(CITY_ITEMS.filter((u) => !isNeighbor(u.item)))}
      </Panel>
      <Panel className="stack">
        <h2>{t('city.neighborsTitle')}</h2>
        {list(CITY_ITEMS.filter((u) => isNeighbor(u.item)))}
      </Panel>
    </div>
  );
}

function CityRow({ item, at, unlocked }: { item: CityItem; at: number; unlocked: boolean }) {
  return (
    <li className="row" style={{ gap: 'var(--s3)' }}>
      <CityThumb item={item} unlocked={unlocked} />
      <div className="grow">
        <p className="pixel">{unlocked ? itemName(item) : t('city.locked')}</p>
        <p className="small muted">{unlocked ? itemDescription(item) : t('city.level', { level: at })}</p>
      </div>
      {unlocked && <span className="chip chip-muted">{t('city.level', { level: at })}</span>}
    </li>
  );
}
