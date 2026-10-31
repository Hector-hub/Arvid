import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { saveSetting, type Settings } from '../../data/repository';
import { statusAt } from '../../domain/activities/rules';
import { useToday } from '../clock';
import type { Category } from '../../domain/categories';
import { getLocale, t, type TKey } from '../../i18n';
import { currentPersistState, isIOS, requestPersistentStorage, type PersistState } from '../../pwa/platform';
import { useCategories, useData, useRecords, useSettings } from '../data';
import { BackLink, CategoryIcon, Panel, Sprite, categoryColor } from '../design/components';
import type { SpriteName } from '../design/sprites.generated';
import { NotificationsPanel } from '../notifications/NotificationsPanel';
import { categoryName } from '../text';
import { BackupPanel, DeletePanel } from './DataPanels';
import { AccountPanel } from '../account/AccountPanel';
import { accountsEnabled } from '../account/account';
import { useOpenSound } from '../music/soundSheetContext';

const PERSIST_TEXT: Record<PersistState, { title: TKey; body: TKey }> = {
  granted: { title: 'settings.persistGranted', body: 'settings.persistGrantedText' },
  denied: { title: 'settings.persistDenied', body: 'settings.persistDeniedText' },
  unsupported: { title: 'settings.persistUnsupported', body: 'settings.persistUnsupportedText' },
};

const MOTION_OPTIONS: { value: Settings['reducedMotion']; label: TKey }[] = [
  { value: 'system', label: 'settings.motionSystem' },
  { value: 'on', label: 'settings.motionOn' },
  { value: 'off', label: 'settings.motionOff' },
];

/** Ajustes (SET-01 a SET-03, CAT-02; spec 06 PF-03). */
export function SettingsScreen() {
  const ctx = useData();
  const settings = useSettings();
  const categories = useCategories();
  const openSound = useOpenSound();

  if (!settings) return null;
  const activeCategories = categories?.filter((c) => c.active).length ?? 0;

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <BackLink to="/perfil" label={t('nav.profile')} />
      <h1>{t('settings.title')}</h1>

      {/* Lo principal en tarjetas como las de Hoy, cada una con su página (D-195) */}
      <nav aria-label={t('settings.title')}>
        <ul className="stack settings-cards" style={{ gap: 'var(--s2)' }}>
          <SettingsCard to="/ajustes/perfil" icon="nav-character" title={t('settings.profile')} text={t('settings.profileCard')} />
          <SettingsCard to="/ajustes/cuenta" icon="cat-key" title={t('settings.account')} text={t(accountsEnabled() ? 'settings.accountCardCloud' : 'settings.accountCard')} />
          <SettingsCard onClick={openSound} icon="cat-music" title={t('settings.sound')} text={t('settings.soundCard')} />
          <SettingsCard to="/ajustes/categorias" icon="cat-gem" title={t('settings.categories')} text={t('settings.categoriesCard', { count: activeCategories })} />
        </ul>
      </nav>

      <NotificationsPanel />

      <Panel>
        <fieldset className="field">
          <legend>
            <h2>{t('settings.reduceMotion')}</h2>
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
                {t(o.label)}
              </label>
            ))}
          </div>
        </fieldset>
      </Panel>

      <DeletePanel />

      <Link to="/ajustes/creditos" className="btn">
        {t('settings.credits')}
      </Link>

      <VersionLine />
    </div>
  );
}

function SettingsCard({ to, onClick, icon, title, text }: { to?: string; onClick?: () => void; icon: SpriteName; title: string; text: string }) {
  const content = (
    <>
      <span className="settings-card-icon">
        <Sprite name={icon} color="var(--xp)" />
      </span>
      <span className="grow stack" style={{ gap: 2 }}>
        <span className="settings-card-title">{title}</span>
        <span className="small muted">{text}</span>
      </span>
      <span aria-hidden="true" className="settings-card-go">
        ›
      </span>
    </>
  );
  return (
    <li>
      {/* Sonido abre su hoja (2.0.2); las demás, su página */}
      {to ? (
        <Link to={to} className="panel row settings-card">
          {content}
        </Link>
      ) : (
        <button type="button" className="panel row settings-card" onClick={onClick}>
          {content}
        </button>
      )}
    </li>
  );
}

