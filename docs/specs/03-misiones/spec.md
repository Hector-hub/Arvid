# Spec 03 — Misiones

Estado: **aprobada** (D-047; aclaraciones D-046) · **implementada** 2026-10-17 en la versión 0.3.0 · desplegada en Netlify (pendiente: checklist manual M3) · Incremento 3 de implementation-plan.md
Cubre: MVP-02 (misiones únicas), MVP-03 (misiones en Hoy)
Reglas: game-design §8 (R-M1 a R-M7), §4 (R-X1), §6 (R-D1) · Decisiones: D-018, D-020, D-020b, D-032, D-033 · Datos: data-model (`missions`, `missionEvents`)

## 1. Contexto y objetivo
Además de lo recurrente, el usuario quiere comprometerse con tareas puntuales ("Revisión médica antes del viernes") y que cumplir o fallar ese compromiso tenga peso (D-020): completarlas da XP y suma a su área; dejarlas vencer penaliza la Disciplina una sola vez y se puede recuperar.

**Riesgo principal (MVP-02):** convertir ARVID en un gestor de tareas. Por eso Hoy solo muestra las misiones relevantes ahora, y la lista completa vive en Actividades.

## 2. Alcance
**Incluye:**
- Crear, editar, completar (hoy o ayer), desmarcar, reprogramar, quitar la fecha límite, abandonar y eliminar misiones.
- Estado derivado de su historial.
- XP de misiones en el nivel.
- Misiones en Hoy.
- Lista y detalle.
- Contribuciones a categoría y Disciplina **calculadas y probadas** (se mostrarán en el inc. 4).
- Backup con misiones.

**Excluye:** radar, atributos y medidor de Disciplina (inc. 4); logros de misiones L-05 a L-07 (inc. 5); recordatorios de fecha límite (P1, push); subtareas, prioridades y etiquetas (fuera del MVP: es la frontera con un gestor de tareas).

## 3. Aclaraciones de reglas (necesitan aprobación; se añadirían a game-design §8)
| ID | Hueco | Propuesta |
|---|---|---|
| **GD-A3** | `deadlineCleared` existe en el modelo, pero las reglas no dicen qué efecto tiene | Quitar la fecha límite a una misión **pendiente** equivale a reprogramarla (R-M3): sin efectos, y desde entonces nunca penaliza. A una misión **vencida** no le anula el fallo (igual que R-M4) |
| **GD-A4** | Desmarcar (R-M5) una misión completada a tiempo cuando su fecha límite ya pasó | La misión pasa a **vencida**, con el fallo fechado en su fecha límite. Desmarcar una completada tarde la devuelve a vencida |
| **GD-A5** | No se dice si se puede completar con fecha anterior a su creación | No: la fecha de finalización es hoy o ayer (R-M2) y nunca anterior al día de creación |
| **GD-A6** | Cuándo vence si se reprogramó antes de vencer | Vence al terminar el día de la fecha límite **vigente** en ese momento. Los eventos se procesan en orden de instante, y cada evento se compara con la fecha límite vigente usando su fecha local, de modo que completar "ayer" una misión con fecha de ayer cuenta a tiempo (R-M2) |

## 4. Requisitos funcionales

### 4.1 Reglas del dominio (MIS)
- **MIS-01.** El estado de una misión se deriva de sus eventos (`deadlineSet`, `deadlineCleared`, `completed`, `uncompleted`, `abandoned`) y de hoy. Estados posibles: `pending`, `completedOnTime`, `expired`, `completedLate`, `abandoned` y `abandonedExpired` (game-design §8.1).
- **MIS-02.** Vencimiento según GD-A6 (R-M1). La pérdida se registra una sola vez, en la **primera** fecha límite que vence (R-M4).
- **MIS-03.** XP: `+v` si está completada (a tiempo, sin fecha o tarde; D-032). Se suma a la XP total y al nivel (R-X1).
- **MIS-04.** Contribuciones derivadas, para el incremento 4 (R-D1):

  | Estado | Categoría | Disciplina |
  |---|---|---|
  | Completada a tiempo | `E = v`, `P = v` en la fecha de finalización | Lo mismo, solo si tenía fecha límite |
  | Vencida o abandonada vencida | — | `E = 0`, `P = v` en la fecha límite que venció |
  | Abandonada antes de vencer con fecha límite | — | `E = 0`, `P = v / 2` en la fecha de abandono (D-033) |
  | Completada tarde | — | Nada (se anula el fallo) |

