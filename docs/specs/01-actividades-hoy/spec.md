# Spec 01 — Actividades, Hoy y PWA offline

Estado: **aprobada** (D-042) · **implementada** 2026-10-17 · desplegada en Netlify (pendiente: checklist manual en dispositivos) · Incremento 1 de implementation-plan.md
Cubre: MVP-01, MVP-03 (parcial), MVP-06 (solo categorías predefinidas), MVP-08, MVP-10 (base)
Reglas: game-design §2 (R-T1 a R-T5), §3.1 a §3.3 (R-A1 a R-A5) · Datos: data-model.md · Diseño: design-system.md

## 1. Contexto y objetivo
Primer incremento usable: instalar ARVID en el teléfono, elegir las áreas de vida, crear actividades recurrentes y marcarlas cada día, **sin conexión**. También valida pronto el mayor riesgo técnico: la instalación y la persistencia en iPhone (R-002).

## 2. Alcance
**Incluye:**
- Proyecto base con el stack aprobado, tokens de diseño, fuentes y sprites.
- Onboarding: bienvenida, elección de categorías, guía de instalación y `persist()`.
- Categorías predefinidas activables.
- Actividades: crear, editar, pausar, reanudar y archivar.
- Registro y deshacer, incluido el retroactivo de "ayer".
- Pantalla Hoy.
- Detalle de actividad con el periodo actual.
- Ajustes mínimos.
- PWA instalable y offline, publicada en Netlify.

**Excluye (incrementos posteriores):** XP, nivel, rachas y comodines (inc. 2), backup (inc. 2), misiones (inc. 3), atributos, radar, Disciplina y categorías propias (inc. 4), logros (inc. 5).

Los datos que exigen esas reglas (versiones de configuración, eventos de estado) **sí se guardan desde este incremento**, para que el cálculo posterior sea exacto.

## 3. Requisitos funcionales

### 3.1 Onboarding (ONB)
- **ONB-01.** En el primer arranque se muestra el onboarding: bienvenida → elegir categorías → instalación (si procede) → Hoy.
- **ONB-02.** La pantalla de categorías muestra las 6 predefinidas (P-009: Cuerpo, Descanso, Mente, Aprendizaje, Relaciones, Orden) con su icono y color. Hay que activar al menos 1; todas vienen activadas por defecto.
- **ONB-03.** Si el dispositivo es iOS y la app no se ejecuta como instalada, se muestra la guía de instalación (Compartir → Añadir a pantalla de inicio) con la explicación: "Instalada, tus datos están protegidos". Se puede posponer con "Más tarde".
- **ONB-04.** Al terminar el onboarding se llama a `navigator.storage.persist()` y se guarda el resultado en `settings.persistGranted`.
- **ONB-05.** Mientras la app no esté instalada en iOS, Hoy muestra un aviso no bloqueante con un enlace a la guía.

### 3.2 Categorías (CAT)
- **CAT-01.** Las 6 categorías predefinidas se crean en la base de datos en el primer arranque (seed idempotente).
- **CAT-02.** En Ajustes → Categorías se puede activar o desactivar cada predefinida. No se puede desactivar una categoría con actividades activas o pausadas: se indica cuántas hay.
- **CAT-03.** Una categoría desactivada no aparece en el formulario de actividad.

### 3.3 Actividades (ACT)
- **ACT-01.** Formulario de creación:
  - Nombre (1–40 caracteres, sin espacios al inicio ni al final).
  - Categoría (entre las activas).
  - Frecuencia: periodo (día, semana o mes) y veces `N` (día 1–10, semana 1–14, mes 1–28).
  - Dificultad (Fácil 5 · Media 10 · Difícil 20, mostrando los puntos).
