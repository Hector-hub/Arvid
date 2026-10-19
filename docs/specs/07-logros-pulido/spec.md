# Spec 07 — Logros y pulido

Estado: **aprobada** (D-083, 2026-10-18) · 0.7.0 implementada (logros, insignias y botones; pendiente: despliegue) · Incremento 7 de implementation-plan.md (último del MVP)
Cubre: MVP-07 (logros), MVP-10 (botones y contraste AA) y la revisión de accesibilidad y rendimiento del MVP
Decisiones que implementa: D-076 a D-082
Modifica:
- design-system.md §7 (botones);
- game-design.md §9 (los nombres de los logros pasan a definitivos y se aclaran L-02 y L-08);
- spec 06, DL-01 (momento nuevo `achievement`) e IA (momento con IA).

Prototipo de referencia: `prototypes/botones/index.html` (variante A · Bisel pixel).

## 1. Contexto y objetivo
El MVP ya registra, puntúa y celebra la subida de nivel, pero no tiene **metas intermedias**: los logros de game-design §9 nunca se implementaron, aunque la tabla `achievements` existe y va en el backup desde la 0.2.0. Además, los botones actuales (borde grueso y fondo transparente) no siempre se distinguen bien del panel, y falta revisar la accesibilidad y el rendimiento del conjunto antes de dar el MVP por terminado.

Objetivo: **logros que premian la constancia y el volver**, celebrados por ARVID sin interrumpir; **botones pixel modernos** y legibles; y una **revisión automática** de accesibilidad y rendimiento.

## 2. Alcance
**Incluye:**
- Los 11 logros de game-design §9: detección, persistencia, progreso, sección en Perfil y celebración.
- Insignias generadas con IA por el responsable del producto.
- Estilo de botón "Bisel pixel" en toda la app.
- Pruebas de accesibilidad automáticas (axe) en E2E y corrección de lo que salga.
- Medición de rendimiento (Lighthouse y un año de datos simulados) y corrección de lo que salga.

**Excluye:**
- La checklist manual en teléfonos de las specs 01–06 (la hace el responsable, aparte).
- Logros nuevos más allá de los 11 (por ejemplo, ligados a ARVID o a la música).
- Logros secretos, recompensas o XP por logros (R-L2).
- Sonidos de celebración (P1).

## 3. Requisitos funcionales

### 3.1 Logros (LO)
- **LO-01.** **Set:** los 11 logros de game-design §9, con nombre e insignia propios.

  | ID | Nombre (es / en) | Condición | Progreso |
  |---|---|---|---|
  | L-01 | Primer paso / First Step | Primer registro de cualquier actividad | — |
  | L-02 | Semana sólida / Solid Week | Racha de 7 en una actividad **diaria** | mejor racha actual diaria / 7 |
  | L-03 | Treinta / Thirty | Racha de 30 en cualquier actividad | mejor racha actual / 30 |
  | L-04 | Centenar / Hundred | 100 registros en total | registros / 100 |
  | L-05 | Palabra dada / Promise Kept | Primera misión con fecha límite completada a tiempo | — |
  | L-06 | Fiable / Reliable | 10 misiones con fecha límite completadas a tiempo | misiones / 10 |
  | L-07 | Rescate / Rescue | Completar una misión vencida | — |
  | L-08 | Regreso / Comeback | Registrar algo tras 7 o más días completos sin ningún registro, habiendo registrado algo antes | — |
  | L-09 | Equilibrio / Balance | 4 o más categorías con atributo ≥ 60 en la ventana de 30 días | categorías / 4 |
  | L-10 | Temple / Temper | Disciplina ≥ 80 en la ventana de 30 días (con datos) | Disciplina / 80 |
  | L-11 | Vigía / Watcher | Alcanzar el nivel 10 | nivel / 10 |

