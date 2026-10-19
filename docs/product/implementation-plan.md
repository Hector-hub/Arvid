# ARVID — Plan de implementación (incrementos)

Estado: **en curso** (incrementos 1–6 desplegados; versión 0.6.2) · Deriva de: mvp-scope.md (D-031), architecture.md (D-040).

Cada incremento es **vertical**: dominio, persistencia, interfaz y pruebas. Solo empieza cuando su spec en `docs/specs/` está aprobada, y termina cuando cumple la definición de terminado (architecture.md §7).

| # | Incremento | Cubre | Resultado usable | Spec |
|---|---|---|---|---|
| 1 ✔ | **Actividades + Hoy + PWA offline** (implementado y desplegado; pendiente la checklist en dispositivos) | MVP-01, MVP-03 (parcial), MVP-06 (categorías predefinidas), MVP-08, MVP-10 (base) | Instalar la app, crear actividades y marcarlas cada día sin conexión | `specs/01-actividades-hoy/` |
| 2 ✔ | **Backup + progreso básico** (implementado en 0.2.0 y desplegado; pendiente la checklist en dispositivos) | MVP-09, MVP-04 (XP, nivel, títulos, rachas, comodines) | Uso diario real sin miedo a perder datos; ver la XP y las rachas | `specs/02-backup-progreso/` |
| 3 ✔ | **Misiones** (implementado en 0.3.0 y desplegado; pendiente la checklist en dispositivos) | MVP-02, MVP-03 (misiones en Hoy) | Compromisos puntuales con sus reglas | `specs/03-misiones/` |
| 4 ✔ | **Hoja de personaje** (implementado en 0.4.0 y desplegado; pendiente la checklist en dispositivos) | MVP-05, MVP-04 (atributos, Disciplina), MVP-06 (categorías propias) | Radar, Disciplina y explicaciones | `specs/04-personaje/` |
| 5 ✔ | **Escena neón, protagonistas y música** (implementado en 0.5.0 y desplegado; pendiente la checklist en dispositivos) | MVP-10 (amplía), MVP-05, música opcional | La app se siente viva: escena animada, protagonista elegido, partículas al progresar | `specs/05-escena-neon/` |
| 6 ✔ | **Perfil, ARVID con IA, idiomas y onboarding** (0.6.0 y 0.6.1 desplegadas; 0.6.2 con ajustes de escena, música y modelo de IA; pendiente la checklist en dispositivos) | MVP-05, MVP-08, MVP-10, IA (D-059) | El usuario es el protagonista, ARVID le acompaña y conversa, en español o inglés | `specs/06-perfil-arvid/` |
| 7 | **Logros y pulido** (spec aprobada, D-083; 0.7.0 implementada) | MVP-07, revisión de accesibilidad y rendimiento, checklist en dispositivos | MVP completo | `specs/07-logros-pulido/` |

**Por qué este orden:**
- El incremento 1 permite probar en los teléfonos lo más arriesgado (instalación y persistencia en iOS) desde el primer día.
- El backup va en el incremento 2 para que el uso diario real empiece con protección (R-001).
- El perfil va después de las misiones porque Disciplina necesita los dos tipos de datos.

**Despliegue:** desde el incremento 1 se publica en Netlify (D-041), para probar en dispositivos reales.
