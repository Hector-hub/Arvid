import { useRegisterSW } from 'virtual:pwa-register/react';
import { Sprite } from '../design/components';
import { t } from '../../i18n';

/** PWA-03: una versión nueva no se activa sola; se ofrece actualizar. */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  if (!needRefresh) return null;
  return (
    <div className="banner" role="status" style={{ marginBottom: 'var(--s4)' }}>
      <Sprite name="info" color="var(--level)" />
      <p className="grow">{t('update.available')}</p>
      <button type="button" className="btn btn-primary" onClick={() => void updateServiceWorker(true)}>
        {t('update.update')}
      </button>
    </div>
  );
}
