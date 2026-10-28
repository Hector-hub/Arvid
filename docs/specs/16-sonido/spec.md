# Spec 16 — Efectos de sonido y panel de sonido

Estado: **aprobada** (2026-10-27) · Incremento 1.7.0 (D-139)
Decisiones que implementa: P1 «Efectos de sonido» (D-050 los dejó fuera del MVP) y D-138
Modifica:
- spec 05 (música): la sección **Ajustes → Sonido** pasa a ser un panel con música y efectos.

Referencia: la página de prueba «Sonidos de ARVID», que el responsable ya escuchó y aprobó con el timbre Suave.

## 1. Objetivo
Que la app **suene** cuando haces algo: un pequeño sonido al registrar, un remate al completar el día y una fanfarria al subir de nivel. Así se refuerza lo que ya se ve, sin molestar y bien mezclado con la música de fondo.

## 2. Alcance
**Incluye:**
- 10 efectos generados en el navegador (Web Audio), sin archivos.
- El panel **Ajustes → Sonido**: música (pista, volumen) y efectos (encendidos, volumen y timbre).

**Excluye:**
- Sonidos en los juegos: tienen el suyo propio.
- Vibración (háptica).
- Sonidos en las notificaciones push: los pone el sistema.
- Voz del compañero.

## 3. Requisitos funcionales

### 3.1 Los efectos (EF)
- **EF-01.** Cada efecto suena en este momento. Son los mismos que en la página de prueba:

| Efecto | Cuándo |
|---|---|
| Toque | Al pulsar «+» o «−» de una actividad, y los botones principales de las hojas y diálogos. **No** en la navegación ni en las pestañas (S16-03) |
| Registrar | Al registrar una actividad |
| Deshacer | Al quitar un registro |
| +XP | Cuando la XP sube tras registrar o completar una misión, justo después de «Registrar» |
| Día completo | Al completar todo lo de hoy (el mismo momento en que el compañero lo celebra) |
| Misión cumplida | Al completar una misión o un hito de un objetivo |
| Subes de nivel | Al aparecer el aviso «¡Nivel N!» |
| Logro | Al aparecer el aviso de un logro nuevo |
| El compañero habla | Mientras se escribe su burbuja, letra a letra, como mucho 40 letras por burbuja |
| Llega algo a la ciudad | Cuando el compañero anuncia lo nuevo de la ciudad (spec 11) |

- **EF-02. No se amontonan:**
  - si en el mismo instante tocan varios, suena el más importante (subir de nivel > logro > día completo > misión > +XP > registrar > toque);
  - el del compañero se calla mientras suena otro.
- **EF-03. Cuándo no suenan:**
  - con la app en segundo plano;
  - en las pantallas de juego;
  - con el movimiento reducido activado no cambia nada: el sonido no es movimiento.
- **EF-04. Modo silencio:** en iPhone, el interruptor de silencio silencia el audio web. En Android, siguen el volumen de multimedia, como la música.

### 3.2 El panel de sonido (PS)
En **Ajustes → Sonido**, con el estilo de la página de prueba:
- **PS-01. Música: un reproductor centrado** (el de la versión 2 de la página de prueba):
  - el **nombre de la pista** en dorado y «Pista 2 de 5» debajo;
  - una **barra de progreso** con el tiempo transcurrido y la duración; se puede arrastrar para saltar;
  - en el centro, **anterior**, **reproducir/pausa** y **siguiente**, con iconos pixel (pausa: las dos barras paralelas típicas, ‖) y botones **compactos**: 36 px los laterales y 46 px el central (los tamaños de la versión 3 de la página de prueba). «Anterior» vuelve al inicio de la pista si ya lleva más de 3 s;
  - al acabar una pista suena la siguiente, en orden (como ahora);
  - debajo, el volumen de la música.

  La música sigue apagada por defecto (D-050). Reproducir en el panel equivale a encenderla, y pausar a apagarla.
- **PS-02. Efectos:**
  - encendidos o apagados (**encendidos por defecto**);
  - volumen, separado del de la música (por defecto, **50 %**);
  - **timbre**: Suave (por defecto, ondas triangulares) o Chiptune (onda cuadrada, tipo 8 bits).
- **PS-03. «Escuchar»:** un botón junto a los efectos que suena «Registrar» y «+XP» con el volumen y el timbre elegidos.
- **PS-04.** Los controles de volumen usan una curva perceptiva, de modo que la mitad del control suena a la mitad.
- **PS-05.** El botón de música de la escena sigue igual: enciende o apaga la música.

### 3.3 Datos (DT)
- **DT-01.** Ajuste nuevo `sound: { effects: boolean, volume: number, timbre: 'soft' | 'chip' }`; `music` gana `track` (la pista actual, para seguir por ella al volver a abrir la app).
- **DT-02.** Viajan en la copia de seguridad, como `music`: son preferencias. Un backup sin ellos usa los valores por defecto.

