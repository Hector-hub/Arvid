# ARVID — Diseño del sistema de juego

Estado: **aprobado** (D-035, 2026-10-17; enmiendas D-044, D-046) · Implementa: D-032–D-034, D-006, D-007, D-009, D-011–D-014, D-016–D-018, D-020b, D-021, D-025, D-026, C-002.

Este documento define las reglas exactas del motor (MVP-04). Los ejemplos de §12 se convertirán uno a uno en tests unitarios. Los valores marcados como *(ajustable)* son parámetros de configuración del motor, no constantes repartidas por el código.

---

## 0. Principios del motor
1. **Todo se deriva del historial.** XP, nivel, atributos, Disciplina, rachas y comodines **no se guardan** como contadores: se calculan a partir de los registros fuente (actividades y sus versiones, registros de cumplimiento, misiones y sus eventos). Así, deshacer o registrar algo de forma retroactiva siempre da un resultado coherente.
   - La única excepción son los logros: se guarda la fecha de desbloqueo (§9).
2. **Funciones puras.** Las mismas entradas y la misma fecha de referencia producen siempre el mismo resultado.
3. **Una acción, una recompensa por sistema.** Un registro aporta XP una sola vez y cuenta como máximo una vez en cada atributo. Los logros no dan XP.
4. **Lo ganado no se pierde.** La XP solo disminuye si se deshace o se elimina un registro (es una corrección, no un castigo).

## 1. Glosario
| Término | Definición |
|---|---|
| Actividad | Algo recurrente que el usuario quiere hacer: `N` veces por periodo (día, semana o mes), con categoría y dificultad |
| Registro | Una unidad de cumplimiento de una actividad en una fecha local |
| Periodo | Intervalo de evaluación de una actividad: un día, una semana (lunes–domingo) o un mes natural |
| Valor `v` | Puntos según la dificultad: Fácil 5 · Media 10 · Difícil 20 *(ajustable)* |
| Puntos ganados `E` / posibles `P` | Lo conseguido frente al máximo en un periodo o misión |
| Misión | Tarea única con categoría, dificultad y fecha límite opcional |
| Ventana | Los últimos `W` días (7, 30 o 90) usados para atributos y Disciplina |
| Elemento evaluado | Un periodo de actividad o una misión que entra en el cálculo de una ventana |

## 2. Tiempo
- **R-T1.** "Hoy" es la fecha local del dispositivo. El día empieza a las 00:00 locales.
- **R-T2.** Cada registro guarda su **fecha local** (`YYYY-MM-DD`), el instante UTC y el desfase horario. Los periodos se calculan **siempre con la fecha local guardada**. Viajar o cambiar al horario de verano no reubica el historial.
- **R-T3.** Las semanas van de lunes a domingo; los meses son meses naturales.
- **R-T4.** Un periodo está **cerrado** cuando "hoy" es posterior a su último día. Si no, está **abierto**.
- **R-T5.** Una fecha es **editable** si pertenece al periodo abierto de esa actividad o es "ayer" (D-021). Las fechas futuras nunca son editables.

## 3. Actividades
### 3.1 Configuración
- Frecuencia: `periodo ∈ {día, semana, mes}` y `N`, con estos límites: día 1–10, semana 1–14, mes 1–28 (así cualquier mes, incluido febrero, permite completarla).
- Además: categoría (una sola) y dificultad.
- **R-A1.** La configuración es versionada. Un cambio aplica desde el periodo que contiene la fecha del cambio en adelante; los periodos anteriores conservan su configuración original, incluida la categoría.
- **R-A2.** Si cambia el **tipo** de periodo (p. ej. de diario a semanal), el nuevo periodo actual es un periodo de gracia (§3.4).

### 3.2 Registro y deshacer
- **R-A3.** Cada toque crea un registro en una fecha editable.
- **R-A4.** Como máximo hay `N` registros por periodo. Al llegar a `N`, el periodo se muestra "Completado" y no admite más. Esto evita duplicados accidentales.
- **R-A5.** Un registro puede eliminarse ("deshacer") mientras su fecha sea editable. Después es inmutable.

### 3.3 Puntos de un periodo
Para un periodo con `c` registros:

