# Spec 02 — Backup y progreso básico

Estado: **aprobada** (D-045; enmiendas D-044) · **implementada** 2026-10-17 en la versión 0.2.0 · desplegada en Netlify (pendiente: checklist manual M2) · Incremento 2 de implementation-plan.md
Cubre: MVP-09 (backup), MVP-04 (XP, niveles, títulos, rachas, comodines), MVP-05 (parcial: nivel y XP en Personaje)
Reglas: game-design §3.3, §3.4, §4, §7 · Datos: data-model §4 · Offline: offline-strategy §4 · Privacidad: security-privacy §2–3

## 1. Contexto y objetivo
Con el incremento 1 ya se pueden registrar actividades, pero:
- No hay protección ante la pérdida de datos. Es el riesgo n.º 1 (R-001).
- No hay sensación de progreso.

Este incremento hace que el uso diario real sea **seguro** (backup) y **gratificante** (XP, nivel, títulos y rachas con comodines). Es la primera vez que se aplica el motor de reglas de game-design.md.

## 2. Alcance
**Incluye:**
- Motor de periodos evaluados: puntos por periodo, evaluabilidad (gracia, pausa, abierto y truncado).
- XP, nivel y título.
- Rachas y comodines por actividad.
- Pantalla Personaje con nivel y XP.
- Indicador compacto de progreso en Hoy.
- Racha en Hoy y en el detalle.
- Celebración al subir de nivel.
- Exportar e importar backup.
- Recordatorio de backup.
- Eliminar todos los datos.

**Excluye:** atributos, radar y Disciplina (inc. 4); misiones (inc. 3; la XP de misiones se sumará entonces); logros (inc. 5); backup cifrado (P1/P2).

## 3. Enmiendas a game-design.md (necesitan aprobación)
| ID | Hueco detectado | Propuesta |
|---|---|---|
| **GD-A1** | Al cambiar el tipo de periodo, el periodo antiguo queda partido. Ej.: de semanal a mensual el 14 oct, la nueva versión empieza el 1 oct y la semana del 28 sep al 4 oct queda cortada el 30 sep | **R-A9 (truncado):** un periodo cortado por un cambio de tipo **no se evalúa** (ni atributos, ni Disciplina, ni rachas); aporta XP por lo que se hizo dentro de su tramo. Los registros posteriores al corte pertenecen al periodo nuevo, que es de gracia (R-A2) |
| **GD-A2** | R-S2 dice que la racha sube "al cerrarse" el periodo; R-S5, que se muestra la del periodo abierto ya cumplido. No queda claro cuándo se gana el comodín | Un periodo abierto **ya cumplido** cuenta como cumplido a todos los efectos, **incluido ganar el comodín** al llegar a un múltiplo de 7. Como todo se deriva del historial, deshacer ese registro retira el comodín. Así lo ves al instante y la regla es una sola |

## 4. Requisitos funcionales

### 4.1 Motor de periodos (ENG)
- **ENG-01.** Para cada actividad se enumeran todos sus periodos desde el que contiene su creación hasta el que contiene hoy, usando la versión vigente en cada tramo (R-A1). Cada periodo tiene: `c`, `N`, `r`, `E` y `P` (§3.3), `cerrado` y `evaluable`, con el motivo de no evaluable: `gracia`, `pausa`, `abierto` o `truncado`.
- **ENG-02.** Los puntos se calculan en centésimas enteras: `E = round_half_up(v × 100 × min(c, N) / N)`. Así se evitan errores de coma flotante.
- **ENG-03.** Gracia (R-A6): un periodo que contiene un evento `created`, `resumed` o `unarchived`, o que es el primero tras un cambio de tipo (R-A2), solo es evaluable si `r = 1`.
- **ENG-04.** Pausa (R-A7): un periodo cerrado no es evaluable si la actividad estaba pausada o archivada en su último día. En un periodo abierto se usa el estado de hoy.
- **ENG-05.** Abierto (R-A8): un periodo abierto solo es evaluable si `r = 1`.
- **ENG-06.** Truncado (GD-A1).

