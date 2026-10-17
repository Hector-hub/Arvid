# ARVID — Arquitectura técnica

Estado: **aprobado** (D-040, 2026-10-17) · Implementa: D-003, D-004, D-005, D-023, D-024 · Cubre: MVP-04, MVP-08, MVP-09.

## 1. Restricciones que la determinan
| Restricción | Origen |
|---|---|
| Sin servidor ni cuentas; los datos viven en el dispositivo | D-004, D-023 |
| Funciona offline en iPhone (principal), Android y escritorio | D-003, D-005 |
| Las reglas del juego son deterministas y se derivan del historial | game-design §0 |
| La pérdida de datos es el riesgo n.º 1 | R-001, R-002 |
| Dos usuarios, poco volumen de datos (unos miles de registros al año) | D-005 |
| Coste recurrente ≈ 0 | Sección 13 del briefing |

## 2. Visión general

```
┌──────────────────────────── PWA (navegador) ────────────────────────────┐
│  app/  (React)  pantallas · componentes · tokens de diseño                │
│     │ lee con liveQuery            │ escribe con comandos                 │
│     ▼                              ▼                                      │
│  domain/  (TS puro)  ◄──  data/  (Dexie + IndexedDB, backup + Zod)        │
│  periodos · puntos · XP · atributos · Disciplina · rachas · misiones      │
│  · logros      (sin dependencias de UI, datos ni navegador)               │
│                                                                           │
│  pwa/  service worker (precarga) · instalación · storage.persist()       │
└───────────────────────────────────────────────────────────────────────────┘
        Hosting estático HTTPS en Netlify (solo sirve archivos; no ve datos) — D-041
```

**Flujo:**
1. La UI ejecuta un comando (p. ej. `logCompletion`) que escribe un **registro fuente** en IndexedDB.
2. `liveQuery` de Dexie notifica el cambio.
3. Los selectores del dominio recalculan el estado derivado para la fecha de referencia "hoy".
4. La UI se actualiza.

No hay un store global: la base de datos es el único estado persistente y la UI solo guarda estado efímero (formularios, modales).

## 3. Stack propuesto
Versiones actuales consultadas en npm el 2026-10-17.

| Pieza | Elección | Licencia | Por qué | Alternativa descartada |
|---|---|---|---|---|
| Lenguaje | TypeScript 6.0 (C-004) | Apache-2.0 | Tipos para un dominio con muchas reglas | JS sin tipos |
| UI | React 19 | MIT | Lo dominas (MathLab); ecosistema de testing | Svelte/Solid: más ligeros, pero curva nueva sin una ganancia clara para 2 usuarios |
| Build | Vite 8 | MIT | Rápido; integración PWA madura | — |
| Persistencia | Dexie 4 (+ `dexie-react-hooks`) | Apache-2.0 | Envoltorio de IndexedDB con migraciones versionadas, transacciones y `liveQuery` reactivo | IndexedDB a mano (propenso a errores); SQLite WASM + OPFS (más pesado, menos maduro en iOS) |
| PWA | `vite-plugin-pwa` 2 (Workbox) | MIT | Genera el service worker y el manifest; precarga con versionado y aviso de actualización | Service worker a mano |
| Validación | Zod 4 | MIT | Validar archivos de backup importados (datos no confiables) | Validación manual |
| Navegación | React Router 8 | MIT | El botón Atrás de Android y la URL por pantalla | Estado propio (rompe Atrás) |
| Fuentes | `@fontsource/*` | OFL-1.1 | Autoalojadas → offline y sin peticiones a terceros | Google Fonts CDN (no funciona offline y expone la IP) |
| Tests | Vitest 5 · Testing Library · fake-indexeddb · Playwright 1.64 | MIT / Apache-2.0 | Unitarios, integración con IndexedDB simulado y E2E en Chromium y WebKit con modo offline | — |
| Gráficos | **Ninguno**: radar en SVG propio | — | Control del estilo pixel y de la accesibilidad; ~150 líneas | Chart.js o Recharts (peso y estilo genérico) |
| Estado global | **Ninguno** | — | Dexie + `liveQuery` bastan | Zustand (innecesario por ahora) |

Gestor de paquetes: pnpm 12 (ya instalado). Un único paquete, **sin monorepo**: el tamaño del proyecto no lo justifica.