```
r = min(c, N) / N
E = v × r
P = v
```

Los valores se redondean a 2 decimales (redondeo a la mitad hacia arriba) por periodo.

### 3.4 Periodos que no se evalúan
Estos periodos **aportan XP** por lo que se hizo, pero no cuentan en atributos, Disciplina ni rachas (salvo la excepción indicada):
- **R-A6 (gracia).** El periodo en que se crea, se reactiva o cambia de tipo una actividad es de gracia. Solo se evalúa si se completa al 100 % (`r = 1`); si no, se excluye. Así, crear una actividad semanal en domingo no penaliza.
- **R-A7 (pausa).** Un periodo se excluye si la actividad estaba pausada o archivada en su último día. Los periodos completos dentro de una pausa no existen a efectos de evaluación.
- **R-A8 (abierto).** Un periodo abierto solo se evalúa si ya está completo (`r = 1`). Así, completar algo hoy se refleja enseguida, pero un día a medias no penaliza antes de terminar.
- **R-A9 (truncado, D-044).** Un periodo cortado por un cambio de tipo (p. ej. la semana del 28 sep al 4 oct cuando la versión mensual empieza el 1 oct) no se evalúa. Aporta XP por los registros de su tramo; los posteriores al corte pertenecen al periodo nuevo, que es de gracia (R-A2).

## 4. XP, niveles y títulos
- **R-X1.** XP total = suma de `E` de **todos** los periodos de todas las actividades (incluidos los de gracia y pausa) + el valor `v` de cada misión completada (a tiempo, sin fecha límite o tarde, D-032).
- **R-X2.** La XP se muestra redondeada hacia abajo a un entero; internamente se conserva con 2 decimales.
- **R-X3.** XP acumulada necesaria para alcanzar el nivel `L` *(ajustable)*:

```
XP(L) = 50 × L × (L − 1)        → subir de L a L+1 cuesta 100 × L
```

| Nivel | XP acumulada | Ritmo de referencia (50 XP/día ≈ 5 actividades diarias Medias) |
|---|---|---|
| 2 | 100 | día 2 |
| 5 | 1 000 | ~3 semanas |
| 10 | 4 500 | ~3 meses |
| 15 | 10 500 | ~7 meses |
| 20 | 19 000 | ~1 año |
| 30 | 43 500 | ~2,4 años |
| 40 | 78 000 | ~4,3 años |

- **R-X4.** Los títulos se obtienen por nivel *(nombres provisionales, P-006)*:

| Nivel | Título |
|---|---|
| 1 | Recluta |
| 5 | Aprendiz |
| 10 | Vigía |
| 15 | Centinela |
| 20 | Estratega |
| 30 | Élite |
| 40 | Leyenda |

## 5. Atributos (ejes del radar)
- **R-AT1.** Para una categoría `k`, una ventana de `W` días y una fecha de referencia `hoy`, la ventana es `[hoy − W + 1, hoy]`. Elementos evaluados:
  - Periodos evaluables (§3.4) de actividades de `k` cuyo **último día** cae dentro de la ventana. Los periodos abiertos y completos usan "hoy" como fecha.
  - Misiones de `k` completadas a tiempo o sin fecha límite, con su **fecha de finalización** dentro de la ventana: `E = v`, `P = v`.
- **R-AT2.** Puntuación:

```
Atributo_k = redondear(100 × ΣE / ΣP)      (0–100, redondeo a la mitad hacia arriba)
```

- **R-AT3 (sin datos).** Si hay menos de **3 elementos evaluados** *(ajustable)*, el atributo se muestra como "sin datos (n de 3)", nunca como 0 (C-002). En el radar, ese eje se dibuja vacío y con una marca distinta.
- **R-AT4 (periodo anterior).** La superposición usa la misma función con la referencia `hoy − W` y solo con registros de fecha ≤ esa referencia.
- **R-AT5 (tendencia).** `Δ = actual − anterior` (ambos con datos). Si Δ ≥ +5 es "subiendo"; si Δ ≤ −5, "bajando"; en otro caso, "estable" *(umbral ajustable)*.
- **Nota:** con la ventana de 7 días, una actividad semanal aporta como mucho 1 periodo y una mensual solo aporta si el mes en curso ya está completo. La interfaz lo explica.
- **Lo que el atributo NO mide:** mide el **cumplimiento de lo que te propusiste** en esa área, no tu salud ni tu capacidad reales. La explicación de la interfaz lo dice expresamente.