- **MIS-05.** Las acciones disponibles dependen del estado:

  | Estado | Completar | Desmarcar | Reprogramar o quitar fecha | Abandonar | Eliminar |
  |---|---|---|---|---|---|
  | Pendiente | ✔ (hoy o ayer, nunca antes de su creación: GD-A5) | — | ✔ (R-M3, GD-A3) | ✔ (media penalización si tiene fecha) | Solo el mismo día de su creación (S3-03) |
  | Vencida | ✔ → completada tarde | — | ✔ (orientativa, R-M4) | ✔ (el fallo queda) | — |
  | Completada (a tiempo o tarde) | — | ✔ si su fecha de finalización es editable (R-M5) | — | — | — |
  | Abandonada | Ninguna acción: es definitiva (R-M6) | | | | |

- **MIS-06.** **Edición:** el título se puede editar siempre. La categoría y la dificultad solo mientras está **pendiente** (S3-02), para que una penalización o una XP ya fijadas no cambien retroactivamente.
- **MIS-07.** **Validación:** título de 1 a 60 caracteres; categoría activa; dificultad; fecha límite opcional y **≥ hoy al crear o reprogramar** (S3-01).

### 4.2 Misiones en Hoy (MHOY)
- **MHOY-01.** Sección **"Misiones"** después de las actividades, con hasta 5 misiones en este orden:
  1. Vencidas.
  2. Con fecha límite hoy.
  3. Con fecha en los próximos 3 días.
  4. Sin fecha, de la más antigua a la más nueva.

  Si hay más, aparece el enlace "Ver todas (N)" (S3-04).
- **MHOY-02.** Cada fila muestra el icono de categoría, el título y el plazo ("vence hoy", "vence mañana", "vence el vie 23", "sin fecha" o el chip "Vencida"), con un botón "Completar" (≥ 44 px).
- **MHOY-03.** Al completar, el feedback dice "Misión cumplida · +10 XP" (o "Misión recuperada · +10 XP" si estaba vencida). La misión se queda en la sección como "Completada" hasta mañana, con la opción "Deshacer" (R-M5).
- **MHOY-04.** El resumen de la cabecera añade, si las hay, "· 2 misiones para hoy" (vencidas + con fecha hoy).

### 4.3 Lista, formulario y detalle (MUI)
- **MUI-01.** La pestaña **Actividades** tiene un selector "Recurrentes | Misiones" (S3-05). La vista Misiones agrupa en: Pendientes (incluidas las vencidas, ordenadas como MHOY-01), Completadas (últimos 30 días) y Abandonadas (últimos 30 días). Incluye el botón "Nueva misión".
- **MUI-02.** **Formulario** (crear y editar): título, categoría, dificultad y, opcionalmente, "Fecha límite" (selector de fecha nativo, mínimo hoy).
- **MUI-03.** **Detalle:**
  - Título, categoría, dificultad, valor ("10 XP") y estado.
  - Fecha límite.
  - Historial legible de eventos ("Creada el 12 oct", "Reprogramada al 20 oct", "Venció el 15 oct", "Completada el 18 oct").
  - Acciones según MIS-05, incluida "La hice ayer" (R-M2).
- **MUI-04.** **Confirmaciones** con texto honesto y no culpabilizador:
  - **Abandonar con fecha y pendiente:** "Abandonarla antes de la fecha cuesta la mitad de su valor en tu Disciplina. Es definitivo".
  - **Abandonar sin fecha:** "No afecta a tus puntos. Es definitivo".
  - **Abandonar vencida:** "El fallo se mantiene. Es definitivo".
  - **Eliminar:** solo el mismo día de su creación, sin efectos.
- **MUI-05.** Al vencer, el detalle explica: "Venció el 15 oct. Complétala cuando puedas para recuperar lo perdido".

### 4.4 Integraciones (INT)
- **INT-01.** La XP de las misiones entra en el análisis compartido. Subir de nivel por una misión dispara el modal (PRG-06).
- **INT-02.** El backup incluye misiones y eventos (el formato v1 ya los contempla). La validación comprueba que el título tenga entre 1 y 60 caracteres, que no haya eventos huérfanos y que los eventos `deadlineSet` tengan `deadline`.
- **INT-03.** "Eliminar todos mis datos" borra también las misiones (ya cubierto por DEL-01).

## 5. Requisitos no funcionales
- **NFR3-01.** Derivar el estado de 500 misiones con 5 eventos cada una tarda < 10 ms en el equipo de desarrollo (test de rendimiento).
- **NFR3-02.** Hoy no muestra nunca más de 5 misiones (MHOY-01).

