# Spec 04 — Hoja de personaje

Estado: **aprobada** (D-049; aclaraciones D-048) · **implementada** 2026-10-17 en la versión 0.4.0 · desplegada en Netlify (pendiente: checklist manual M4) · Incremento 4 de implementation-plan.md
Cubre: MVP-05 (hoja de personaje), MVP-04 (atributos y Disciplina), MVP-06 (categorías propias)
Reglas: game-design §5 (R-AT1 a R-AT5), §6 (R-D1 a R-D3), §10 (explicabilidad), E-2, E-3, E-4b, E-8 · Decisiones: D-015, D-017, D-025, D-026, C-002 · Diseño: design-system §3, §7

## 1. Contexto y objetivo
El usuario quiere entender sus fortalezas y lo que está descuidando (MVP-05) sin que el gráfico presente estimaciones como verdades. Este incremento completa la hoja de personaje:
- Un **radar de atributos** por categoría.
- El **medidor de Disciplina**.
- Una **explicación de cada cifra**.
- Una **alternativa accesible en lista**.

También permite crear **categorías propias**.

**Principio guía (game-design §5):** un atributo mide **cuánto cumpliste lo que te propusiste** en esa área, no tu salud ni tu capacidad reales. La interfaz lo dice siempre.

## 2. Alcance
**Incluye:**
- Cálculo de atributos y Disciplina por ventana (7, 30 o 90 días) y de la ventana anterior.
- Tendencias.
- Desglose explicativo.
- Radar SVG.
- Medidor de Disciplina.
- Lista accesible.
- Detalle de atributo con sus actividades y misiones.
- Categorías propias: crear, renombrar, elegir color e icono, activar o desactivar, y eliminar si no tienen historial.

**Excluye:** logros (inc. 5); comparaciones con otros usuarios (excluido del MVP); insights avanzados y resúmenes semanales (P1); tema claro (P1).

## 3. Aclaraciones de reglas (necesitan aprobación; se añadirían a game-design §5)
| ID | Hueco | Propuesta |
|---|---|---|
| **GD-A7** | D-017 dice "radar con 3–8 ejes", pero el onboarding permite activar 1 o 2 categorías, y con menos de 3 ejes un radar no es un polígono | Con **menos de 3 categorías activas** no se dibuja el radar: se muestra solo la lista, con "Activa al menos 3 categorías para ver el radar" |
| **GD-A8** | R-AT3 dice que un eje sin datos se dibuja vacío, pero no cómo se cierra el polígono | Un eje sin datos **no tiene vértice**. El polígono se dibuja **solo con segmentos entre ejes consecutivos que tienen datos**. El eje sin datos se ve punteado y con la marca "?". Lo mismo se aplica a la superposición del periodo anterior |
| **GD-A9** | A qué categoría cuenta un periodo si la actividad cambió de categoría | A la categoría de la **versión vigente en ese periodo** (R-A1). Las misiones cuentan para su categoría, que no cambia una vez completadas (S3-02) |
| **GD-A10** | Categorías desactivadas | No aparecen en el radar ni en la lista; sus datos **sí** cuentan en Disciplina, que es global (R-D1) |

## 4. Requisitos funcionales

### 4.1 Cálculo (ATR)
- **ATR-01.** `computeAttributes(analysis, ventana W, hoy)` → por categoría: `ΣE`, `ΣP`, el número de elementos evaluados, la puntuación (0–100 con redondeo a la mitad hacia arriba, o "sin datos" si hay menos de 3 elementos) y el desglose (R-AT1 a R-AT3, GD-A9).
- **ATR-02.** Los elementos de un atributo son:
  - Los periodos **evaluables** cuyo último día cae en `[hoy − W + 1, hoy]`; un periodo abierto y completo usa hoy.
  - Las misiones de la categoría **completadas a tiempo**, con su fecha de finalización en la ventana.
- **ATR-03.** Disciplina (R-D1): todos los periodos evaluables de la ventana más las contribuciones de Disciplina de las misiones (MIS-04), incluidas las de categorías desactivadas (GD-A10).
- **ATR-04.** Ventana anterior (R-AT4): el mismo cálculo con la referencia `hoy − W`, usando solo registros, eventos y misiones con fecha ≤ esa referencia.
- **ATR-05.** Tendencia (R-AT5): con ambas ventanas con datos, Δ ≥ +5 es "subiendo", Δ ≤ −5 "bajando" y lo demás "estable". Sin datos en alguna, no hay tendencia.
- **ATR-06.** Desglose para la explicación (game-design §10):
  - Por actividad: número de periodos y unidad ("4 semanas de Gym", "29 días de Caminar").
  - Número de misiones.
  - En Disciplina, además, las misiones que restan: "1 misión vencida resta 10 puntos posibles; complétala para recuperarlos" y "1 misión abandonada resta 5".

