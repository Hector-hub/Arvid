# Spec 12 — Descansos, objetivos con hitos y crear con el compañero

Estado: **aprobada** (2026-10-26) · Incrementos P1 tras la 1.2.3
Decisiones que implementa: D-117 a D-123 (descubrimiento del 2026-10-26)
Modifica:
- game-design: §3.4 (evaluabilidad) y §6 (rachas): nuevo motivo «descanso»;
- spec 03 (misiones): hora opcional y misiones que son hitos;
- spec 06 (chat e IA): acciones estructuradas;
- spec 10 (notificaciones): avisos de misiones con hora y días de descanso;
- mvp-scope: deja de estar excluida la «generación de misiones con IA», en la forma limitada de §5 (D-121).

Entrega por fases (D-123):

| Versión | Contenido |
|---|---|
| **1.3.0** | Descansos planificados (§3) |
| **1.4.0** | Objetivos con hitos, pestaña Objetivos y hora en las misiones (§4) |
| **1.5.0** | Crear con el compañero (§5) |

## 1. Objetivo
- **Descansos:** que un viaje, una enfermedad o un día libre no te cuesten las rachas ni bajen tus atributos.
- **Objetivos:** que las metas grandes se dividan en pasos y veas el camino recorrido.
- **Crear con el compañero:** que pedirle a ARVID o DARIS «crea una misión para el viernes a las 6» baste para tenerla, confirmándola tú.

## 2. Principios
- **Un descanso no es un fallo** ni una trampa: protege, pero no regala nada. Si ese día cumples, cuenta a tu favor.
- **La IA propone, tú decides.** Nada se crea sin que pulses «Crear» (D-120).
- **Reutilizar lo que existe:** los hitos son misiones, y los descansos usan la misma regla que los periodos de gracia (R-A6).

## 3. Descansos planificados (DS) · 1.3.0

### 3.1 Crear y ver
- **DS-01.** Un descanso tiene:
  - fecha de inicio y de fin (pueden coincidir);
  - a qué afecta: **todas las actividades** (por defecto) o **las que elijas** (D-117);
  - una nota opcional (por ejemplo, «Viaje»).
- **DS-02.** **Cuándo:** desde hoy en adelante; no se puede crear con fechas pasadas (D-118). Un descanso futuro o en curso se puede editar o cancelar; los días ya pasados no cambian.
- **DS-03.** **Dónde:**
  - Hoy → «Planificar descanso», que abre la pantalla `/descansos`, con el formulario y la lista de descansos próximos y en curso;
  - el detalle de una actividad muestra sus próximos días de descanso.
- **DS-04.** **Hoy en un día de descanso:** un aviso «Hoy descansas (Viaje)». Las actividades afectadas aparecen con la etiqueta «Descanso» y se pueden registrar igual.

### 3.2 Reglas (game-design)
- **DS-05.** Un periodo de una actividad que **contiene un día de descanso** de esa actividad pasa a ser como un periodo de gracia (R-A6), con el motivo «descanso»:
  - **solo se evalúa si se cumple al 100 %**;
  - si no se cumple, se excluye: no suma ni rompe la racha y no cuenta en atributos ni en Disciplina;
  - vale igual para diarias, semanales y mensuales (D-118). Por ejemplo, «Gimnasio 3/semana» con un sábado de descanso: si haces 3, la semana cuenta; si no, no te penaliza.
- **DS-06.** La **XP no cambia**: lo que registres un día de descanso suma su XP como siempre.
- **DS-07.** Las **misiones no se ven afectadas**: sus fechas límite siguen igual.
- **DS-08.** Sin límite de días de descanso (sistema personal, autonomía, como la pausa).

### 3.3 Avisos y compañero
- **DS-09.** Notificaciones:
  - los recordatorios de actividades en descanso no se envían;
  - si todo el día es de descanso, el resumen de la mañana dice «Hoy descansas. Disfrútalo.» y el de la noche no avisa de rachas.
- **DS-10.** El saludo del compañero en un día de descanso usa frases de descanso.

## 4. Objetivos con hitos y hora en las misiones (OB, MH) · 1.4.0

### 4.1 Pestaña Objetivos
- **OB-01.** Nueva pestaña en la barra principal: **Hoy · Actividades · Objetivos · Perfil** (D-119). Muestra los objetivos activos (con su progreso, por ejemplo «2 de 5 hitos», y el hito actual) y, más abajo, los completados y abandonados.
- **OB-02.** Un objetivo tiene:
  - título (1–60 caracteres);
  - categoría;
  - fecha meta opcional;
  - descripción opcional;
  - **1 a 20 hitos en orden**. Cada hito tiene título, dificultad, fecha límite opcional y hora opcional.

