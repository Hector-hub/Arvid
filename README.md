# ARVID

*Become better, every day.* Un sistema personal de constancia con forma de RPG pixel art. Es una PWA offline-first: todos los datos viven en el dispositivo.

La documentación es la fuente de verdad del proyecto. Empieza por [`docs/discovery/decision-log.md`](docs/discovery/decision-log.md) y [`docs/product/implementation-plan.md`](docs/product/implementation-plan.md).

## Requisitos
- Node 22 o superior y pnpm 12
- ImageMagick (`magick`), solo para regenerar los sprites

## Comandos
| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo en http://localhost:5173 (sin service worker) |
| `pnpm build` | Typecheck y build de producción en `dist/` (con service worker) |
| `pnpm preview` | Sirve el build en http://localhost:4173 con la misma CSP que producción |
| `pnpm test` | Pruebas unitarias, de integración y de componentes (Vitest) |
| `pnpm test:e2e` | Pruebas E2E en Chromium (Pixel 7) y WebKit (iPhone 15) contra el build. La primera vez: `pnpm exec playwright install chromium webkit` |
| `pnpm typecheck` / `pnpm lint` | TypeScript y ESLint (incluye los límites de `src/domain`) |
| `pnpm sprites` | Regenera `public/sprites/atlas.png`, los iconos de la app y `sprites.generated.ts` a partir de `scripts/sprites.txt` |

## Estructura
```
src/domain/   reglas puras (fechas, periodos, actividades, Hoy). Sin React, Dexie ni APIs del navegador.
src/data/     Dexie (IndexedDB): esquema y comandos
src/app/      React: pantallas, diseño y textos
src/pwa/      plataforma (iOS, instalación) y almacenamiento persistente
e2e/          Playwright
docs/         producto, diseño, técnica y specs por incremento
```

## Sprites
Proceden del [Kenney 1-Bit Pack](https://kenney.nl/assets/1-bit-pack) (CC0). Para regenerarlos, descomprime el ZIP en `vendor/kenney/` (la carpeta está en `.gitignore`) y ejecuta `pnpm sprites`. Cada sprite usado figura en `docs/design/asset-licenses.md`.

## Despliegue en Netlify
`netlify.toml` define el build (`pnpm build` → `dist/`), la redirección SPA, la CSP y las cabeceras de caché del service worker.

1. Crea un sitio en Netlify:
   - **Con repositorio** (GitHub, GitLab…): conecta el repo; Netlify lee `netlify.toml`.
   - **Sin repositorio:** ejecuta `pnpm build` y arrastra la carpeta `dist/` en *Sites → Add new site → Deploy manually*. Con este método no se aplica `netlify.toml`: usa el repo o la CLI (`npx netlify-cli deploy --prod`) para conservar las cabeceras.
2. Abre la URL HTTPS en el teléfono y sigue la checklist manual de `docs/specs/01-actividades-hoy/tests.md`.