## 6. Disciplina
- **R-D1.** Misma ventana y misma fórmula que un atributo, pero sobre **todas** las categorías:
  - Todos los periodos evaluables de todas las actividades.
  - Misiones **con fecha límite** completadas a tiempo: `E = v`, `P = v`, en su fecha de finalización.
  - Misiones vencidas no recuperadas: `E = 0`, `P = v`, en su **fecha límite** (D-020b).
  - Misiones con fecha límite abandonadas antes de vencer: `E = 0`, `P = v / 2`, en la **fecha de abandono** (media penalización, D-033).
  - Las misiones sin fecha límite **no cuentan** (no hubo compromiso de plazo).
  - Las misiones completadas tarde se **excluyen** de Disciplina (recuperas el atributo, no lo subes); sí dan XP (D-032).
- **R-D2.** Se aplica la misma regla de "sin datos" (R-AT3).
- **R-D3.** Se muestra como medidor aparte, no como eje del radar (D-025).

## 7. Rachas y comodines
Por actividad, contadas en periodos de esa actividad.
- **R-S1.** Un periodo evaluable está **cumplido** si `r = 1`; un periodo parcial no mantiene la racha (D-034). Los periodos no evaluables (gracia, pausa) ni suman ni rompen la racha.
- **R-S2.** Al cerrarse un periodo cumplido, la racha aumenta en 1. Cada vez que la racha alcanza un múltiplo de 7 *(ajustable)*, se gana 1 comodín si se tienen menos de 2 *(ajustable)*.
- **R-S3.** Al cerrarse un periodo evaluable **no** cumplido:
  - Si hay un comodín, se consume **automáticamente**: la racha se conserva (sin aumentar).
  - Si no hay, la racha vuelve a 0.
- **R-S4.** El comodín protege **solo la racha**. El periodo sigue contando con sus puntos reales en atributos y Disciplina.
- **R-S5.** Un periodo abierto **ya cumplido** cuenta como cumplido a todos los efectos: suma a la racha y puede ganar un comodín (D-044). Si se deshace el registro, el recálculo lo retira (R-S6).
- **R-S6.** Como todo se deriva del historial (§0), un registro retroactivo de "ayer" puede devolver un comodín consumido o restaurar una racha. Es el comportamiento esperado.

## 8. Misiones
### 8.1 Estados

| Estado | Condición | XP | Categoría | Disciplina |
|---|---|---|---|---|
| Pendiente | No completada; sin fecha o con `hoy ≤ fecha límite` | — | — | — |
| Completada a tiempo | Fecha de finalización ≤ fecha límite (o sin fecha) | +v | +v / v | +v / v (solo si tenía fecha) |
| Vencida | `hoy >` fecha límite y no completada | — | — | 0 / v en la fecha límite |
| Completada tarde | Completada después de vencer | +v (D-032) | — | excluida (se anula el fallo) |
| Abandonada antes de vencer | Abandonada siendo pendiente | — | — | 0 / (v / 2) en la fecha de abandono si tenía fecha límite (D-033); sin fecha límite → — |
| Abandonada vencida | Abandonada estando vencida | — | — | 0 / v (el fallo queda) |

