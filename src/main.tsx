import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/pixelify-sans/latin-500.css';
import '@fontsource/atkinson-hyperlegible-next/latin-400.css';
import '@fontsource/atkinson-hyperlegible-next/latin-500.css';
import './app/design/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { ArvidDB } from './data/db';
import { createContext, ensureSeed } from './data/repository';
import { DataProvider } from './app/data';
import { createAppRouter } from './app/router';
import { Splash } from './app/layout/Splash';

const db = new ArvidDB();
const ctx = createContext(db);
const router = createAppRouter();

void ensureSeed(ctx).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Splash>
        <DataProvider value={ctx}>
          <RouterProvider router={router} />
        </DataProvider>
      </Splash>
    </StrictMode>,
  );
});