### 4.2 XP, nivel y título (PRG)
- **PRG-01.** XP total = Σ `E` de **todos** los periodos de todas las actividades, incluidas las pausadas o archivadas (R-X1).
- **PRG-02.** Nivel = el mayor `L` con `50 × L × (L − 1) ≤ XP` (R-X3). Título según la tabla R-X4.
- **PRG-03.** La pantalla **Personaje** muestra el personaje, "Nivel L · Título", una barra de XP del nivel ("1 240 / 1 500 XP"), la XP total y el texto "La XP nunca se pierde". Los atributos siguen como "Próximamente" (inc. 4).
- **PRG-04.** **Hoy** muestra bajo la fecha un indicador compacto: "Nv 5 · Aprendiz" y una barra de XP. Al tocarlo se abre Personaje.
- **PRG-05.** El feedback de registrar incluye la XP ganada: "+1 · 2 de 4 · +2,5 XP". Al deshacer: "Registro deshecho · −2,5 XP".
- **PRG-06.** **Subida de nivel:** cuando el nivel calculado supera el último nivel celebrado (`settings.lastCelebratedLevel`), se muestra un modal con el personaje, "¡Nivel L!" y el título si cambia. Al cerrarlo se guarda el nivel. Si el nivel baja por deshacer, no se vuelve a celebrar al recuperarlo. Con movimiento reducido, el modal aparece sin animación.
- **PRG-07.** **Migración:** en la primera ejecución de este incremento con datos existentes, `lastCelebratedLevel` se fija al nivel actual sin celebrar, para no lanzar celebraciones retroactivas.

### 4.3 Rachas y comodines (STR)
- **STR-01.** Por actividad, se recorren sus periodos en orden cronológico:
  - **No evaluable:** se ignora.
  - **Cumplido (`r = 1`):** racha + 1. Si la racha es múltiplo de 7 y hay menos de 2 comodines, se gana 1.
  - **Cerrado no cumplido:** si hay comodín, se consume y la racha se mantiene; si no, la racha pasa a 0.
  - **Abierto y no cumplido:** no se evalúa (GD-A2, R-S1 a R-S6).
- **STR-02.** La fila de Hoy muestra la racha si es ≥ 1: icono de llama y "racha 6 días" (o "semanas" / "meses", según el periodo).
- **STR-03.** El detalle muestra la racha actual, la mejor racha histórica y los comodines ("Comodines 1 de 2"), con una explicación breve.
- **STR-04.** Cuando un comodín protege la racha, el detalle lo indica en ese periodo ("Comodín usado").

### 4.4 Backup (BAK)
- **BAK-01.** **Exportar** (Ajustes → Copia de seguridad) genera `arvid-backup-AAAA-MM-DD.json` con el formato de data-model §4: todas las tablas, `formatVersion: 1`, `schemaVersion`, `appVersion` y `exportedAt`.
- **BAK-02.** Si el navegador puede compartir archivos (`navigator.canShare({ files })`), se usa la hoja de compartir del sistema para guardarlo en Archivos, Drive, etc.; si no, se descarga. Antes se avisa: "El archivo contiene tus actividades en texto legible. Guárdalo en un lugar privado".
- **BAK-03.** `lastBackupAt` se guarda cuando la exportación termina. Si el usuario cancela la hoja de compartir, no se guarda.
- **BAK-04.** **Importar:** se elige un archivo y se valida con Zod **antes** de tocar nada:
  - el formato;
  - que `formatVersion` y `schemaVersion` no sean más nuevos que los de la app;
  - los tipos de cada campo;
  - la integridad referencial (todo ID referenciado existe).

  Si falla, se muestra el motivo y no se modifica nada.
- **BAK-05.** Si es válido, se muestra un resumen ("Exportado el 12 oct 2026 · 8 actividades · 412 registros") y la advertencia "Reemplazará todos tus datos actuales", con dos botones: "Exportar mis datos actuales primero" y "Reemplazar".
- **BAK-06.** **Reemplazar** borra e inserta en **una sola transacción**: si algo falla, quedan los datos anteriores. Se conservan los ajustes propios del dispositivo (`persistGranted`, `installHintDismissedAt`). `lastCelebratedLevel` se fija al nivel resultante (PRG-07).
- **BAK-07.** **Recordatorio en Hoy:** aparece un aviso no bloqueante si se cumplen las dos condiciones:
  - Hay actividades, y no ha habido backup desde hace 7 días o más (o nunca, si el primer dato tiene 7 días o más).
  - Hay cambios posteriores al último backup.

  Botones: "Exportar" y "Más tarde" (oculta el aviso hasta mañana).

### 4.5 Eliminar datos (DEL)
- **DEL-01.** Ajustes → "Eliminar todos mis datos" pide escribir **BORRAR** para confirmar. Borra todas las tablas, vuelve a crear las categorías predefinidas y vuelve al onboarding (security-privacy §2).

## 5. Requisitos no funcionales
- **NFR2-01.** Calcular el progreso con un año de datos (10 actividades diarias, unos 3 650 periodos) tarda < 50 ms en un Android de gama media. Se verifica con un benchmark en un test.
- **NFR2-02.** El import valida archivos de hasta 5 MB sin bloquear la interfaz más de 1 s.
- **NFR2-03.** Ida y vuelta sin pérdida: exportar → importar produce el mismo estado derivado (XP, nivel, rachas).