### 4.2 Pantalla Personaje (PJ)
- **PJ-01.** El orden de la pantalla es:
  1. Personaje, nivel y XP (ya existe).
  2. Selector de ventana "7 días | 30 días | 90 días", que se recuerda en `settings.radarWindow` (D-026).
  3. Radar.
  4. Medidor de Disciplina.
  5. Lista de atributos.
- **PJ-02.** **Radar** (SVG propio, design-system §7):
  - Un eje por categoría activa (de 3 a 8), en el orden de las categorías, con su icono en el extremo.
  - Anillos al 25, 50, 75 y 100.
  - Polígono actual con relleno cyan al 30 % y borde cyan.
  - Superposición de la ventana anterior con línea fog discontinua y sin relleno.
  - Ejes sin datos según GD-A8.
  - `role="img"` con un `aria-label` que resume los valores ("Cuerpo 79, Descanso sin datos, …").
  - Legible a partir de 320 px de ancho.
- **PJ-03.** **Medidor de Disciplina** (D-025): barra de 10 bloques, cifra, tendencia ("↑ subiendo 6", "estable", "↓ bajando 8"), "sin datos (n de 3)" cuando corresponde, y explicación al tocarlo.
- **PJ-04.** **Lista de atributos**, siempre visible: es la alternativa accesible al radar (C-002). Cada fila muestra el icono, el nombre, la puntuación o "sin datos (n de 3)", una barra, la tendencia y un enlace al detalle.
- **PJ-05.** **Nota fija:** "Los atributos miden cuánto cumpliste lo que te propusiste en cada área durante los últimos N días, no tu salud ni tu capacidad".
- **PJ-06.** Con menos de 3 categorías activas se aplica GD-A7.
- **PJ-07.** Sin ninguna actividad ni misión: "Tus atributos aparecerán cuando registres tus primeras actividades".

### 4.3 Detalle de atributo (DA)
- **DA-01.** Ruta `/personaje/atributo/:categoryId`. Muestra el icono y el nombre de la categoría, la puntuación de la ventana elegida, la tendencia y la puntuación anterior.
- **DA-02.** Explicación en la forma de game-design §10: "Cuerpo 79: ganaste 162,5 de 205 puntos posibles en los últimos 30 días (4 semanas de Gym, 29 días de Caminar y 1 misión). Mide cuánto cumpliste lo que te propusiste, no tu estado físico". Para "sin datos": "Aún no hay suficiente información: 2 de 3 elementos necesarios".
- **DA-03.** Actividades de la categoría con su cumplimiento en la ventana ("Gym · 32,5 de 40") y enlace a su detalle; misiones completadas de la categoría en la ventana.
- **DA-04.** Nota sobre las ventanas cortas (game-design §5): con 7 días, las actividades mensuales solo aportan si el mes en curso ya está completo.
- **DA-05.** La explicación de **Disciplina** es equivalente (ruta `/personaje/disciplina`): cifra, puntos ganados y posibles, y lista de las misiones que restan (vencidas o abandonadas) con enlace para completarlas o revisarlas.

### 4.4 Categorías propias (CAT)
- **CAT-04.** En Ajustes → Categorías, "Nueva categoría": nombre (1–24 caracteres, único sin distinguir mayúsculas), color (uno de los 8 de design-system §3; por defecto, el primero no usado) e icono (de un set de 14 sprites del 1-Bit Pack: los 6 actuales y 8 nuevos). Se crea activa si hay hueco (máximo 8 activas).
- **CAT-05.** Todas las categorías, predefinidas y propias, se pueden renombrar y cambiar de color e icono.
- **CAT-06.** **Eliminar:** solo las propias **sin historial**, es decir, sin ninguna versión de actividad ni misión que las use. Con historial, solo se pueden desactivar.
- **CAT-07.** Se mantienen las reglas de CAT-02 y D-017: no se desactiva una categoría con actividades activas o pausadas ni la última activa, y hay como máximo 8 activas.

