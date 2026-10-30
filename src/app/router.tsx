import { createBrowserRouter, Navigate, useLocation, type RouteObject } from 'react-router';
import { AppLayout } from './layout/AppLayout';
import { ActivitiesScreen } from './screens/ActivitiesScreen';
import { ActivityDetailScreen } from './screens/ActivityDetailScreen';
import { ActivityFormScreen } from './screens/ActivityFormScreen';
import { ChatScreen } from './screens/ChatScreen';
import { GameScreen } from './screens/GameScreen';
import { CityScreen } from './city/CityScreen';
import { RestsScreen } from './rests/RestsScreen';
import { MemoryScreen } from './screens/MemoryScreen';
import { GoalsScreen } from './goals/GoalsScreen';
import { GoalFormScreen } from './goals/GoalFormScreen';
import { GoalDetailScreen } from './goals/GoalDetailScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { InstallGuideScreen } from './screens/InstallGuideScreen';
import { MissionDetailScreen } from './screens/missions/MissionDetailScreen';
import { MissionFormScreen } from './screens/missions/MissionFormScreen';
import { MissionsScreen } from './screens/missions/MissionsScreen';
import { CategoryFormScreen } from './screens/CategoryFormScreen';
import { CreditsScreen } from './screens/CreditsScreen';
import { AttributeDetailScreen, DisciplineDetailScreen } from './screens/profile/AttributeDetailScreen';
import { SettingsAccountScreen, SettingsCategoriesScreen, SettingsScreen } from './screens/SettingsScreen';
import { SettingsProfileScreen } from './screens/ProfileSettingsScreen';
import { SoundScreen } from './screens/SoundScreen';
import { TodayScreen } from './screens/TodayScreen';
import { FriendLinkScreen } from './friends/FriendLinkScreen';
import { FriendScreen, FriendsScreen } from './friends/FriendsScreen';
import { ChallengeFormScreen, ChallengeScreen } from './challenges/ChallengeScreens';

/** Rutas (PWA-05). */
export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/hoy" replace /> },
      { path: 'hoy', element: <TodayScreen /> },
      { path: 'actividades', element: <ActivitiesScreen /> },
      { path: 'actividades/nueva', element: <ActivityFormScreen /> },
      { path: 'actividades/misiones', element: <MissionsScreen /> },
      { path: 'actividades/misiones/nueva', element: <MissionFormScreen /> },
      { path: 'actividades/misiones/:id', element: <MissionDetailScreen /> },
      { path: 'actividades/misiones/:id/editar', element: <MissionFormScreen /> },
      { path: 'actividades/:id', element: <ActivityDetailScreen /> },
      { path: 'actividades/:id/editar', element: <ActivityFormScreen /> },
      { path: 'perfil', element: <ProfileScreen /> },
      { path: 'chat', element: <ChatScreen /> },
      { path: 'chat/memoria', element: <MemoryScreen /> },
      { path: 'juego', element: <GameScreen /> },
      { path: 'descansos', element: <RestsScreen /> },
      { path: 'objetivos', element: <GoalsScreen /> },
      { path: 'objetivos/nuevo', element: <GoalFormScreen /> },
      { path: 'objetivos/:id', element: <GoalDetailScreen /> },
      { path: 'objetivos/:id/editar', element: <GoalFormScreen /> },
      { path: 'perfil/atributo/:categoryId', element: <AttributeDetailScreen /> },
      { path: 'perfil/disciplina', element: <DisciplineDetailScreen /> },
      { path: 'perfil/ciudad', element: <CityScreen /> },
      { path: 'perfil/amigos', element: <FriendsScreen /> },
      { path: 'perfil/amigos/:id', element: <FriendScreen /> },
      { path: 'a/:id', element: <FriendLinkScreen /> },
      // Los enlaces de reto se retiraron (D-177): los que circulen llevan a Hoy
      { path: 'r/:id', element: <Navigate to="/hoy" replace /> },
      { path: 'retos/nuevo', element: <ChallengeFormScreen /> },
      { path: 'retos/:id', element: <ChallengeScreen /> },
      // La pantalla se llamaba Personaje hasta la 0.5.0 (PF-01)
      { path: 'personaje/*', element: <LegacyProfileRedirect /> },
      { path: 'ajustes', element: <SettingsScreen /> },
      { path: 'ajustes/perfil', element: <SettingsProfileScreen /> },
      { path: 'ajustes/cuenta', element: <SettingsAccountScreen /> },
      { path: 'ajustes/categorias', element: <SettingsCategoriesScreen /> },
      { path: 'sonido', element: <SoundScreen /> },
      { path: 'ajustes/instalar', element: <InstallGuideScreen /> },
      { path: 'ajustes/creditos', element: <CreditsScreen /> },
      { path: 'ajustes/categorias/nueva', element: <CategoryFormScreen /> },
      { path: 'ajustes/categorias/:id', element: <CategoryFormScreen /> },
      { path: '*', element: <Navigate to="/hoy" replace /> },
    ],
  },
];

function LegacyProfileRedirect() {
  const { pathname } = useLocation();
  return <Navigate to={pathname.replace(/^\/personaje/, '/perfil')} replace />;
}

export function createAppRouter() {
  return createBrowserRouter(routes);
}
