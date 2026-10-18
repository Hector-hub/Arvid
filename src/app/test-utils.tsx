import { render } from '@testing-library/react';
import { createMemoryRouter, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { ArvidDB } from '../data/db';
import { ensureSeed, saveSetting, type DataContext } from '../data/repository';
import { AnalysisProvider } from './analysis';
import { DataProvider } from './data';
import { MusicProvider } from './music/MusicProvider';

let n = 0;

/** Base de datos aislada con categorías y onboarding completado. */
export async function setupData(): Promise<DataContext> {
  const db = new ArvidDB(`ui-test-${++n}-${Math.random()}`);
  let id = 0;
  const ctx: DataContext = { db, now: () => new Date(), newId: () => `id-${++id}` };
  await ensureSeed(ctx);
  await saveSetting(db, 'onboardingCompletedAt', new Date().toISOString());
  return ctx;
}

export function renderRoutes(ctx: DataContext, routes: RouteObject[], path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <DataProvider value={ctx}>
      <AnalysisProvider>
        <MusicProvider>
          <RouterProvider router={router} />
        </MusicProvider>
      </AnalysisProvider>
    </DataProvider>,
  );
}
