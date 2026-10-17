# Spec 01 — Tareas

Derivadas de spec.md. Cada tarea termina con sus tests en verde. El orden respeta las dependencias.

**Estado (2026-10-17):** T01–T15 y T17 hechas. T16: `netlify.toml` y la guía del README están listos; falta el primer despliegue (cuenta de Netlify del responsable) y la checklist manual M-01 a M-08.

| # | Tarea | Requisitos | Hecho cuando |
|---|---|---|---|
| T01 | Scaffold: Vite + React + TS + pnpm, ESLint (con `no-restricted-imports` para `domain/`), Prettier, Vitest, Playwright (Chromium + WebKit), scripts `dev/build/test/test:e2e/typecheck/lint` | NFR-04 | `pnpm typecheck && pnpm lint && pnpm test` pasan con un test de ejemplo; el test de límites de `domain/` falla si se importa react |
| T02 | `domain/time`: `LocalDate`, hoy local, inicio y fin de periodo (día, semana ISO, mes), días restantes, fechas editables | R-T1–R-T5, LOG-03 | Tests unitarios incluidos cambio de mes, año y semana ISO 53, bisiestos |
| T03 | `domain/activities`: resolver la versión vigente por fecha, estado (activa, pausada, archivada) por fecha, progreso del periodo `c de N`, `canLog` / `canUndo` | R-A1, R-A4, R-A5, ACT-04, ACT-06, LOG-02–04 | Tests unitarios con los ejemplos de spec §7 |
| T04 | `data/`: esquema Dexie v1 completo (todas las tablas de data-model.md), seed idempotente de categorías, repositorios (crear y editar actividad, eventos de estado, registrar, deshacer, ajustes) | CAT-01, ACT-02–05, LOG-01, LOG-04 | Tests de integración con fake-indexeddb |
| T05 | Assets: descargar el 1-Bit Pack (**con tu permiso**), verificar `License.txt`, extraer los sprites necesarios a un atlas, registrarlos en asset-licenses.md | UI-01 | Atlas en `public/`; registro actualizado |
| T06 | Sistema de diseño base: tokens CSS, fuentes Fontsource, componentes Panel, Button, ProgressSegments, Chip, Sprite (máscara recoloreable), BottomNav/SideNav | UI-01–UI-04 | Tests de componentes + chequeo automático de contraste de los pares de tokens |
| T07 | Shell y rutas: React Router, layout responsive, marcador de `/personaje` | PWA-05, UI-02, S1-04 | E2E: navegar entre pestañas y Atrás |
| T08 | Formulario de actividad (crear y editar) con validación | ACT-01, ACT-03, ACT-04, CAT-03 | Tests de componente + E2E crear y editar |
| T09 | Lista de actividades: grupos, reordenar, pausar, reanudar, archivar y restaurar | ACT-05, ACT-07, ACT-08 | E2E |
| T10 | Pantalla Hoy: secciones, filas, registrar y deshacer, feedback, estado vacío, "Día completo", cambio de día | HOY-01–04, HOY-06, HOY-07, LOG-05, LOG-06 | Tests de componente + E2E con reloj simulado |
| T11 | Hoja "¿Olvidaste algo ayer?" | HOY-05 | E2E |
| T12 | Detalle de actividad con la tira de días editable | DET-01–03 | E2E |
| T13 | Onboarding: bienvenida, categorías, guía de iOS, `persist()`; aviso en Hoy | ONB-01–05 | E2E (la guía se fuerza con un user-agent de iOS) |
| T14 | Ajustes mínimos: almacenamiento, movimiento reducido, categorías | SET-01–03, CAT-02 | E2E |
| T15 | PWA: manifest e iconos, service worker con precarga, prompt de actualización | PWA-01–03 | E2E offline (OFF-T1, OFF-T2) |
| T16 | Despliegue en Netlify: `netlify.toml` (CSP y cabeceras), guía de despliegue en el README | PWA-04 | La URL de Netlify abre la app y pasa la checklist manual en iPhone y Android |
| T17 | Cierre: revisión contra la spec, actualizar la documentación y la checklist manual | Todos | Definición de terminado (architecture.md §7) |
