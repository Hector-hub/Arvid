import { defineConfig, devices } from '@playwright/test';

// Se prueba el build de producción (con service worker) servido por `vite preview`.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
    // Movimiento reducido por defecto: muchas páginas animando la escena en paralelo saturan la CPU (sobre todo en
    // WebKit, que renderiza por software). Las pruebas de animación lo desactivan con emulateMedia.
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Pixel 7'] } },
    { name: 'webkit', use: { ...devices['iPhone 15'] } },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
