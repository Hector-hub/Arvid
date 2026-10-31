import { getLocale, t } from '../../i18n';
import { BackLink } from '../design/components';
import { RELEASES, type ChangeKind, type Release } from './changelog';

/**
 * Novedades (2.0.4): se abre tocando la versión en Ajustes. Lo de la versión mayor actual, las funciones nuevas de sus
 * versiones medias y las correcciones de las menores, de la más nueva a la más antigua.
 */
export function WhatsNewScreen() {
  const major = __APP_VERSION__.split('.')[0] ?? '';
  const ofMajor = RELEASES.filter((r) => r.version.split('.')[0] === major);
  const of = (kind: ChangeKind) => ofMajor.filter((r) => r.kind === kind);
  const main = of('major')[0];
  return (
    <div className="stack whats-new" style={{ gap: 'var(--s5)' }}>
      <BackLink to="/ajustes" label={t('nav.settings')} />
      <header className="stack" style={{ gap: 'var(--s1)' }}>
        <h1>{t('whatsNew.title')}</h1>
        <p className="small muted">{t('whatsNew.current', { version: __APP_VERSION__ })}</p>
      </header>

      {main && (
        <section className="whats-new-major" aria-labelledby="wn-major">
          <h2 id="wn-major" className="whats-new-major-title">
            {t('whatsNew.major', { major })}
          </h2>
          <ul className="whats-new-list">
            {main.items[getLocale()].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      <div>
        <Group title={t('whatsNew.features')} releases={of('feature')} />
        <Group title={t('whatsNew.fixes')} releases={of('fix')} />
      </div>
    </div>
  );
}

/** Plegada al abrir, como un acordeón: lo primero que se ve es lo de la versión mayor. */
function Group({ title, releases }: { title: string; releases: Release[] }) {
  if (releases.length === 0) return null;
  return (
    <details className="sound-settings whats-new-group">
      <summary>
        <h2 className="sound-heading">{title}</h2>
        <span className="sound-settings-chevron" aria-hidden="true">
          ›
        </span>
      </summary>
      <div className="stack" style={{ gap: 'var(--s3)', paddingBottom: 'var(--s3)' }}>
        {releases.map((r) => (
          <div key={r.version} className="whats-new-release">
            <span className="whats-new-version">{r.version}</span>
            <ul className="whats-new-list">
              {r.items[getLocale()].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
