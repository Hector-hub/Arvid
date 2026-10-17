import { NavLink } from 'react-router';

/** Selector "Recurrentes | Misiones" de la pestaña Actividades (S3-05). */
export function ActivitiesTabs() {
  return (
    <nav className="tabs" aria-label="Tipo de actividad">
      <NavLink to="/actividades" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
        Recurrentes
      </NavLink>
      <NavLink to="/actividades/misiones" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
        Misiones
      </NavLink>
    </nav>
  );
}