- **ACT-02.** Al crear se guardan `activities`, una `activityVersions` con `effectiveFrom` = inicio del periodo actual y un `activityStatusEvents` de tipo `created` con la fecha de hoy.
- **ACT-03.** Editar nombre: cambia el nombre sin versionar (es solo presentación).
- **ACT-04.** Editar categoría, frecuencia o dificultad crea una versión nueva con `effectiveFrom` = inicio del periodo **actual según la nueva configuración** (R-A1). Las versiones con `effectiveFrom` igual o posterior quedan sustituidas (p. ej. al pasar de semanal a mensual, el mes entero adopta la nueva configuración).
- **ACT-05.** Pausar, reanudar y archivar registran el evento con la fecha de hoy. Las actividades pausadas aparecen en Actividades dentro de "Pausadas" y no en Hoy. Las archivadas aparecen en "Archivadas" y se pueden restaurar (`unarchived`).
- **ACT-06.** No se pueden registrar cumplimientos de actividades pausadas ni archivadas.
- **ACT-07.** La lista de Actividades agrupa en Activas, Pausadas y Archivadas, y muestra el icono de categoría, el nombre y la frecuencia ("4 veces/semana").
- **ACT-08.** Las actividades activas se pueden reordenar (el orden se usa en Hoy). En el MVP se hace con botones subir/bajar (accesibles); arrastrar queda fuera.

### 3.4 Registro (LOG)
- **LOG-01.** Registrar crea un `completions` con `date` = la fecha elegida (hoy por defecto), `at` = el instante actual y `tzOffsetMin`.
- **LOG-02.** No se puede registrar si el periodo de esa fecha ya tiene `N` registros (R-A4).
- **LOG-03.** Solo se admiten fechas editables (R-T5): las del periodo abierto que sean ≤ hoy, más ayer.
- **LOG-04.** Deshacer elimina el registro más reciente (por `at`) de esa actividad en la fecha elegida, si la fecha es editable (R-A5).
- **LOG-05.** Tras registrar o deshacer, la interfaz se actualiza sin recargar (`liveQuery`) y muestra un feedback breve ("+1 · 3 de 4"), con una alternativa sin animación si el movimiento está reducido.
- **LOG-06.** Hay protección contra el doble toque: el botón ignora toques hasta que termina la escritura y durante 400 ms más (C-006); además, la comprobación de N y la escritura van en la misma transacción.

### 3.5 Pantalla Hoy (HOY)
- **HOY-01.** La cabecera muestra la fecha local ("Sábado, 17 oct") y el resumen: "Te quedan X para hoy". X es la suma de `N − c` de las actividades diarias activas que aún no están completas.
- **HOY-02.** Las secciones van en este orden:
  1. **Hoy:** actividades diarias.
  2. **Esta semana:** semanales, con "quedan D días".
  3. **Este mes:** mensuales, con "quedan D días".

  Dentro de cada sección van primero las incompletas y luego el orden del usuario.
- **HOY-03.** Cada fila muestra el icono de categoría, el nombre, el progreso "c de N" con una barra segmentada y un botón de registrar (≥ 44×44 px). Si está completa: chip "Completada", sin botón de registrar y con la opción "Deshacer".
- **HOY-04.** Las actividades completas de cada sección se agrupan al final.
- **HOY-05.** El enlace "¿Olvidaste algo ayer?" abre una hoja con las actividades activas cuyo periodo de **ayer** ya cerró sin completarse y permite registrar con fecha de ayer (D-021). Solo aparece si hay alguna. Las semanales o mensuales cuyo periodo sigue abierto no aparecen: se registran desde Hoy o desde su detalle.
- **HOY-06.** Estado vacío: si no hay actividades activas, se muestra una invitación ("Crea tu primera actividad") con un botón que abre el formulario.
- **HOY-07.** **Cambio de día:** si la app sigue abierta al pasar la medianoche, o vuelve al primer plano en otro día, Hoy se recalcula con la nueva fecha.

### 3.6 Detalle de actividad (DET)
- **DET-01.** Muestra la configuración vigente, el periodo actual (fechas, c de N) y, en las actividades semanales y mensuales, una tira con los días del periodo y sus registros.
- **DET-02.** Desde la tira se puede añadir o quitar un registro en cualquier día editable (LOG-03).
- **DET-03.** Acciones: editar, pausar o reanudar, archivar.