- **LO-02.** **Detección:** una función pura del dominio, `detectAchievements`, recibe el estado derivado (periodos, rachas, misiones, progreso, atributos y Disciplina) y los logros ya desbloqueados, y devuelve los nuevos. Se evalúa al abrir la app y tras cada cambio de datos (registrar, deshacer, eventos de misión, importar).
- **LO-03.** **Permanentes** (R-L1): al cumplirse se guarda `{ id, unlockedAt }` en `achievements` y el logro no se pierde aunque luego se deshaga el registro que lo provocó. No dan XP (R-L2).
- **LO-04.** **Progreso:** cada logro pendiente con condición medible muestra un progreso `actual / meta` con la columna "Progreso" de LO-01. El valor nunca supera la meta.
- **LO-05.** **Desbloqueo en silencio** (D-079): la primera vez que se evalúan los logros en un dispositivo (ajuste `achievementsReady` ausente) y justo después de importar un backup, los logros que ya se cumplen se guardan **sin celebración**, con la fecha de esa evaluación. Si en ese momento se ganó alguno, ARVID lo comenta una vez ("Revisé tu historial: ya tenías 4 logros"). A partir de ahí, cada logro nuevo se celebra (CE).

### 3.2 Logros en Perfil (LP, D-076)
- **LP-01.** Perfil tiene una sección **Logros** debajo del radar, con el contador "4 / 11" y una cuadrícula de insignias (4 por fila a 360 px; 6 a partir de 560 px).
- **LP-02.** **Ganados:** insignia a color. **Pendientes** (D-078): insignia en gris y atenuada, con una barra de progreso fina debajo cuando es medible (LO-04).
- **LP-03.** Al tocar una insignia se abre una hoja inferior con la insignia grande, el nombre, la condición y, según el caso, "Ganado el 18 oct 2026" o el progreso ("63 / 100").
- **LP-04.** **Accesibilidad:** cada insignia es un botón con nombre accesible "Centenar, ganado" o "Centenar, pendiente, 63 de 100". El estado no se transmite solo con el color.

### 3.3 Celebración (CE, D-077)
- **CE-01.** Al desbloquear un logro fuera de LO-05:
  - ráfaga grande de partículas en la escena (PAR);
  - ARVID lo anuncia en su burbuja (momento `achievement`, CE-02);
  - un aviso pequeño con la insignia y "Logro: Semana sólida" aparece arriba, sobre el contenido, y se cierra solo a los 5 s o al tocarlo. Tocarlo lleva a la hoja del logro en Perfil.
- **CE-02.** **Momento `achievement` de ARVID** (amplía DL-01): frase fija con el nombre del logro ("¡Logro nuevo: Semana sólida! Siete días seguidos, eso es constancia."), con sus formas de género. Con "ARVID con IA", una frase personalizada con el logro y el contexto, con respaldo a la fija (IA-05). Se dice siempre que haya un logro nuevo, aunque ya haya hablado hoy, salvo con "ARVID habla por iniciativa propia" desactivado (DL-03): entonces solo hay partículas y aviso.
- **CE-03.** **Varios a la vez:** un solo aviso ("2 logros: Primer paso y Centenar") y una sola frase de ARVID que los menciona.
- **CE-04.** **Con la subida de nivel:** el aviso de nivel (modal) va primero; el aviso de logro aparece al cerrarlo. ARVID dice primero el nivel y después el logro.
- **CE-05.** Nunca bloquea: el aviso no tapa la barra de navegación ni los botones de registrar, y se anuncia en una región `role="status"`.
- **CE-06.** **Movimiento reducido:** sin partículas; el aviso aparece y desaparece sin animación.

### 3.4 Insignias (IN, D-080)
- **IN-01.** Las 11 insignias y un marco vacío salen de una sola hoja generada con IA por el responsable del producto (prompt común con estilo, paleta y contenido de cada celda; registrado en `docs/design/asset-licenses.md`).
- **IN-02.** Un script (`scripts/build-badges.sh`) recorta de la hoja las 11 insignias centradas, las reduce a 64 × 64 px con filtro de caja, limita la imagen a 96 colores y genera el atlas `public/achievements/badges.png` (una fila en el orden de los logros). Se muestran a 64 px en la cuadrícula, a 128 px sin suavizado en la hoja y a 48 px suavizadas en el aviso. La hoja original queda fuera del repositorio (`vendor/badges/sheet.png`).
- **IN-03.** **Pendientes:** la misma insignia con filtro de escala de grises y opacidad 0,45 (en CSS); no hace falta arte aparte.
- **IN-04.** **Licencia:** arte propio del responsable, generado con IA (declaración, como la música).
- **IN-05.** **Si el arte no está a tiempo:** se publica con un marcador provisional (icono del 1-Bit Pack dentro de un marco pixel) y el arte se cambia después sin tocar el código.