/** Ajustes → Cuenta (D-195): la cuenta (spec 14), el almacenamiento y la copia de seguridad. */
export function SettingsAccountScreen() {
  const ctx = useData();
  const [persist, setPersist] = useState<PersistState>();

  useEffect(() => {
    void currentPersistState().then(setPersist);
  }, []);

  async function retryPersist() {
    const state = await requestPersistentStorage();
    setPersist(state);
    await saveSetting(ctx.db, 'persistGranted', state === 'granted');
  }

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <BackLink to="/ajustes" label={t('nav.settings')} />
      {/* El panel de la cuenta ya se titula «Cuenta»; el título de la página, solo para lectores de pantalla */}
      <h1 className="sr-only">{t('settings.account')}</h1>

      {/* Cuenta y copia en la nube (spec 14) */}
      <AccountPanel />

      <Panel className="stack">
        <h2>{t('settings.storage')}</h2>
        {persist && (
          <>
            <p className="pixel" style={{ color: persist === 'granted' ? 'var(--success)' : 'var(--level)' }}>
              {t(PERSIST_TEXT[persist].title)}
            </p>
            <p className="small muted">{t(PERSIST_TEXT[persist].body)}</p>
            {persist === 'denied' && (
              <button type="button" className="btn" onClick={() => void retryPersist()}>
                {t('common.retry')}
              </button>
            )}
          </>
        )}
        {isIOS() && (
          <Link to="/ajustes/instalar" className="btn">
            {t('settings.installIphone')}
          </Link>
        )}
      </Panel>

      <BackupPanel />
    </div>
  );
}

/**
 * Ajustes → Categorías (CAT-02, D-199): las activas, con cuántas de las 8 posibles se usan, y aparte las inactivas.
 * Cada fila lleva a su edición, donde se activa o desactiva.
 */
export function SettingsCategoriesScreen() {
  const categories = useCategories();
  const records = useRecords();
  const today = useToday();
  if (!categories) return null;
  // Actividades en curso (activas o en pausa) de cada categoría, según su versión más reciente
  const count = new Map<string, number>();
  for (const r of records ?? []) {
    const status = statusAt(r.events, today);
    if (status !== 'active' && status !== 'paused') continue;
    const latest = [...r.versions].sort((x, y) => y.effectiveFrom.localeCompare(x.effectiveFrom))[0];
    if (latest) count.set(latest.categoryId, (count.get(latest.categoryId) ?? 0) + 1);
  }
  const active = categories.filter((c) => c.active);
  const inactive = categories.filter((c) => !c.active);
  const row = (c: Category, text: string) => (
    <Link key={c.id} to={`/ajustes/categorias/${c.id}`} className="sound-row category-link" style={{ '--c': categoryColor(c) } as CSSProperties}>
      <span className="category-bar" aria-hidden="true" />
      <CategoryIcon category={c} />
      <span className="grow sound-row-name">
        <b>{categoryName(c)}</b>
        <span>{text}</span>
      </span>
      <span className="settings-card-go" aria-hidden="true">›</span>
    </Link>
  );
  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <BackLink to="/ajustes" label={t('nav.settings')} />
      <h1>{t('settings.categories')}</h1>
      <section className="stack" style={{ gap: 'var(--s2)' }}>
        <h2 className="sound-heading category-head">
          <span>{t('settings.categoriesActive')}</span>
          <span className="category-dots" role="img" aria-label={t('settings.categoriesUsed', { count: active.length, max: 8 })}>
            {Array.from({ length: 8 }, (_, i) => (
              <i key={i} className={i < active.length ? 'on' : undefined} />
            ))}
          </span>
        </h2>
        <div className="category-rows">{active.map((c) => row(c, t('settings.categoryActivities', { count: count.get(c.id) ?? 0 })))}</div>
      </section>
      <section className="stack" style={{ gap: 'var(--s2)' }}>
        {inactive.length > 0 && (
          <>
            <h2 className="sound-heading">{t('settings.categoriesInactive')}</h2>
            <div className="category-rows inactive">{inactive.map((c) => row(c, t('settings.categoryHidden')))}</div>
          </>
        )}
        <Link to="/ajustes/categorias/nueva" className="sound-row category-new">
          <span className="category-plus" aria-hidden="true">+</span>
          <span className="grow">{t('settings.newCategory')}</span>
        </Link>
      </section>
      <p className="small muted">{t('settings.categoriesNote')}</p>
    </div>
  );
}

/** La versión y cuándo se compiló, para distinguir dos builds de la misma versión. */
function VersionLine() {
  return (
    <p className="small muted">
      {t('settings.version', { version: __APP_VERSION__ })}
      {typeof __APP_BUILD__ === 'string' && ` · ${new Date(__APP_BUILD__).toLocaleString(getLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
    </p>
  );
}