### 3.7 Ajustes mínimos (SET)
- **SET-01.** Muestra la versión de la app y el estado del almacenamiento: "Protegido" o "No protegido", con una explicación y un botón "Reintentar" que vuelve a llamar a `persist()`.
- **SET-02.** Movimiento reducido: Sistema, Activado o Desactivado.
- **SET-03.** Acceso a Categorías (CAT-02) y a la guía de instalación.

### 3.8 PWA (PWA)
- **PWA-01.** Manifest con nombre "ARVID", iconos (192, 512, maskable y apple-touch-icon), `display: standalone`, `theme_color` = ink y `background_color` = ink.
- **PWA-02.** El service worker precarga todo el app shell (HTML, JS, CSS, fuentes y sprites). Tras la primera carga, la app funciona sin red.
- **PWA-03.** Actualización en modo prompt: banner "Nueva versión disponible · Actualizar".
- **PWA-04.** Publicada en Netlify con HTTPS, con cabeceras CSP `default-src 'self'` y el service worker sin caché HTTP.
- **PWA-05.** Navegación con React Router: `/hoy`, `/actividades`, `/actividades/:id`, `/actividades/nueva`, `/personaje` (en este incremento solo el marcador "Próximamente": personaje y nivel en inc. 2) y `/ajustes`. El botón Atrás de Android funciona.

### 3.9 Interfaz base (UI)
- **UI-01.** Tokens CSS de design-system §2 y §3; fuentes autoalojadas; sprites del 1-Bit Pack recoloreados mediante máscara.
- **UI-02.** Barra inferior de 3 pestañas en móvil; barra lateral en ≥ 768 px.
- **UI-03.** Todo texto cumple el contraste AA; foco visible; objetivos táctiles ≥ 44 px; los iconos decorativos llevan `aria-hidden`.
- **UI-04.** Sin emojis en ningún lugar de la interfaz.
- **UI-05.** Las pantallas secundarias (detalle, ajustes, guía de instalación) tienen un enlace de vuelta explícito, porque la app instalada en iPhone no tiene botón Atrás (C-007).

## 4. Requisitos no funcionales
- **NFR-01.** La primera carga en 4G pesa < 500 KB comprimidos (sin contar fuentes y atlas, que se precargan).
- **NFR-02.** Registrar y ver la actualización en Hoy tarda < 100 ms en un Android de gama media.
- **NFR-03.** Sin peticiones de red en tiempo de uso (verificable en E2E).
- **NFR-04.** El dominio no importa react, dexie ni APIs del navegador (test de límites).

## 5. Flujos

```
Primer arranque: Bienvenida → Categorías → [iOS sin instalar] Guía → persist() → Hoy (vacío) → Crear actividad → Hoy
Uso diario:      Abrir → Hoy → tocar "registrar" → "+1 · 1 de 1 · Completada"
Olvido:          Hoy → "¿Olvidaste algo ayer?" → elegir actividad → registrar (fecha = ayer)
Corrección:      Hoy → fila completada → Deshacer
```

## 6. Estados de interfaz
| Pantalla | Estados |
|---|---|
| Hoy | Vacío (sin actividades) · Con pendientes · Todo completado ("Día completo") · Aviso de instalación (iOS) · Banner de actualización |
| Actividades | Vacío · Con activas · Con pausadas o archivadas |
| Formulario | Válido · Errores en línea por campo (nombre vacío o largo, sin categoría) |
| Detalle | Periodo en curso · Actividad pausada (registro deshabilitado y explicado) · Archivada |
| Ajustes | Almacenamiento protegido / no protegido / no soportado |

## 7. Ejemplos (Given/When/Then)