## 4. Diseño técnico
- **`src/app/sound/sfx.ts`:**
  - un único `AudioContext` compartido con la música;
  - una ganancia de efectos;
  - las 10 recetas de la página de prueba como funciones puras sobre `AudioContext`;
  - prioridad (EF-02).
- **Desbloqueo del audio:** el contexto se crea o se reanuda en el primer toque del usuario, porque los navegadores no dejan sonar antes.
- **`useSfx()`:** un hook para que los componentes pidan un efecto. Los vigilantes que ya existen (nivel, logros, día completo, ciudad, voz del compañero) llaman al efecto correspondiente.
- **Sin archivos ni peso extra:** todo se sintetiza en el momento y no hay licencias que revisar.

## 5. Requisitos no funcionales
- **NFR16-01.** Un efecto empieza a sonar en menos de 30 ms desde la acción.
- **NFR16-02.** Sin errores ni avisos si el navegador no permite audio. La app funciona igual en silencio.
- **NFR16-03.** Textos nuevos en `es.json` y `en.json`.
- **NFR16-04.** Accesible: los controles del panel tienen etiquetas, y los sonidos nunca son la única señal de algo; siempre hay algo visible.

## 6. Ejemplos (Given/When/Then)
**EF-01 · Subir de nivel**
- Given los efectos encendidos
- When registras la actividad que te sube de nivel
- Then suenan «Registrar», «+XP» y, al aparecer el aviso, la fanfarria (EF-02: «Día completo» no se pisa con ella)

**PS-01 · Reproductor**
- Given la música sonando en la pista 2 de 5
- When pulsas «siguiente» y arrastras la barra a la mitad
- Then suena la pista 3 desde la mitad y el panel muestra su nombre y su tiempo

## 7. Riesgos
- **R16-1 · Cansancio:** sonidos en cada toque molestan.
  - *Mitigación:* el toque solo en acciones (EF-01), volumen bajo por defecto y un interruptor.
- **R16-2 · iOS y el audio web** (primer toque, segundo plano).
  - *Mitigación:* desbloqueo en el primer toque y prueba manual en el iPhone.

## 8. Plan de entrega
- **1.7.0:** todo lo anterior.

## 9. Decisiones de esta spec (aprobadas)
| ID | Propuesta |
|---|---|
| S16-01 | Los 10 efectos de la página de prueba, sintetizados, sin archivos |
| S16-02 | Efectos encendidos por defecto al 50 %, timbre Suave por defecto (decisión del responsable) |
| S16-03 | El toque solo en acciones, no al navegar |
| S16-04 | Reproductor de música centrado en el panel: anterior, reproducir/pausa y siguiente, barra de progreso y nombre de la pista |
| S16-05 | Los ajustes de sonido viajan en el backup |

## 11. Ampliación 1.8.0: música en segundo plano (D-163)
Modifica MUS-05 de la spec 05, por la que la música se pausaba al salir de la app. Prototipo probado en el iPhone con la app instalada (2026-10-28): por Web Audio la pista avanza en silencio con la pantalla bloqueada; directa, sigue sonando y los controles de bloqueo responden.

- **MB-01. Interruptor** «Seguir sonando al salir de la app» en Ajustes → Sonido, **encendido por defecto**. Ajuste `music.background`, que viaja en el backup.
- **MB-02. Cómo suena:**
  - con el interruptor encendido, la música suena directa, sin Web Audio, y no se pausa al ocultar la app;
  - apagado, como antes: por Web Audio y en pausa al salir (MUS-05).
  - Cambiarlo con la música sonando la pasa al otro modo sin perder la pista.
- **MB-03. Controles en la pantalla de bloqueo y en la notificación** (Media Session):
  - carátula de ARVID y nombre de la pista;
  - reproducir/pausa, anterior, siguiente y saltar en la pista;
  - pausar desde ahí equivale a pausar en la app.
- **MB-04. iPhone:** con el interruptor encendido, el volumen de la música lo llevan los botones del teléfono y no hay fundidos. El control de volumen de la app se desactiva y una nota lo explica. En Android y en el ordenador, el volumen y los fundidos siguen funcionando.
- **MB-05.** Los efectos de sonido solo suenan con la app abierta (EF-03).

Pruebas: `src/app/music/background.test.tsx`, que comprueba que en segundo plano no se pausa al ocultar la app y en primer plano sí, que el interruptor viene encendido y se guarda, y que los controles de bloqueo se registran. Manual: M16-05, con la pantalla bloqueada sigue sonando y los controles funcionan en iPhone y Android.
