import { t } from '../../i18n';
import { Sprite } from '../design/components';
import { rich } from '../text';

/** Guía de instalación en iPhone (ONB-03, offline-strategy §4). */
export function InstallGuide() {
  return (
    <div className="stack">
      <h2>{t('install.title')}</h2>
      <p>{t('install.intro')}</p>
      <ol className="stack" style={{ paddingLeft: 'var(--s5)', margin: 0 }}>
        <li>{t('install.step1')}</li>
        <li>{rich('install.step2')}</li>
        <li>{rich('install.step3')}</li>
        <li>{t('install.step4')}</li>
      </ol>
      <p className="row muted small">
        <Sprite name="info" color="var(--text-muted)" />
        {t('install.note')}
      </p>
    </div>
  );
}