## 6. Ejemplos (Given/When/Then)
Los ejemplos E-1, E-5, E-6, E-7 y E-9 de game-design §12 se implementan literalmente como tests. Además:

**ENG-02 · Redondeo**
- Given "Lectura" 3/semana Media (v = 10) con 1 registro
- Then `E = 333` centésimas (3,33) y la XP mostrada sube 3

**GD-A1 · Truncado**
- Given "Gym" semanal desde septiembre, con 2 registros el 29 y el 30 de septiembre
- When el 14 oct cambio a mensual 8/mes
- Then la semana del 28 sep queda truncada al 30 sep: aporta XP (2 de N) y no se evalúa ni afecta a la racha
- And el mes de octubre es de gracia

**GD-A2 · Comodín al completar hoy**
- Given una actividad diaria con racha 6 y 0 comodines
- When registro hoy
- Then la racha es 7 y hay 1 comodín
- When deshago el registro
- Then la racha vuelve a 6 y hay 0 comodines

**PRG-06 · Subida de nivel**
- Given 995 XP (nivel 4) y `lastCelebratedLevel = 4`
- When registro una actividad Media diaria (+10 XP)
- Then aparece el modal "¡Nivel 5!" con el título "Aprendiz"
- When lo cierro, deshago y vuelvo a registrar
- Then no aparece de nuevo

**BAK-04 · Archivo de una versión futura**
- Given un backup con `formatVersion: 2`
- When lo importo
- Then veo "Este archivo es de una versión más nueva de ARVID. Actualiza la app" y mis datos no cambian

**BAK-06 · Fallo durante el reemplazo**
- Given un import válido
- When la escritura falla a mitad de la transacción (simulado)
- Then los datos anteriores siguen intactos

**BAK-07 · Recordatorio**
- Given el último backup hace 8 días y un registro posterior
- Then Hoy muestra el aviso
- When toco "Más tarde"
- Then no aparece hasta mañana

## 7. Estados de interfaz
| Pantalla | Estados nuevos |
|---|---|
| Hoy | Indicador de nivel · Racha por fila · Aviso de backup · Modal de nivel |
| Personaje | Nivel 1 sin XP ("Registra tu primera actividad para ganar XP") · Con progreso |
| Detalle | Sin racha · Racha con comodines · Periodo protegido por comodín |
| Ajustes → Copia de seguridad | Nunca exportado · Último backup "hace N días" · Exportando · Import inválido (motivo) · Confirmación de reemplazo · Importado |
| Ajustes → Eliminar | Confirmación con texto · Error si el texto no coincide |

## 8. Casos límite
| Caso | Comportamiento |
|---|---|
| Actividad archivada | Su XP histórica se mantiene; los periodos posteriores al archivo no aportan |
| Pausa de varias semanas | Los periodos pausados ni suman ni rompen la racha (R-A7, R-S1) |
| Reanudar en mitad de la semana | Esa semana es de gracia |
| Cambiar N a mitad de periodo | Aplica a todo el periodo actual (R-A1); la racha se evalúa con la N nueva |
| Importar un backup con fechas futuras respecto al reloj del dispositivo | Se aceptan; la evaluación usa "hoy" |
| Importar el mismo backup dos veces | Resultado idéntico (reemplazo, no fusión) |
| `navigator.share` disponible pero falla sin ser una cancelación | Se recurre a la descarga |
| Reloj del dispositivo atrasado | Se acepta (game-design §11) |

## 9. Dependencias y riesgos
- **Dependencias:** ninguna nueva (Zod ya está instalado).
- **Riesgos:**
  - Comportamiento de `navigator.share` con archivos JSON en iOS y Android, que hay que comprobar en el dispositivo (M2-01).
  - Rendimiento del recálculo completo en teléfonos lentos (NFR2-01; si falla, se memoiza por actividad).

## 10. Decisiones de esta spec que necesitan aprobación
| ID | Propuesta |
|---|---|
| GD-A1 | Periodos truncados por un cambio de tipo: no evaluables, aportan XP (§3) |
| GD-A2 | Un periodo abierto ya cumplido cuenta a todos los efectos, incluido ganar el comodín (§3) |
| S2-01 | Indicador compacto de nivel y XP en Hoy, además de Personaje (PRG-04) |
| S2-02 | Modal de subida de nivel una sola vez por nivel; sin celebraciones retroactivas al actualizar (PRG-06, PRG-07) |
| S2-03 | El import reemplaza todo (no fusiona) y conserva los ajustes propios del dispositivo (BAK-06) |
| S2-04 | Recordatorio de backup a los 7 días con cambios; "Más tarde" lo oculta hasta mañana (BAK-07) |
| S2-05 | "Eliminar todos mis datos" entra en este incremento, con confirmación escrita (DEL-01) |