### 8.2 Reglas
- **R-M1.** La fecha límite incluye el día completo (hasta las 23:59 locales).
- **R-M2.** La fecha de finalización puede ser hoy o ayer (D-021). Completar "ayer" una misión cuya fecha límite era ayer cuenta a tiempo.
- **R-M3.** Reprogramar una misión **pendiente** solo cambia su fecha límite; no tiene efectos.
- **R-M4.** Reprogramar una misión **vencida** le asigna una nueva fecha límite orientativa (para ordenarla en "Hoy"), pero el fallo se mantiene hasta que se complete. Completarla en cualquier momento la pasa a "completada tarde". Si la nueva fecha también vence, **no** se penaliza de nuevo: la pérdida es única (D-020).
- **R-M6.** Abandonar es definitivo: una misión abandonada no puede completarse después. Si se quiere retomar, se crea una misión nueva.
- **R-M7.** Abandonar una misión con fecha límite **antes** de vencer cuesta la mitad: `P = v / 2`, `E = 0` en Disciplina (D-033). Abandonar una misión sin fecha límite no penaliza (D-020b).
- **R-M5.** Las misiones completadas pueden desmarcarse mientras su fecha de finalización sea editable.
- **R-M8 (D-046).** Quitar la fecha límite a una misión pendiente equivale a reprogramarla (R-M3): desde entonces no puede vencer. A una misión vencida no le anula el fallo (como R-M4).
- **R-M9 (D-046).** Desmarcar una misión completada a tiempo cuya fecha límite ya pasó la convierte en vencida, con el fallo en esa fecha límite. Desmarcar una completada tarde la devuelve a vencida.
- **R-M10 (D-046).** La fecha de finalización nunca es anterior al día de creación de la misión.
- **R-M11 (D-046).** Una misión vence al terminar el día de la fecha límite **vigente** en ese momento. Los eventos se procesan en orden de instante y se comparan con la fecha límite vigente por su fecha local (así, completar "ayer" una misión con fecha límite ayer cuenta a tiempo, R-M2).

## 9. Logros
- **R-L1.** Se evalúan sobre el estado derivado. Al cumplirse la condición se guarda `unlockedAt` y el logro queda **permanente**, aunque luego se deshaga el registro que lo provocó (evita parpadeos).
- **R-L2.** No dan XP (§0.3).

| ID | Nombre provisional | Condición |
|---|---|---|
| L-01 | Primer paso | Primer registro de cualquier actividad |
| L-02 | Semana sólida | Racha de 7 en una actividad diaria |
| L-03 | Treinta | Racha de 30 en cualquier actividad |
| L-04 | Centenar | 100 registros en total |
| L-05 | Palabra dada | Primera misión con fecha límite completada a tiempo |
| L-06 | Fiable | 10 misiones con fecha límite completadas a tiempo |
| L-07 | Rescate | Completar una misión vencida (completada tarde) |
| L-08 | Regreso | Registrar algo tras 7 o más días completos sin ningún registro |
| L-09 | Equilibrio | 4 o más categorías con atributo ≥ 60 en la ventana de 30 días |
| L-10 | Temple | Disciplina ≥ 80 en la ventana de 30 días (con datos) |
| L-11 | Vigía | Alcanzar el nivel 10 |

L-07 y L-08 premian **volver**, en línea con el problema principal (D-002).

## 10. Explicabilidad
Toda cifra del perfil tiene un desglose accesible:
- **Atributo:** "Cuerpo 79 — ganaste 162,5 de 205 puntos posibles en los últimos 30 días (4 semanas de Gym, 29 días de Caminar y 1 misión). Mide cuánto cumpliste lo que te propusiste, no tu estado físico."
- **Disciplina:** "82 — cumpliste el 82 % de todo lo que te propusiste en 30 días. 1 misión vencida resta 10 puntos posibles; complétala para recuperarlos."
- **Sin datos:** "Aún no hay suficiente información: 2 de 3 elementos necesarios."
- **XP:** "Has ganado 4 812 XP en total. La XP nunca se pierde."

## 11. Casos límite
| Caso | Comportamiento |
|---|---|
| Viaje o cambio de zona horaria | Los registros conservan su fecha local original (R-T2); "hoy" usa la zona actual |
| Cambio de horario de verano | Sin efecto (se usan fechas, no horas) |
| Meses de 28 a 31 días y años bisiestos | Los periodos mensuales son meses naturales; como `N` mensual está limitado a 28, toda actividad mensual es completable cualquier mes |
| Actividad creada en el último día del periodo | Periodo de gracia (R-A6) |
| Pausar el último día para evitar un fallo | Permitido (autonomía). Riesgo aceptado: es un sistema personal sin competición |
| Cambiar la dificultad a mitad de periodo | Aplica a todo el periodo actual (R-A1) |
| Archivar una categoría con actividades | Hay que reasignar o archivar antes sus actividades activas; el historial conserva la categoría original |
| Doble toque accidental | Limitado por R-A4 y reversible por R-A5 |
| Reloj del dispositivo manipulado | No se defiende (uso personal); se documenta |
| Importar un backup | Reemplaza todos los datos; todo se recalcula (§0) |

