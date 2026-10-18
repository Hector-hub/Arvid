# ARVID — Alcance del MVP

Estado: **aprobado** (D-031, 2026-10-17). Los criterios de aceptación de esta página son de alto nivel; cada spec en `docs/specs/<feature>/` los detalla con escenarios Given/When/Then y requisitos con ID estable.

Complejidad: S (días) · M (1–2 semanas) · L (más de 2 semanas), para una persona.

## Experiencia completa del MVP
1. Instalo ARVID en mi teléfono y elijo las categorías que me importan.
2. Creo mis actividades ("Gym 4 veces/semana · Cuerpo · Media") y alguna misión única.
3. Cada día abro **Hoy**, veo qué me falta y marco lo que hago, incluso sin conexión.
4. Mi personaje sube de nivel, gana títulos y logros; su hoja muestra mis atributos y mi Disciplina de los últimos 30 días.
5. Si fallo, los atributos bajan, pero lo ganado no se pierde y volver se recupera y se celebra.
6. Hago un backup de vez en cuando para no perder nada.

## P0 — Imprescindible para lanzar

### MVP-01 · Actividades recurrentes
- **Problema:** necesito definir lo que quiero hacer con regularidad.
- **Valor:** es el núcleo del sistema de constancia (D-006, D-007).
- **Complejidad:** M · **Depende de:** MVP-06, MVP-08.
- **Riesgos:** demasiadas opciones en el formulario; editar la configuración a mitad de un periodo.
- **Aceptación:** crear, editar, pausar, reanudar y archivar; frecuencia diaria, semanal o mensual × N; categoría; dificultad; registrar y deshacer; registro retroactivo según D-021.
- **Verificación:** tests de reglas (unitarios) + tests E2E del flujo de creación y registro.

### MVP-02 · Misiones únicas
- **Problema:** hay compromisos puntuales que también me hacen mejorar.
- **Valor:** responsabilidad con lo que me propongo (D-018, D-020b).
- **Complejidad:** S–M · **Depende de:** MVP-04, MVP-06.
- **Riesgos:** que ARVID se convierta en un gestor de tareas.
- **Aceptación:** crear con fecha límite opcional; completar, vencer, reprogramar y abandonar; penalización única en Disciplina; recuperación al completarla tarde.
- **Verificación:** tests de reglas con fechas simuladas + E2E.

### MVP-03 · Pantalla Hoy
- **Problema:** al abrir la app necesito saber qué hacer ya.
- **Valor:** reduce la fricción diaria, que es el principal motor del abandono.
- **Complejidad:** M · **Depende de:** MVP-01, MVP-02, MVP-04.
- **Riesgos:** saturación de información.
- **Aceptación:** muestra lo pendiente de hoy y de los periodos abiertos (con "te quedan N días"), misiones próximas o vencidas, el progreso del día; se puede registrar con un toque.
- **Verificación:** E2E con datos de prueba; revisión de usabilidad en móvil.

### MVP-04 · Motor de reglas
- **Problema:** las recompensas deben ser coherentes, deterministas y explicables.
- **Valor:** confianza en los números.
- **Complejidad:** M · **Depende de:** `docs/design/game-design.md` aprobado.
- **Riesgos:** fechas, zonas horarias y casos límite.
- **Aceptación:** XP, nivel, títulos, atributos, Disciplina, rachas y comodines calculados como funciones puras a partir del historial de registros; los ejemplos numéricos de game-design.md se cumplen exactamente.
- **Verificación:** tests unitarios con cada ejemplo de game-design.md + tests basados en propiedades (p. ej. "la XP nunca baja salvo al deshacer").

### MVP-05 · Hoja de personaje
- **Problema:** quiero entender mis fortalezas y lo que estoy descuidando.
- **Valor:** autoconocimiento y motivación visual (D-015, D-025, D-026).
- **Complejidad:** M · **Depende de:** MVP-04, MVP-10.
- **Riesgos:** el radar puede ser ilegible en pantallas pequeñas; puntuaciones malinterpretadas.
- **Aceptación:** personaje fijo, nivel, título, barra de XP; radar con 3–8 ejes y selector 7/30/90 con superposición; medidor de Disciplina; "sin datos" cuando corresponda; explicación de cada puntuación; vista alternativa en lista.
- **Verificación:** tests de componentes + revisión de accesibilidad (lector de pantalla, contraste).

### MVP-06 · Categorías
- **Problema:** clasificar las actividades por aspecto de vida.
- **Valor:** da forma al radar (D-017).
- **Complejidad:** S · **Depende de:** MVP-08.
- **Aceptación:** categorías predefinidas activables; crear, renombrar y archivar propias; máximo 8 activas; una categoría con historial no se borra, se archiva.
- **Verificación:** tests unitarios + E2E.

### MVP-07 · Logros
- **Problema:** hacen falta metas intermedias y celebrar los hitos, incluido volver.
- **Valor:** refuerzo positivo (D-016).
- **Complejidad:** S · **Depende de:** MVP-04, MVP-10.
- **Aceptación:** set inicial de logros (game-design.md §7); se desbloquean una vez y no dan XP.
- **Verificación:** tests unitarios por logro.

### MVP-08 · PWA offline y persistencia
- **Problema:** debo poder usarla sin Internet y no perder datos.
- **Valor:** fiabilidad (D-023).
- **Complejidad:** M · **Depende de:** —.
- **Riesgos:** R-001, R-002.
- **Aceptación:** instalable; funciona sin conexión tras la primera carga; los datos sobreviven al cierre; migraciones versionadas; onboarding de instalación en iOS; `persist()` solicitado y su estado visible en Ajustes.
- **Verificación:** E2E con Playwright en modo offline; prueba manual en iPhone y Android reales (checklist).

### MVP-09 · Backup
- **Problema:** sin sync, un fallo del dispositivo borra todo.
- **Valor:** tranquilidad (D-024).
- **Complejidad:** S · **Depende de:** MVP-08.
- **Aceptación:** exportar un archivo JSON versionado; importarlo con validación y confirmación (reemplaza los datos actuales); aviso si han pasado más de 7 días desde el último backup.
- **Verificación:** test de ida y vuelta (export → import → estado idéntico); test de archivos corruptos o de versión antigua.

### MVP-10 · Sistema de diseño pixel moderno
- **Problema:** la estética debe ser consistente y sostenible.
- **Valor:** identidad de juego sin perder legibilidad (D-027, D-028).
- **Complejidad:** M · **Depende de:** `docs/design/design-system.md`.
- **Riesgos:** R-005.
- **Aceptación:** tokens (paleta, tipografía, espaciado, bordes); componentes base; assets con licencia registrada; modo de movimiento reducido; contraste AA en el texto.
- **Ampliación (D-050):** escena neón animada en Hoy y Personaje, protagonista elegible con variantes de color, partículas y música opcional. Detalle en `docs/specs/05-escena-neon/`.
- **Verificación:** revisión visual + chequeo automático de contraste.

## P1 — Después del lanzamiento
Push con el resumen diario (micro-servidor) y badge en el icono · Insights (tendencias por actividad, resumen semanal) · Descansos planificados · Objetivos con hitos · Retos temporales · Efectos de sonido (la música opcional se adelanta al MVP, D-050).

## P2 — Futuro o experimental
Sync y cuentas · Cosméticos · Personaje evolutivo · Refugio o mundo · Tipo "hábito a reducir" · App nativa con Capacitor.

## Excluido explícitamente
Monedas, tienda, inventario, equipamiento, competición o ranking social, generación de misiones con IA.