### 3.5 Botones (BT, D-081, D-082)
- **BT-01.** **Estilo "Bisel pixel"** para todo `.btn`:
  - relleno de color;
  - esquinas en escalera de 2 px (recorte con `clip-path` y píxeles de esquina pintados);
  - contorno de 2 px casi negro;
  - franja de luz de 2 px arriba y sombra de 6 px abajo;
  - al pulsar, la sombra baja a 2 px y el botón se hunde 4 px; al pasar el ratón, se aclara un poco.
- **BT-02.** **Variantes:**

  | Variante | Relleno | Texto |
  |---|---|---|
  | Principal | `--c-blue` | blanco |
  | Normal | `--c-navy` | blanco |
  | Peligro | `--c-red` | blanco |
  | Fantasma | sin relleno ni contorno | cian, subrayado de 2 px |
  | Desactivado | `--c-ink` con contorno `--c-slate` | `--c-slate` |
  | Sobre la escena (bocina, chat) | ink translúcido | blanco |

- **BT-03.** **Foco:** con el teclado, el contorno pasa a dorado (`--focus`); el contorno de foco general no sirve aquí porque el recorte lo oculta.
- **BT-04.** **Tamaño:** se mantiene el mínimo de 44 × 44 px.
- **BT-05.** **Contraste:** el texto de cada variante cumple AA (≥ 4,5:1) sobre su relleno.
- **BT-06.** **Movimiento reducido:** sin transiciones; el hundimiento al pulsar se mantiene, porque es respuesta al gesto y no animación.

### 3.6 Accesibilidad (AC)
- **AC-01.** Los E2E pasan **axe** (`@axe-core/playwright`, reglas WCAG 2.1 A y AA) en: onboarding (cada paso), Hoy, Actividades, crear y editar actividad, detalle de misión, Perfil (con la hoja de un logro abierta), Ajustes y Créditos, en los dos idiomas. **0 infracciones** de impacto serio o crítico; las moderadas o menores se corrigen o se justifican en tests.md.
- **AC-02.** Se corrige todo lo que salga en AC-01 dentro de este incremento.
- **AC-03.** El lienzo de la escena sigue siendo una imagen con descripción (`role="img"`) y lo que dice ARVID sigue en su región `status` (BP-04).

### 3.7 Rendimiento (RE)
- **RE-01.** **Lighthouse** en móvil sobre el despliegue de producción, en Hoy con datos: Rendimiento ≥ 90, Accesibilidad ≥ 95 y Buenas prácticas ≥ 90. Los resultados se anotan en tests.md.
- **RE-02.** **Un año de datos:** con 12 actividades registradas a diario durante 365 días y 60 misiones, el cálculo completo del dominio (periodos, progreso, atributos, Disciplina, rachas y logros) tarda ≤ 150 ms en Node (prueba unitaria con margen), y Hoy se puede usar en ≤ 2 s tras la carga en el E2E con esos datos importados.
- **RE-03.** Se corrige lo que no cumpla RE-01 o RE-02 dentro de este incremento.

## 4. Datos
- **Tabla `achievements`** (ya existe, en el backup desde la v1): `{ id: 'L-01' … 'L-11', unlockedAt: Instant }`. Sin migración.
- **Ajuste nuevo** `achievementsReady: boolean`: los logros ya se evaluaron una vez en este dispositivo (LO-05). Del dispositivo: no va en el backup. Al importar, se trata como ausente.

## 5. Requisitos no funcionales
- **NFR7-01.** La celebración de un logro no retrasa el registro: el registro se guarda y se ve antes de que aparezca el aviso.
- **NFR7-02.** Atlas de insignias ≤ 30 KB, precacheado (offline).
- **NFR7-03.** Todos los textos nuevos están en `es.json` y `en.json` (I18N-05).