### 4.2 Hitos en secuencia
- **OB-03.** Solo está activo **el siguiente hito**; los demás se ven bloqueados (D-119).
- **OB-04.** El hito activo es una **misión normal**, con su XP, su categoría (la del objetivo) y su Disciplina:
  - aparece en Hoy y en la lista de misiones con la etiqueta «Objetivo: X · hito 2/5»;
  - al completarse, el siguiente hito se convierte en misión ese mismo día.
- **OB-05.** **Fechas de los hitos bloqueados:** no vencen mientras están bloqueados.
  - Al activarse, si su fecha límite ya pasó, se activa **sin fecha límite** y la pantalla lo indica para que pongas otra.
- **OB-06.** **Deshacer:** si desmarcas el hito anterior, el siguiente sigue activo; no se vuelve a bloquear.
- **OB-07.** Los hitos pendientes se pueden editar, añadir, quitar y reordenar. El hito activo, igual que cualquier misión.

### 4.3 Final del objetivo
- **OB-08.** **Completado:** al completar el último hito, el objetivo se cumple. Hay una celebración grande (partículas y frase del compañero) y queda en el historial. **Sin XP extra** (D-122).
- **OB-09.** **Abandonar** un objetivo abandona su hito activo, con las reglas de abandono de misiones, y el resto no se crea.
- **OB-10.** La **fecha meta** del objetivo es orientativa: no vence ni penaliza. Se muestra en rojo si pasa sin completarlo.

### 4.4 Hora en las misiones
- **MH-01.** Cualquier misión (y cada hito) puede tener **hora**, si tiene fecha límite (D-118, «hora opcional con aviso»).
- **MH-02.** Con las notificaciones activadas, a esa hora llega un aviso: «{compañero}: Es hora de «Pagar la luz».».
  - Va en la lista de avisos del servidor como `mission:<id>` (spec 10, PV-01: sin títulos).
  - Si la misión ya está hecha, no se envía.
- **MH-03.** La hora no cambia cuándo vence: la misión vence al terminar su día, como hasta ahora.

## 5. Crear con el compañero (AC) · 1.5.0

### 5.1 Qué puede proponer
- **AC-01.** En el chat (en la escena y en la página de conversación), con «{compañero} con IA», código válido y conexión, el compañero puede proponer **una** de estas acciones por mensaje (D-120, D-121):

| Acción | Campos |
|---|---|
| `create_mission` | título, categoría, dificultad, fecha límite, hora |
| `create_goal` | título, categoría, fecha meta, hasta 10 hitos (título, dificultad, fecha, hora) |
| `create_rest` | desde, hasta, actividades (todas o una lista) y nota |
| `create_activity` | nombre, categoría, frecuencia y veces, dificultad, recordatorios |

- **AC-02.** Solo **crea**: no edita, no borra y no marca nada como hecho.

### 5.2 Cómo funciona (salida estructurada)
- **AC-03.** La función `/api/arvid` envía a Mistral el **catálogo de acciones**, con el esquema JSON exacto de cada una (*function calling*).
  - Mistral responde con texto o con una llamada a una acción y sus argumentos.
  - La función **valida los argumentos con Zod**, con los mismos límites que los formularios de la app, y devuelve `{ reply, proposal }`.
  - La app los **vuelve a validar** antes de mostrarlos.
- **AC-04.** **Contexto adicional** para entender lo que pides:
  - la fecha y la hora locales, y el día de la semana;
  - la zona horaria;
  - las categorías activas (identificador y nombre);
  - los nombres de las actividades y de los objetivos activos, para no duplicar.

  Las fechas relativas («el viernes», «mañana a las 6») las resuelve la IA con esa fecha. La tarjeta muestra la fecha resultante para que la compruebes.
- **AC-05.** **Tarjeta de propuesta:**
  - un resumen legible (por ejemplo: «Misión · Pagar la luz · Orden · Media · vie 30 oct, 18:00»);
  - botones **Crear**, **Editar** (abre el formulario con los datos rellenados) y **Cancelar**.

  Dónde aparece:
  - en la página de conversación, dentro del hilo;
  - desde la escena, en una hoja sobre la escena.
- **AC-06.** **Si algo no es válido** (fecha pasada, categoría desconocida, campos fuera de límites):
  - el compañero lo dice;
  - si falta poco, la tarjeta se abre directamente en «Editar» con lo que se pudo entender.
