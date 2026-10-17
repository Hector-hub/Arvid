# Spec 03 — Tareas

Derivadas de spec.md (aprobada, D-047).

**Estado (2026-10-17):** T01–T11 hechas. T12: falta desplegar la versión 0.3.0 y pasar la checklist manual M3-01 a M3-03.

| # | Tarea | Requisitos | Hecho cuando |
|---|---|---|---|
| T01 | Añadir GD-A3 a GD-A6 a game-design §8 y registrarlas en el decision log | GD-A3 a GD-A6 | Documentos actualizados |
| T02 | `domain/missions`: tipos, derivación del estado a partir de eventos (GD-A6), contribuciones de XP, categoría y Disciplina, acciones disponibles, validación | MIS-01 a MIS-07 | Tests unitarios con todos los ejemplos de spec §6 y game-design E-3, E-4 y E-4b |
| T03 | `domain/missions/today`: selección y orden para Hoy (máximo 5) y contador para la cabecera | MHOY-01, MHOY-04 | Test con el ejemplo MHOY-01 |
| T04 | Integrar la XP de misiones en `analyze` (y en el cálculo del nivel al importar) | MIS-03, INT-01 | Tests: la XP total incluye misiones; una subida de nivel por misión |
| T05 | `data/`: comandos crear, editar, completar, desmarcar, reprogramar, quitar fecha, abandonar y eliminar, validando con el dominio dentro de la transacción; lecturas | MIS-05 a MIS-07 | Tests de integración |
| T06 | Backup: validación adicional de misiones y eventos; `recordsFromBackup` con misiones | INT-02 | Tests de integración |
| T07 | Actividades: selector "Recurrentes \| Misiones" y lista de misiones | MUI-01 | Test de componente + E2E |
| T08 | Formulario de misión (crear y editar) | MUI-02, MIS-06, MIS-07 | Test de componente |
| T09 | Detalle de misión: historial, acciones y confirmaciones | MUI-03 a MUI-05 | E2E |
| T10 | Hoy: sección Misiones, completar y deshacer con feedback, contador en la cabecera | MHOY-01 a MHOY-04 | Tests de componente + E2E con reloj simulado |
| T11 | Rendimiento | NFR3-01 | Test |
| T12 | Cierre: versión 0.3.0, documentación, despliegue y checklist manual | Todos | Definición de terminado |