## 6. Ejemplos (Given/When/Then)
**L-02 · Semana sólida**
- Given "Caminar" diaria con una racha de 6
- When el usuario la registra hoy
- Then la racha pasa a 7, se guarda L-02 con la hora actual, salen partículas, ARVID dice "¡Logro nuevo: Semana sólida!…" y aparece el aviso; en Perfil, L-02 se ve a color con "Ganado el …"

**L-08 · Regreso**
- Given el último registro fue el 1 de octubre y hoy es 10 de octubre (8 días completos sin registros)
- When el usuario registra cualquier actividad
- Then se desbloquea L-08 y ARVID celebra la vuelta

**L-08 · Sin historial previo**
- Given un usuario nuevo sin ningún registro
- When registra por primera vez
- Then se desbloquea L-01, pero no L-08

**LO-03 · Permanente**
- Given L-04 desbloqueado con el registro número 100
- When el usuario deshace ese registro
- Then L-04 sigue ganado; el contador de registros vuelve a 99

**LO-05 · Primera evaluación**
- Given un usuario con historial que cumple L-01, L-04 y L-11, en su primera apertura con la 0.7.0
- When se abre la app
- Then los 3 se guardan sin partículas ni aviso, y ARVID dice una vez "Revisé tu historial: ya tenías 3 logros"

**CE-04 · Con subida de nivel**
- Given el registro que da el nivel 10
- When se registra
- Then aparece primero el aviso de nivel; al cerrarlo, el aviso de "Vigía"

**BT-03 · Foco**
- When el usuario llega a "Completar" con Tab
- Then el contorno del botón se ve dorado

## 7. Dependencias y riesgos
- **Dependencias:**
  - La hoja de insignias generada por el responsable (IN-01); hay alternativa provisional (IN-05).
  - `@axe-core/playwright` como dependencia de desarrollo nueva.
  - Lighthouse con `npx` (sin dependencia en el proyecto).
- **Riesgos:**
  - **R7-1 · Arte incoherente** (11 insignias con estilos distintos). *Mitigación:* un solo prompt con estilo y paleta fijos, una sola hoja, ajuste a la paleta en el script y regenerar solo las celdas que desentonen.
  - **R7-2 · Logros que se ganan "sin querer" al deshacer o importar.** *Mitigación:* permanentes (LO-03) y desbloqueo en silencio al importar (LO-05).
  - **R7-3 · Demasiadas celebraciones juntas.** *Mitigación:* CE-03 y CE-04.
  - **R7-4 · El recorte de los botones oculta el foco.** *Mitigación:* BT-03 y la regla de axe del foco.

## 8. Plan de entrega
- **0.7.0:** logros (con el arte final o el provisional de IN-05) y botones.
- **0.7.1:** accesibilidad y rendimiento (AC, RE).
- **1.0.0:** cuando la 0.7.1 esté desplegada y el responsable cierre la checklist en los teléfonos, el MVP queda completo.

## 9. Decisiones de esta spec (aprobadas, D-083)
| ID | Propuesta |
|---|---|
| S7-01 | Los 11 logros con nombres definitivos en español e inglés; L-02 solo con actividades diarias; L-08 exige un registro previo (LO-01) |
| S7-02 | Progreso medible para L-02, L-03, L-04, L-06, L-09, L-10 y L-11 (LO-04) |
| S7-03 | Desbloqueo en silencio la primera vez y al importar, con la fecha de esa evaluación (LO-05; precisa D-079) |
| S7-04 | Sección en Perfil con cuadrícula, contador y hoja de detalle (LP) |
| S7-05 | Celebración: partículas, ARVID (momento `achievement`, con IA si está activa) y aviso de 5 s; agrupada y después del nivel (CE) |
| S7-06 | Insignias: hoja generada con IA → atlas de 32 px con script; pendientes en gris por CSS; marcador provisional si no hay arte (IN) |
| S7-07 | Botones "Bisel pixel" con las variantes y el foco dorado de BT |
| S7-08 | axe en E2E sin infracciones serias ni críticas (AC) |
| S7-09 | Lighthouse ≥ 90 / 95 / 90 y un año de datos ≤ 150 ms (RE) |
| S7-10 | Entrega en 0.7.0 y 0.7.1, y 1.0.0 al cerrar la checklist (§8) |