- **AC-07.** **Créditos:** cuenta como un mensaje de chat (1 crédito). Crear desde la tarjeta no gasta nada. El reintento interno por JSON inválido no cuesta extra; si la generación falla, el crédito se devuelve (D-124). Una propuesta válida que cancelas sí cuenta.
- **AC-08.** **Sin IA:** el compañero responde con su frase fija de siempre y sugiere el botón «+» correspondiente.
- **AC-09.** **En la conversación guardada** (D-098) queda tu mensaje, la respuesta y una línea «Creada: misión «Pagar la luz»» si la creas.

## 6. Datos
| Dónde | Qué | En el backup |
|---|---|---|
| Tabla nueva `rests` | `{ id, from, to, activityIds?: string[], note?, createdAt }` (sin `activityIds` = todas) | Sí |
| Tabla nueva `goals` | `{ id, title, categoryId, targetDate?, description?, createdAt, status: 'active' \| 'completed' \| 'abandoned', closedAt? }` | Sí |
| `goals.milestones` | `{ id, title, difficulty, deadline?, time?, missionId? }[]` en orden; `missionId` una vez activado | Sí |
| `missions` | Nuevos campos opcionales `time` (`HH:MM`) y `goalId` | Sí |

- **Migración:** Dexie pasa a la versión 2, con las tablas nuevas y vacías. Los backups antiguos se siguen importando.
- **Formato de backup:** pasa a la versión 2 y sigue aceptando la 1.

## 7. Requisitos no funcionales
- **NFR12-01.** La IA nunca crea ni modifica datos por su cuenta: solo devuelve una propuesta validada (AC-03).
- **NFR12-02.** El cálculo de rachas, atributos y Disciplina con descansos sigue dentro de los límites de rendimiento con un año de datos (NFR7).
- **NFR12-03.** Todos los textos van en `es.json` y `en.json`.

## 8. Ejemplos (Given/When/Then)
**DS-05 · Semana con descanso**
- Given «Gimnasio 3/semana» con racha de 4 semanas y un descanso el sábado
- When la semana cierra con 2 de 3
- Then la racha sigue en 4 y la semana no cuenta en atributos ni en Disciplina

**OB-05 · Hito con fecha pasada**
- Given un objetivo cuyo hito 3 tenía fecha límite el 1 de noviembre
- When completas el hito 2 el 5 de noviembre
- Then el hito 3 se activa sin fecha límite y se te pide poner una

**AC-05 · Misión desde el chat**
- Given es lunes 26 de octubre
- When escribes «Daris, crea una misión para pagar la luz el viernes a las 6 de la tarde»
- Then aparece la tarjeta «Misión · Pagar la luz · Orden · Media · vie 30 oct, 18:00», y al pulsar «Crear» la misión aparece en Misiones con su aviso a las 18:00

## 9. Riesgos
- **R12-1 · La IA entiende mal fechas o categorías.** *Mitigación:* contexto con fecha y categorías, doble validación y confirmación con la fecha resultante visible.
- **R12-2 · `ministral-8b` y el function calling.** Un modelo pequeño puede fallar al elegir la acción. *Mitigación:* probarlo antes de la 1.5.0. Si no es fiable, usar el modo JSON con un esquema en las instrucciones, o un modelo mayor solo para estas peticiones (lo decides tú por el coste).
- **R12-3 · Migración de la base de datos (Dexie v2).** *Mitigación:* prueba de migración con datos de la versión 1 y backup previo recomendado.
- **R12-4 · Cuatro pestañas en móviles estrechos.** *Mitigación:* revisar la barra a 320 px.

## 10. Decisiones de esta spec (aprobadas)
| ID | Propuesta |
|---|---|
| S12-01 | Descansos por fechas, para todas las actividades o las elegidas; solo hoy y futuro; sin límite (D-117, D-118) |
| S12-02 | Un periodo con descanso solo cuenta si se cumple al 100 % (como la gracia); la XP y las misiones no cambian (D-118) |
| S12-03 | Objetivos en una pestaña propia; hitos en secuencia que son misiones; sin XP extra al completarlo (D-119, D-122) |
| S12-04 | Hitos bloqueados que no vencen; al activarse con la fecha pasada, quedan sin fecha (OB-05) |
| S12-05 | Hora opcional en las misiones, con aviso (MH) |
| S12-06 | El compañero propone una acción por mensaje (misión, objetivo, descanso o actividad) con salida estructurada validada; tú confirmas (D-120, D-121) |
| S12-07 | Entrega por fases: 1.3.0, 1.4.0 y 1.5.0 (D-123) |
