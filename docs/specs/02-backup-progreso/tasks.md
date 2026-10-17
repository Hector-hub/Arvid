# Spec 02 — Tareas

Derivadas de spec.md (aprobada, D-045).

**Estado (2026-10-17):** T01–T13 hechas. T14: falta desplegar la versión 0.2.0 y pasar la checklist manual M2-01 a M2-04.

| # | Tarea | Requisitos | Hecho cuando |
|---|---|---|---|
| T01 | Aplicar GD-A1 y GD-A2 en game-design.md (R-A9 y la aclaración de R-S2/R-S5) y registrarlas en el decision log | GD-A1, GD-A2 | Documentos actualizados |
| T02 | `domain/activities/periods.ts`: enumerar los periodos por tramos de versión, con `c`, `N`, `r`, `E` y `P` en centésimas, `cerrado`, `evaluable` y motivo | ENG-01 a ENG-06 | Tests unitarios: E-1, E-6, ENG-02, GD-A1, pausa, archivo, reanudación |
| T03 | `domain/progress`: XP total, nivel, título, progreso dentro del nivel | PRG-01, PRG-02 | Tests: E-9, límites de nivel, XP 0 |
| T04 | `domain/streaks`: racha actual, mejor racha, comodines y periodos protegidos | STR-01 | Tests: E-5, E-7, GD-A2, pausa larga, cambio de N |
| T05 | Benchmark: un año con 10 actividades diarias | NFR2-01 | Test que falla si supera el umbral (con margen para CI) |
| T06 | `data/backup.ts`: esquema Zod del formato v1, exportar (serializar), validar (formato, versiones, tipos, integridad referencial), reemplazar en una transacción conservando los ajustes del dispositivo | BAK-01, BAK-04, BAK-06 | Tests de integración: ida y vuelta (NFR2-03), archivos corruptos, versión futura, IDs huérfanos, fallo a mitad de transacción |
| T07 | `data/`: borrar todo y volver a sembrar | DEL-01 | Test de integración |
| T08 | Ajustes → Copia de seguridad: exportar (compartir o descargar, aviso de privacidad, `lastBackupAt`), importar (resumen, confirmación, "exportar primero") | BAK-02, BAK-03, BAK-05 | Tests de componente + E2E |
| T09 | Ajustes → Eliminar todos mis datos | DEL-01 | E2E |
| T10 | Pantalla Personaje: nivel, título, barra de XP, estado vacío | PRG-03 | Test de componente |
| T11 | Hoy: indicador de nivel, racha por fila, XP en el feedback, aviso de backup | PRG-04, PRG-05, STR-02, BAK-07 | Tests de componente + E2E |
| T12 | Modal de subida de nivel + `lastCelebratedLevel` + migración sin celebraciones retroactivas | PRG-06, PRG-07 | E2E con PRG-06 |
| T13 | Detalle: racha, mejor racha, comodines, "Comodín usado" | STR-03, STR-04 | E2E |
| T14 | Cierre: despliegue en Netlify, checklist manual en los dispositivos, documentación | Todos | Definición de terminado (architecture.md §7) |
