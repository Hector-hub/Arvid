# Spec 05 — Tareas

Derivadas de spec.md (aprobada, D-050).

**Estado (2026-10-18):** T01 hecha. T00 pendiente del responsable del producto; condiciona qué assets entran (LIC-01).

| # | Tarea | Requisitos | Hecho cuando |
|---|---|---|---|
| T00 | **Responsable del producto:** verificar las licencias pendientes de §9 (Residents, dron, sprite-ai.art, 7 pistas) | LIC-01, S5-08 | Cada fila de §9 está ✔ o el recurso queda descartado |
| T01 | Registrar S5-01 a S5-09 en el decision log; enmendar D-029, D-036, design-system §1, §6 y §12, mvp-scope e implementation-plan | §10 | Documentos actualizados |
| T02 | `asset-licenses.md`: una fila por recurso verificado, con la columna "Uso" (recoloreado, recortado, reducido o en espejo). Copiar a `public/` solo lo verificado | LIC-01 | Registro completo; build sin assets sin registrar |
| T03 | `domain/avatar`: catálogo de protagonistas y variantes como datos puros (ids, fotogramas, anclajes, roles y gamas), con normalización de valores desconocidos | PRO-01, §5 | Tests unitarios |
| T04 | `domain/scene`: simulación pura y determinista con semilla. Estado: desplazamiento, farolas, vehículos, peatones, dron y partículas; `step(state, dt, rng)` y generadores de aparición | ESC-02 a ESC-07, ESC-09, PAR | Tests: avance independiente de la frecuencia, alternancia de sentidos, frecuencia de peatones, partículas |
| T05 | `app/scene/recolor`: recoloreado por roles sobre canvas y caché por variante | PRO-04, NFR5-03 | Tests de componente + rendimiento |
| T06 | `app/scene/SceneCanvas`: carga diferida de assets, dibujo del estado, `IntersectionObserver` y `visibilitychange`, movimiento reducido en vivo y respaldo ante fallo | ESC-01, ESC-08, ESC-10 a ESC-12, NFR5-01, NFR5-04 a NFR5-06 | Tests de componente + E2E |
| T07 | Servicio de escena compartido entre Hoy y Personaje, con cola de ráfagas pendientes (regla de los 10 s) | UB-04, PAR-01 a PAR-04 | Tests unitarios + E2E |
| T08 | Integrar en Hoy (escena, fecha y botón ♪) y en Personaje (escena con nivel y título superpuestos) | UB-01 a UB-03 | Tests de componente + E2E |
| T09 | Onboarding "Elige tu protagonista" y Ajustes → Apariencia | PRO-02, PRO-03, PRO-05 | Tests de componente + E2E |
| T10 | `app/music`: reproductor (barajado, fundidos, `GainNode`, pausa con la app oculta, arranque con gesto) y Ajustes → Sonido | MUS-01 a MUS-06 | Tests unitarios del barajado + de componente |
| T11 | Service worker: caché de música en tiempo de ejecución con peticiones por rangos; lista de pistas disponibles sin conexión | MUS-07 | E2E sin conexión |
| T12 | Tokens `--glow-*` y su aplicación; verificación de contraste sin brillo | DIS-01 a DIS-03 | Test de contraste + revisión visual |
| T13 | Ajustes → Créditos | LIC-02 | Test de componente |
| T14 | Cierre: versión 0.5.0, documentación, despliegue y checklist manual M5 | Todos | Definición de terminado |
