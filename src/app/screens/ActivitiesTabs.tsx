import { NavLink } from 'react-router';
import { t } from '../../i18n';

/** Selector "Recurrentes | Misiones" de la pestaña Actividades (S3-05). */
export function ActivitiesTabs() {
  return (
    <nav className="tabs" aria-label={t('activities.tabsLabel')}>
      <NavLink to="/actividades" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
        {t('activities.recurring')}
      </NavLink>
      <NavLink to="/actividades/misiones" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
        {t('activities.missions')}
      </NavLink>
    </nav>
  );
}
