import { useRegisterSW } from 'virtual:pwa-register/react';
import { Sprite } from '../design/components';
import { t } from '../../i18n';

/** Lo que cambia en cada versión (2.1.0). */
const WHATS_NEW = '/ajustes/novedades';

/**
 * PWA-03: una versión nueva no se activa sola; se ofrece actualizar. «Ver» actualiza y abre las novedades: las de la
 * versión nueva solo las trae su código, así que primero se cambia la dirección y luego se recarga con la versión nueva.
 * En el onboarding no hay novedades que ver (`whatsNew={false}`).
 */
export function UpdateBanner({ whatsNew = true }: { whatsNew?: boolean }) {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  if (!needRefresh) return null;
  return (
    // En una sola línea también en móvil: cristal cian, texto corto y botón compacto (D-176)
    <div className="banner update-banner" role="status" style={{ marginBottom: 'var(--s4)' }}>
      <Sprite name="arrow-up" color="var(--c-cyan)" />
      <p className="grow">{t('update.available')}</p>
      {whatsNew && (
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            window.history.replaceState(null, '', WHATS_NEW);
            void updateServiceWorker(true);
          }}
        >
          {t('update.view')}
        </button>
      )}
      <button type="button" className="btn btn-primary" onClick={() => void updateServiceWorker(true)}>
        {t('update.update')}
      </button>
    </div>
  );
}
