# Spec 04 — Tareas

Derivadas de spec.md (aprobada, D-049).

**Estado (2026-10-17):** T01–T11 hechas. Nota: el polígono del radar solo se rellena si todos los ejes tienen datos; con huecos se dibujan solo los segmentos (R-AT7). T12: falta desplegar la 0.4.0 y pasar la checklist manual M4-01 a M4-04.

| # | Tarea | Requisitos | Hecho cuando |
|---|---|---|---|
| T01 | Añadir GD-A7 a GD-A10 a game-design §5 y registrarlas en el decision log | GD-A7 a GD-A10 | Documentos actualizados |
| T02 | `EvaluatedPeriod` con `categoryId` de su versión; misiones con su categoría | GD-A9 | Tests unitarios |
| T03 | `domain/attributes`: atributos y Disciplina por ventana, ventana anterior con datos hasta la referencia, tendencia y desglose | ATR-01 a ATR-06 | Tests: E-2, E-3, E-4, E-4b, E-8, tendencia, GD-A9, GD-A10 |
| T04 | `domain/attributes/radar`: geometría del radar (ejes, vértices y segmentos según GD-A8) como datos puros | PJ-02, GD-A7, GD-A8 | Tests unitarios de geometría |
| T05 | Rendimiento | NFR4-01 | Test (mejor de 7) |
| T06 | Sprites: añadir 8 iconos para categorías propias (revisión visual), regenerar el atlas y actualizar asset-licenses.md | CAT-04 | Atlas regenerado y registro actualizado |
| T07 | `data/`: crear, editar y eliminar categorías (con nombre único y eliminación sin historial) | CAT-04 a CAT-07 | Tests de integración |
| T08 | Componente `Radar` (SVG) y `DisciplineMeter` | PJ-02, PJ-03, NFR4-02, NFR4-03 | Tests de componente: aria-label, ejes sin datos, menos de 3 categorías |
| T09 | Pantalla Personaje: selector de ventana (recordado), radar, Disciplina, lista, nota y estados vacíos | PJ-01, PJ-04 a PJ-07 | Tests de componente + E2E |
| T10 | Detalle de atributo y de Disciplina | DA-01 a DA-05 | Tests de componente + E2E |
| T11 | Ajustes → Categorías: nueva, editar, eliminar | CAT-04 a CAT-07 | Tests de componente + E2E |
| T12 | Cierre: versión 0.4.0, documentación, despliegue y checklist manual | Todos | Definición de terminado |