**ACT-04 · Cambiar la frecuencia a mitad de semana**
- Given "Gym" es 3/semana desde el lunes 12 oct y hoy es miércoles 14 oct con 2 registros
- When cambio la frecuencia a 4/semana
- Then existe una versión con `effectiveFrom = 2026-10-12` y N = 4, que sustituye a la anterior porque tiene el mismo `effectiveFrom`
- And Hoy muestra "2 de 4 · quedan 5 días"

**LOG-02 · Límite de registros**
- Given "Agua" es 8/día con 8 registros hoy
- When intento registrar
- Then no se crea ningún registro y la fila muestra "Completada"

**LOG-03 · Retroactivo de ayer cruzando periodo**
- Given hoy es lunes 19 oct y "Leer" es 3/semana
- When registro con fecha domingo 18 oct
- Then se crea con `date = 2026-10-18` y cuenta para la semana del 12 al 18 oct
- And no se permite registrar el sábado 17 oct (ni es ayer ni pertenece al periodo abierto)

**LOG-04 · Deshacer fuera de plazo**
- Given un registro del viernes 16 oct de una actividad diaria y hoy es domingo 18 oct
- When intento deshacerlo
- Then no está disponible (la fecha no es editable)

**HOY-05 · Olvido de ayer**
- Given "Caminar" (1/día) no tiene registro ayer
- When abro "¿Olvidaste algo ayer?" y registro "Caminar"
- Then se crea un registro con fecha de ayer y "Caminar" desaparece de la hoja

**HOY-07 · Medianoche**
- Given la app abierta el 17 oct a las 23:59 con "Caminar" completada
- When pasa a ser 18 oct
- Then Hoy muestra "Caminar" como pendiente (0 de 1) y la nueva fecha

**ACT-06 · Pausada**
- Given "Gym" pausada
- Then no aparece en Hoy ni en "¿Olvidaste algo ayer?", y su detalle no permite registrar

**PWA-02 · Offline**
- Given la app cargada una vez
- When el dispositivo está sin conexión y abro la app
- Then Hoy se muestra con mis datos y puedo registrar

## 8. Casos límite
| Caso | Comportamiento |
|---|---|
| Crear una actividad semanal el domingo | Se puede registrar hoy; el periodo de gracia se aplicará en el cálculo de puntos (inc. 2) |
| Bajar N por debajo de los registros ya hechos en el periodo | Los registros se conservan; el periodo se muestra completo; no se admiten más |
| Cambiar de diario a semanal a mitad de semana | La nueva versión empieza el lunes de la semana actual; los registros de esta semana cuentan hacia la nueva N |
| Viaje a otra zona horaria | Los registros conservan su fecha; "hoy" se recalcula con la zona actual |
| Dos pestañas abiertas en escritorio | Dexie propaga los cambios entre pestañas mediante `liveQuery` |
| `persist()` no soportado | Ajustes indica "No soportado en este navegador"; no se bloquea nada |
| Reloj del dispositivo cambiado manualmente | Se acepta (game-design §11) |

## 9. Dependencias y riesgos
- **Dependencias:**
  - Descargar el Kenney 1-Bit Pack (necesita tu permiso).
  - Cuenta de Netlify (es tuya; el primer despliegue lo harás tú o me indicarás cómo).
  - Instalar las dependencias npm (necesita tu permiso).
- **Riesgos:**
  - El 1-Bit Pack podría no incluir PNG transparentes; mitigación: un script de conversión, documentado en asset-licenses.md.
  - La guía de instalación de iOS depende de la interfaz de Safari, que cambia entre versiones; se usan capturas propias y genéricas.

## 10. Decisiones de esta spec que necesitan aprobación
| ID | Propuesta |
|---|---|
| S1-01 | Las 6 categorías predefinidas: Cuerpo, Descanso, Mente, Aprendizaje, Relaciones, Orden (resuelve P-009) |
| S1-02 | Reordenar con botones subir/bajar en lugar de arrastrar (accesible y simple) |
| S1-03 | Editar categoría, frecuencia o dificultad aplica desde el inicio del periodo actual (sustituye la versión de ese periodo) |
| S1-04 | `/personaje` muestra "Próximamente" en este incremento |
