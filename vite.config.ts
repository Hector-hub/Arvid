import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

const INK = '#0b0d1a';

// Misma CSP que netlify.toml: los E2E se ejecutan contra el build con esta política (security-privacy §2).
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; " +
  "connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; " +
  "frame-src https://velvety-pasca-9a2e5c.netlify.app; frame-ancestors 'none'";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      // Service worker propio (spec 10): precarga sin conexión + notificaciones Web Push
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['icons/apple-touch-icon.png', 'sprites/atlas.png'],
      manifest: {
        name: 'ARVID',
        short_name: 'ARVID',
        description: 'Become better, every day.',
        lang: 'es',
        start_url: '/hoy',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: INK,
        background_color: INK,
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,woff2,svg,webmanifest}'],
      },
    }),
  ],
  preview: {
    headers: { 'Content-Security-Policy': CSP },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
