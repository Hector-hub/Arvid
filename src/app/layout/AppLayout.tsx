import { setAccessCode, setTrial } from '../arvid/brain';
import { saveSetting } from '../../data/repository';
import { NavLink, Outlet } from 'react-router';
import { useData, useSettings } from '../data';
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
import { NotificationsWatcher } from '../notifications/NotificationsWatcher';
import { CityWatcher } from '../city/CityWatcher';
import { NeighborTalk } from '../city/NeighborTalk';
import { GoalWatcher } from '../goals/GoalWatcher';
import { MemoryWatcher } from '../arvid/memory';
import { LevelUpWatcher } from './LevelUp';
import { SoundWatcher } from '../sound/SoundWatcher';
import { MusicProvider } from '../music/MusicProvider';

const TABS: { to: string; label: TKey; icon: SpriteName }[] = [
  { to: '/hoy', label: 'nav.today', icon: 'nav-today' },
  { to: '/actividades', label: 'nav.activities', icon: 'nav-activities' },
  { to: '/objetivos', label: 'nav.goals', icon: 'nav-goals' },
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
  setAccessCode(settings?.aiCode);
  // Mensajes de prueba sin código (D-135): identificador del dispositivo, creado la primera vez
  const { db } = useData();
  const trialId = settings?.trialDeviceId;
  setTrial(trialId, (left) => void saveSetting(db, 'trialLeft', left));
  useEffect(() => {
    if (settings && !trialId) void saveSetting(db, 'trialDeviceId', crypto.randomUUID());
  }, [db, settings, trialId]);

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
        <SoundWatcher />
        <LevelUpWatcher />
        <AchievementsWatcher />
        <DisciplineTipWatcher />
        <NotificationsWatcher />
        <CityWatcher />
        <NeighborTalk />
        <GoalWatcher />
        <MemoryWatcher />
        <ChatLogWatcher />
      </div>
      </MusicProvider>
    </AnalysisProvider>
  );
}
