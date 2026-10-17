import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { AppLayout } from './layout/AppLayout';
import { ActivitiesScreen } from './screens/ActivitiesScreen';
import { ActivityDetailScreen } from './screens/ActivityDetailScreen';
import { ActivityFormScreen } from './screens/ActivityFormScreen';
import { CharacterScreen } from './screens/CharacterScreen';
import { InstallGuideScreen } from './screens/InstallGuideScreen';
import { MissionDetailScreen } from './screens/missions/MissionDetailScreen';
import { MissionFormScreen } from './screens/missions/MissionFormScreen';
import { MissionsScreen } from './screens/missions/MissionsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TodayScreen } from './screens/TodayScreen';

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
      { path: 'personaje', element: <CharacterScreen /> },
      { path: 'ajustes', element: <SettingsScreen /> },
      { path: 'ajustes/instalar', element: <InstallGuideScreen /> },
      { path: '*', element: <Navigate to="/hoy" replace /> },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