## 12. Ejemplos numéricos (futuros tests)

**E-1 · Periodo parcial.** Gym, 4/semana, Media (`v = 10`). 3 registros en la semana: `r = 0,75`, `E = 7,5`, `P = 10`. XP +7,5. Un quinto registro se rechaza (R-A4).

**E-2 · Atributo Cuerpo, ventana de 30 días.** Hoy aún no se ha caminado.
| Elemento | E | P |
|---|---|---|
| Gym, 4 semanas cerradas en la ventana con c = 4, 3, 4, 2 | 10 + 7,5 + 10 + 5 = 32,5 | 40 |
| Caminar, 1/día, Fácil (`v = 5`): 29 días cerrados, 22 cumplidos (hoy abierto e incompleto → excluido) | 110 | 145 |
| Misión "Revisión médica", Difícil, a tiempo | 20 | 20 |
| **Total** | **162,5** | **205** |

`100 × 162,5 / 205 = 79,27` → **Cuerpo = 79**.

**E-3 · Disciplina.** Lo de E-2, más Leer (1/día, Media, Aprendizaje: 29 días, 25 cumplidos → 250 / 290) y la misión "Entregar informe" (Media, vencida en la ventana → 0 / 10).
`E = 32,5 + 110 + 250 + 20 + 0 = 412,5` · `P = 40 + 145 + 290 + 20 + 10 = 505` → `81,68` → **Disciplina = 82**.

**E-4 · Recuperar una misión.** "Entregar informe" se completa tarde: se excluye → `412,5 / 495 = 83,33` → **Disciplina = 83**. La XP sube +10 (D-032); Aprendizaje no cambia.

**E-4b · Abandonar antes de vencer.** Partiendo de E-3, en lugar de dejar vencer "Entregar informe" se abandona antes de su fecha límite: aporta `0 / 5` → `412,5 / 500 = 82,5` → **Disciplina = 83** (frente a 82 si vence). La XP no cambia.

**E-5 · Rachas y comodines (actividad diaria).**
| Días | Resultado | Racha | Comodines |
|---|---|---|---|
| 1–7 | cumplidos | 7 | 1 (ganado al llegar a 7) |
| 8 | fallo | 7 (protegida) | 0 |
| 9–15 | cumplidos | 14 | 1 (ganado al llegar a 14) |
| 16 | fallo | 14 (protegida) | 0 |
| 17 | fallo | 0 | 0 |

**E-6 · Periodo de gracia.** Lectura semanal 3/semana creada el sábado; 1 registro el sábado; la semana cierra el domingo con `c = 1`. Se excluye de atributos, Disciplina y rachas; la XP suma `10 × 1/3 = 3,33`.

**E-7 · Retroactivo.** El lunes por la mañana se registra "ayer" (domingo) la tercera sesión de esa semana 3/semana: el periodo pasa a `r = 1`, la racha aumenta y, si se había consumido un comodín por ese periodo, se devuelve (R-S6).

**E-8 · Sin datos.** Categoría Relaciones con 2 periodos evaluados en 30 días → "sin datos (2 de 3)". El radar no muestra 0.

**E-9 · Niveles.** 999 XP → nivel 4 (Recluta); 1 000 XP → nivel 5 (Aprendiz); 4 500 XP → nivel 10 (Vigía).

## 13. Parámetros a revisar tras uso real
Aprobados con su propuesta por defecto (D-035); se revisarán tras 4 semanas de uso.
| ID | Pregunta | Propuesta |
|---|---|---|
| P-006 | Nombres de los títulos y de los logros | Los de §4 y §9 (neutros en género), editables más adelante |
| P-008 | Umbral de "sin datos" (3 elementos) y de tendencia (±5) | Mantenerlos y ajustarlos tras 4 semanas de uso real |