## 6. Ejemplos (Given/When/Then)
Basados en game-design E-3, E-4 y E-4b, con "Entregar informe" (Media, v = 10).

**MIS-02 · Vence una sola vez**
- Given una misión con fecha límite el 15 oct
- When hoy es 16 oct
- Then está vencida, con una contribución de Disciplina `0 / 10` el 15 oct
- When la reprogramo al 20 oct y hoy es 21 oct sin completarla
- Then sigue habiendo una sola contribución `0 / 10` (la del 15 oct)

**D-032 · Completar tarde**
- Given la misión vencida el 15 oct
- When la completo el 18 oct
- Then queda "completada tarde": +10 XP, sin contribución de Disciplina y sin contribución de categoría

**R-M2 · A tiempo con fecha de ayer**
- Given una fecha límite el 15 oct y hoy es 16 oct
- When pulso "La hice ayer"
- Then queda completada a tiempo el 15 oct: +10 XP, categoría `10 / 10` y Disciplina `10 / 10`

**D-033 · Abandonar antes de vencer**
- Given una fecha límite el 20 oct
- When la abandono el 14 oct
- Then queda abandonada, con Disciplina `0 / 5` el 14 oct, sin XP, y no se puede completar

**GD-A3 · Quitar la fecha**
- Given una fecha límite el 15 oct y hoy es 14 oct
- When quito la fecha
- Then queda pendiente sin fecha y no vence nunca
- And, si la hubiera quitado el 16 oct (ya vencida), el fallo del 15 oct se mantendría

**GD-A4 · Desmarcar tras la fecha**
- Given que se completó el 15 oct, con fecha límite el 15 oct
- When el 16 oct la desmarco
- Then pasa a vencida, con Disciplina `0 / 10` el 15 oct

**GD-A5 · No antes de crearla**
- Given una misión creada hoy
- Then "La hice ayer" no está disponible

**MHOY-01 · Límite de 5**
- Given 1 vencida, 1 con fecha hoy, 2 en los próximos 3 días y 4 sin fecha
- Then Hoy muestra la vencida, la de hoy, las 2 próximas y la más antigua sin fecha
- And muestra "Ver todas (8)"

## 7. Estados de interfaz
| Pantalla | Estados |
|---|---|
| Hoy → Misiones | Oculta si no hay ninguna relevante · Con misiones · Completada hoy (con deshacer) · Vencida |
| Actividades → Misiones | Vacío ("Crea una misión: algo puntual que quieras cumplir") · Pendientes · Completadas · Abandonadas |
| Formulario | Válido · Errores en línea · Fecha anterior a hoy |
| Detalle | Pendiente con fecha · Pendiente sin fecha · Vencida (explicación) · Completada a tiempo · Completada tarde · Abandonada |
| Confirmaciones | Abandonar (3 variantes) · Eliminar |

## 8. Casos límite
| Caso | Comportamiento |
|---|---|
| Fecha límite = hoy y se completa a las 23:59 | A tiempo (R-M1) |
| Completar "ayer" con la fecha límite anteayer | Completada tarde (ayer > fecha límite) |
| Reprogramar el mismo día varias veces | Solo cuenta la última fecha vigente al terminar el día |
| Cambiar de zona horaria | Se usan las fechas locales guardadas (R-T2) |
| Misión de una categoría que luego se desactiva | Se conserva y se muestra; al editar se puede mantener esa categoría (como con las actividades) |
| Importar un backup con misiones | Se recalculan estado y XP; el nivel celebrado se ajusta (BAK-06) |
| 50 misiones pendientes | Hoy muestra 5 y "Ver todas (50)" |

## 9. Dependencias y riesgos
- **Dependencias:** ninguna nueva.
- **Riesgos:**
  - Saturación de Hoy (mitigado por MHOY-01).
  - Ambigüedades de fechas (cubiertas por GD-A3 a GD-A6 y sus tests).

## 10. Decisiones de esta spec que necesitan aprobación
| ID | Propuesta |
|---|---|
| GD-A3 a GD-A6 | Aclaraciones de reglas (§3) |
| S3-01 | La fecha límite debe ser hoy o posterior al crear o reprogramar |
| S3-02 | Categoría y dificultad editables solo mientras está pendiente; el título, siempre |
| S3-03 | Eliminar solo el mismo día de su creación y si está pendiente (para corregir errores); después, abandonar |
| S3-04 | Hoy muestra como máximo 5 misiones (vencidas, hoy, próximos 3 días, sin fecha) y "Ver todas (N)" |
| S3-05 | Las misiones viven en la pestaña Actividades con el selector "Recurrentes \| Misiones" |