## 5. Requisitos no funcionales
- **NFR4-01.** Calcular los atributos de la ventana actual y la anterior con un año de datos (10 actividades diarias y 200 misiones) tarda < 25 ms en el equipo de desarrollo (mejor de 7).
- **NFR4-02.** El radar se ve correctamente entre 320 y 720 px y con zoom de texto del 200 %; la lista sigue siendo utilizable.
- **NFR4-03.** Los colores del radar cumplen design-system §2: contraste de bordes ≥ 3:1 sobre panel y texto AA.

## 6. Ejemplos (Given/When/Then)
**E-2 · Atributo Cuerpo, 30 días.** Con los datos de game-design E-2 → Cuerpo = 79, `ΣE = 162,5`, `ΣP = 205`, con el desglose "4 semanas de Gym, 29 días de Caminar y 1 misión".

**E-3 · Disciplina.** Con E-3 → 82. Con E-4 (misión completada tarde) → 83. Con E-4b (abandonada antes) → 83.

**E-8 · Sin datos.** Relaciones con 2 periodos evaluados → "sin datos (2 de 3)". En el radar no tiene vértice ni aparece como 0.

**ATR-04/05 · Tendencia**
- Given Cuerpo = 79 en los últimos 30 días y 70 en los 30 anteriores
- Then muestra "↑ subiendo 9"
- And con 76 en los anteriores, "estable"

**GD-A9 · Cambio de categoría**
- Given "Paseo" estuvo en Cuerpo hasta el 11 oct y en Mente desde el 12 oct (versión semanal)
- Then las semanas hasta la del 5 oct cuentan para Cuerpo y las del 12 oct en adelante, para Mente

**GD-A7 · Menos de 3 categorías**
- Given solo 2 categorías activas
- Then Personaje no dibuja el radar, muestra la lista con 2 filas y el aviso para activar más

**GD-A8 · Polígono con huecos**
- Given 5 ejes, el 3.º sin datos
- Then se dibujan los segmentos 1–2, 4–5 y 5–1, pero no 2–3 ni 3–4, y el eje 3 aparece punteado con "?"

**CAT-06 · Eliminar**
- Given la categoría propia "Música" sin uso
- Then se puede eliminar
- When se crea una actividad en "Música" (aunque se archive después)
- Then ya solo se puede desactivar

## 7. Estados de interfaz
| Pantalla | Estados |
|---|---|
| Personaje | Sin datos · Menos de 3 categorías (sin radar) · Radar completo · Ejes sin datos · Con superposición · Ventana 7, 30 o 90 |
| Disciplina | Sin datos · Con valor y tendencia · Con misiones que restan |
| Detalle de atributo | Sin datos · Con datos · Sin actividades en la categoría |
| Ajustes → Categorías | Lista con predefinidas y propias · Formulario nuevo o editar · Error por nombre duplicado · Máximo de 8 activas · Eliminar no disponible por tener historial |

## 8. Casos límite
| Caso | Comportamiento |
|---|---|
| Ventana de 7 días con solo actividades mensuales | Sin datos salvo meses completos (DA-04) |
| Categoría con datos solo de misiones | Cuenta si llega a 3 elementos |
| Toda la ventana en pausa | Sin datos (no hay periodos evaluables) |
| Usuario con menos de W días de uso | Se calcula con lo disponible; la ventana anterior quedará sin datos (sin tendencia) |
| 8 categorías activas en 320 px | Las etiquetas del radar son solo iconos; los nombres completos van en la lista |
| Renombrar una categoría | Cambia en todas partes; el historial no se ve afectado (se referencia por ID) |
| Importar un backup con categorías propias | Ya cubierto por el formato v1 |

## 9. Dependencias y riesgos
- **Dependencias:** 8 sprites nuevos del 1-Bit Pack (con la licencia ya registrada); ninguna librería nueva.
- **Riesgos:**
  - Interpretación errónea del radar (mitigada por PJ-05, la lista y las explicaciones).
  - Legibilidad en 320 px (NFR4-02).
  - Rendimiento al calcular la ventana anterior (NFR4-01).

## 10. Decisiones de esta spec que necesitan aprobación
| ID | Propuesta |
|---|---|
| GD-A7 a GD-A10 | Aclaraciones de reglas (§3) |
| S4-01 | Orden de Personaje: nivel → selector de ventana → radar → Disciplina → lista (PJ-01) |
| S4-02 | Detalle por atributo y de Disciplina con desglose y elementos relacionados (DA) |
| S4-03 | Categorías propias: crear, renombrar, color e icono (14 iconos); eliminar solo sin historial; las predefinidas se pueden renombrar pero no eliminar |
| S4-04 | La lista de atributos está siempre visible bajo el radar (no oculta tras un botón) |
