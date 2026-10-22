import { NavLink, Outlet } from 'react-router';
import { useSettings } from '../data';
import { Sprite } from '../design/components';
import { useMotionPreference } from '../motion';
import { Onboarding } from '../screens/Onboarding';
import type { SpriteName } from '../design/sprites.generated';
import { detectLocale, setLocale, t, useLocale, type TKey } from '../../i18n';
import { useCompanionSync } from '../companion';
import { useEffect } from 'react';
import { UpdateBanner } from './UpdateBanner';
import { AnalysisProvider } from '../analysis';
import { AchievementsWatcher } from '../achievements/AchievementsWatcher';
import { ChatLogWatcher } from '../arvid/chatLog';
import { DisciplineTipWatcher } from '../arvid/disciplineTip';
import { LevelUpWatcher } from './LevelUp';
import { MusicProvider } from '../music/MusicProvider';

const TABS: { to: string; label: TKey; icon: SpriteName }[] = [
  { to: '/hoy', label: 'nav.today', icon: 'nav-today' },
  { to: '/actividades', label: 'nav.activities', icon: 'nav-activities' },
  { to: '/perfil', label: 'nav.profile', icon: 'nav-character' },
];

/** Shell de la app: navegación de 3 pestañas (UI-02) y puerta del onboarding (ONB-01). */
export function AppLayout() {
  const settings = useSettings();
  useMotionPreference(settings?.reducedMotion);
  // Idioma elegido o, si no hay, el del navegador (I18N-03); al cambiarlo se vuelve a pintar toda la app
  useLocale();
  useEffect(() => {
    if (settings) setLocale(settings.locale ?? detectLocale());
  }, [settings]);
  useCompanionSync(settings?.companion);

  if (!settings) return null;
  // El service worker se registra desde UpdateBanner: debe montarse también durante el onboarding (PWA-02).
  if (!settings.onboardingCompletedAt) return <Onboarding banner={<UpdateBanner />} />;

  return (
    <AnalysisProvider>
      <MusicProvider>
      <div className="app">
        <main className="main">
          <UpdateBanner />
          <Outlet />
        </main>
        <nav className="nav" aria-label={t('nav.main')}>
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              <Sprite name={tab.icon} />
              {t(tab.label)}
            </NavLink>
          ))}
        </nav>
        <LevelUpWatcher />
        <AchievementsWatcher />
        <DisciplineTipWatcher />
        <ChatLogWatcher />
      </div>
      </MusicProvider>
    </AnalysisProvider>
  );
}
