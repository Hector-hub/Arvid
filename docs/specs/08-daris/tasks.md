# Spec 08 — Tareas

Derivadas de spec.md (aprobada, D-094).

**Estado (2026-10-20):** 0.8.0 implementada (T01–T08); falta T09 (despliegue).

| # | Tarea | Requisitos | Hecho cuando |
|---|---|---|---|
| T01 | Registrar S8-01 a S8-06; data-model, licencias | §9 | Documentos actualizados |
| T02 | Atlas `public/scene/daris.png` (sin ojo de corazón) y recoloreado por material en `domain/arvid/companion.ts` | DC-01, NFR8-01 | Tests unitarios |
| T03 | Ajustes `companion` y `darisColor` normalizados | CO-01, DC-02 | Tests unitarios |
| T04 | Variables globales `{companion}` y `{selfO}` en i18n y textos del compañero | ID-01, ID-02 | Test de claves y de componente |
| T05 | Motor y dibujo: entrada con acelerón, contenta al hablar, corazones al celebrar, burbuja anclada; ARVID aparcado | DE | Revisión visual |
| T06 | Onboarding (paso del compañero), Ajustes → Perfil y retratos | CO-02, CO-03 | Tests de componente + E2E |
| T07 | IA: persona por compañero en las instrucciones y `companion` en la función | ID-03 | Tests unitarios |
| T08 | Pruebas y E2E | — | En verde |
| T09 | Cierre: versión 0.8.0 y despliegue con la función | — | Definición de terminado |
