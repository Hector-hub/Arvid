// Formularios rellenados por el compañero (spec 12, AC-05, AC-06): los datos llegan en `location.state.draft`.
import { useState } from 'react';
import { useLocation } from 'react-router';
import { t } from '../../i18n';

/** Los datos propuestos, leídos una vez al abrir el formulario (solo al crear, no al editar algo existente). */
export function useDraft<T>(enabled = true): T | undefined {
  const location = useLocation();
  const [draft] = useState(() => (enabled ? ((location.state as { draft?: T } | null)?.draft ?? undefined) : undefined));
  return draft;
}

export function DraftBanner() {
  return (
    <div className="banner" role="status">
      <p className="small">{t('actions.draftBanner')}</p>
    </div>
  );
}
