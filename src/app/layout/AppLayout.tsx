import { NavLink, Outlet } from 'react-router';
import { useSettings } from '../data';
import { Sprite } from '../design/components';
import { useMotionPreference } from '../motion';
import { Onboarding } from '../screens/Onboarding';
import type { SpriteName } from '../design/sprites.generated';
import { UpdateBanner } from './UpdateBanner';

const TABS: { to: string; label: string; icon: SpriteName }[] = [
  { to: '/hoy', label: 'Hoy', icon: 'nav-today' },
  { to: '/actividades', label: 'Actividades', icon: 'nav-activities' },
  { to: '/personaje', label: 'Personaje', icon: 'nav-character' },
];

/** Shell de la app: navegación de 3 pestañas (UI-02) y puerta del onboarding (ONB-01). */
export function AppLayout() {
  const settings = useSettings();
  useMotionPreference(settings?.reducedMotion);

  if (!settings) return null;
  if (!settings.onboardingCompletedAt) return <Onboarding />;

  return (
    <div className="app">
      <main className="main">
        <UpdateBanner />
        <Outlet />
      </main>
      <nav className="nav" aria-label="Principal">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
            <Sprite name={tab.icon} />
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
