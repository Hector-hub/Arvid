# ARVID — Plan de implementación (incrementos)

Estado: **propuesta** · Deriva de: mvp-scope.md (D-031), architecture.md (D-040).

Cada incremento es **vertical**: dominio, persistencia, interfaz y pruebas. Solo empieza cuando su spec en `docs/specs/` está aprobada, y termina cuando cumple la definición de terminado (architecture.md §7).

| # | Incremento | Cubre | Resultado usable | Spec |
|---|---|---|---|---|
| 1 ✔ | **Actividades + Hoy + PWA offline** (implementado; pendiente despliegue y prueba en dispositivos) | MVP-01, MVP-03 (parcial), MVP-06 (categorías predefinidas), MVP-08, MVP-10 (base) | Instalar la app, crear actividades y marcarlas cada día sin conexión | `specs/01-actividades-hoy/` |
| 2 ✔ | **Backup + progreso básico** (implementado en 0.2.0; pendiente despliegue y prueba en dispositivos) | MVP-09, MVP-04 (XP, nivel, títulos, rachas, comodines) | Uso diario real sin miedo a perder datos; ver la XP y las rachas | `specs/02-backup-progreso/` |
| 3 ✔ | **Misiones** (implementado en 0.3.0; pendiente despliegue y prueba en dispositivos) | MVP-02, MVP-03 (misiones en Hoy) | Compromisos puntuales con sus reglas | `specs/03-misiones/` |
| 4 | **Hoja de personaje** | MVP-05, MVP-04 (atributos, Disciplina), MVP-06 (categorías propias) | Radar, Disciplina y explicaciones | `specs/04-personaje/` |
| 5 | **Logros y pulido** | MVP-07, revisión de accesibilidad y rendimiento, checklist en dispositivos | MVP completo | `specs/05-logros-pulido/` |

**Por qué este orden:**
- El incremento 1 permite probar en los teléfonos lo más arriesgado (instalación y persistencia en iOS) desde el primer día.
- El backup va en el incremento 2 para que el uso diario real empiece con protección (R-001).
- El perfil va después de las misiones porque Disciplina necesita los dos tipos de datos.

**Despliegue:** desde el incremento 1 se publica en Netlify (D-041), para probar en dispositivos reales.
