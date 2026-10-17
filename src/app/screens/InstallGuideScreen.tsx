import { BackLink } from '../design/components';
import { InstallGuide } from './InstallGuide';

export function InstallGuideScreen() {
  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <BackLink to="/ajustes" label="Ajustes" />
      <InstallGuide />
    </div>
  );
}
