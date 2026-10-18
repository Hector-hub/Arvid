import { BackLink } from '../design/components';
import { InstallGuide } from './InstallGuide';
import { t } from '../../i18n';

export function InstallGuideScreen() {
  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <BackLink to="/ajustes" label={t('nav.settings')} />
      <InstallGuide />
    </div>
  );
}