## 4. Módulos y límites
```
src/
  domain/      Reglas puras. Prohibido importar react, dexie o APIs del navegador.
    time/        fechas locales, periodos (día, semana ISO, mes), editabilidad
    activities/  versiones de configuración, evaluabilidad (gracia, pausa), puntos por periodo
    missions/    máquina de estados y efectos en XP, categoría y Disciplina
    scoring/     XP, niveles, títulos, atributos, Disciplina, tendencias
    streaks/     rachas y comodines
    achievements/
    config.ts    parámetros ajustables (valores de dificultad, umbrales, curva de XP)
  data/        Dexie: esquema, migraciones, repositorios (comandos), backup e import (Zod)
  app/         React: rutas, pantallas, componentes, tokens CSS, textos
  pwa/         registro del service worker, guía de instalación, persist(), estimación de espacio
```
- **Regla de dependencias:** `app → data → domain` y `app → domain`; `domain` no depende de nada. Se impone con `eslint no-restricted-imports` y un test que falla si se viola.
- **Fecha de referencia inyectada:** el dominio nunca llama a `new Date()`; recibe `today` como parámetro. Así los tests con fechas simuladas son triviales.
- **Rendimiento:** con unos miles de registros, recalcular los 90 días de ventana por completo cuesta milisegundos. No hay caché de estado derivado en el MVP. Si se mide un problema, se memoiza por `(today, versión de datos)`.

## 5. Actualizaciones y versiones
- El service worker usa el modo **"prompt"**: una versión nueva no se activa sola; la app muestra "Nueva versión disponible · Actualizar" para no recargar en mitad de una acción.
- **Versionado semántico** de la app (`package.json`), visible en Ajustes y dentro de cada backup.
- **Migraciones de IndexedDB** con `db.version(n).upgrade()` de Dexie. Cada migración tiene un test que parte de datos de la versión anterior.

## 6. Estrategia de pruebas
| Nivel | Herramienta | Qué cubre |
|---|---|---|
| Unitario (dominio) | Vitest | Cada regla R-* y cada ejemplo E-* de game-design.md; propiedades (la XP no baja salvo al deshacer; atributos entre 0 y 100; recálculo determinista) |
| Integración (datos) | Vitest + fake-indexeddb | Comandos, migraciones, backup de ida y vuelta, import de archivos corruptos |
| Componentes | Testing Library | Estados de UI (vacío, sin datos, vencida, gracia), accesibilidad básica (roles, etiquetas) |
| E2E | Playwright (Chromium + WebKit) | Flujos críticos; **offline** (`context.setOffline(true)` + recarga → los datos siguen); actualización de versión |
| Manual en dispositivo | Checklist en `tests.md` | Instalación en iPhone y Android, `persist()`, VoiceOver y TalkBack, rendimiento |

Hay que tener en cuenta que Playwright WebKit **no es** Safari de iOS: la instalación en la pantalla de inicio y la purga de almacenamiento solo se comprueban en un dispositivo real.

## 7. Definición de terminado (por incremento)
1. La spec del incremento está aprobada y cada requisito tiene tests.
2. Typecheck, lint y tests pasan; los E2E del flujo están en verde en Chromium y WebKit.
3. Funciona offline (E2E).
4. Se ha probado manualmente en iPhone y Android si el incremento toca instalación, almacenamiento o gestos.
5. La documentación afectada está actualizada.

## 8. Riesgos técnicos
| Riesgo | Mitigación |
|---|---|
| Purga de IndexedDB en iOS | Instalación guiada, `persist()`, aviso de backup (offline-strategy.md) |
| Errores de fechas (semanas ISO, zonas horarias) | Fechas locales como texto `YYYY-MM-DD`; utilidades propias, pequeñas y probadas; sin aritmética con `Date` en el dominio |
| Migraciones de datos que fallan en un dispositivo real | Tests de migración + backup automático en memoria antes de migrar; si la migración falla, se ofrece descargar los datos crudos |
| Una actualización del service worker deja la app "atascada" en una versión vieja | Modo prompt + la versión visible en Ajustes + botón de "Buscar actualización" |
| TypeScript 7 es reciente | Resuelto: se usa 6.0.3 porque typescript-eslint aún no admite la 7 (C-004) |

## 9. Hosting (D-041)
Netlify, plan gratuito: sirve el build estático por HTTPS. Las cabeceras (CSP, caché del service worker sin `max-age`) se configuran en `netlify.toml`. Netlify no recibe ni almacena datos del usuario.
