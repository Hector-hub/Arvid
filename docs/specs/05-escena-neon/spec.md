# Spec 05 — Escena neón, protagonistas y música

Estado: **aprobada** (D-050, 2026-10-18; licencias D-051; PRO-01, PRO-02, ESC-07 y MUS-06 enmendados por la spec 06, D-066) · **implementada** 2026-10-18 en la versión 0.5.0 · desplegada en Netlify (pendiente: checklist manual M5) · Incremento 5 de implementation-plan.md (Logros y pulido pasa a ser el 6)
Cubre: MVP-10 (amplía el sistema de diseño), MVP-05 (personaje en Hoy y Personaje) y música opcional (adelantada de P1)
Decisiones que modifica (§10): D-027, D-029, D-036, D-037 (regla de los 16 colores), C-003, design-system §6 y §12, mvp-scope (sonidos en P1)
Prototipo de referencia: `prototypes/escena-warped/` (local, fuera de git), con `index.html` (escena), `variantes.html` (galería) y `exports/hoja-protagonistas.png`

## 1. Contexto y objetivo
Hoy el personaje es un sprite fijo de 16×16 del 1-Bit Pack (C-005). El responsable del producto quiere que la app tenga un toque **cyberpunk neón** y que el personaje se sienta vivo, sin añadir mecánicas nuevas.

El objetivo es que abrir ARVID **apetezca**, sin que la escena compita con la información:
- **La escena es decorativa.** No tiene obstáculos, interacción ni mecánicas, y nada de lo que muestra es información que no esté también en texto.
- **Las partículas son el único vínculo con el progreso.** Celebran registrar, completar y subir de nivel.
- **El personaje sigue sin evolucionar** (D-029). El usuario elige protagonista y colores.

## 2. Resultado de la exploración (2026-10-17 y 18)
La exploración se hizo con prototipos sucesivos.

| Tema | Probado | Resultado |
|---|---|---|
| Estilo | Neón intenso o sutil; paleta A (Sweetie 16) o B (magenta/cian) | **Neón sutil + paleta A** en la interfaz |
| Ubicación | Opción 1: escena solo en Hoy · Opción 2: en Hoy y en Personaje | **Opción 2** |
| Escena | Ciudad dibujada a mano con Sweetie 16 · pack **Warped City** (Ansimuz) | **Warped City**: puente nocturno con parallax |
| Elementos | Farolas, barandillas, coches, peatones, obstáculos y salto, reloj digital, dron | Se quedan farolas (2× la altura del personaje, con parpadeo), barandillas, vehículos y peatones en ambos sentidos y el dron mascota. **Descartados:** obstáculos, salto, correr y reloj |
| Protagonistas | Warped City, 3 Cyberpunk Characters, Residents of the City, Striker, Streets of Fight, dos sprites generados con IA | **4 protagonistas:** Ella (Warped City), Ella 2 (Brawler Girl, Streets of Fight), Él (sprite-ai.art), Él 2 (sprite-ai.art). Descartados: un sprite de IA cuyos 9 fotogramas tenían la misma pose |
| Peatones | Residents of the City | 10 residentes, escalados a la altura del protagonista |
| Variantes | Recoloreado por roles de color (pelo, ropa, piel, zapatos) | 6 variantes por protagonista: Original, Neón, Carmesí, Bosque, Plata y Ocaso |
| Fotos de perfil | Retratos generados con IA a partir de los sprites | **Descartadas** |
| Música | 5 pistas de CombinaDos y 2 descargadas aparte | 7 pistas en bucle y orden aleatorio, opcional |

**Aprendizajes técnicos que la implementación debe conservar:**
- **Animación basada en el tiempo** (`dt` normalizado a 60 Hz). Con el bucle por fotograma, en la pantalla de 144 Hz del responsable todo iba unas 2,4 veces más rápido.
- **Recoloreado en tiempo de ejecución por roles** (tabla de color original → gama nueva, ordenada por luminosidad). Hay colores compartidos que se separan por zona: altura dentro del fotograma, si el píxel es contorno, etc.
- **Sprites que miran a la izquierda** (Él) se dibujan en espejo.
- **Sprites generados con IA:** hay que comprobar fotograma a fotograma que el ciclo de caminar existe de verdad. Una métrica de diferencia de píxeles no basta, porque detecta el ruido.
- **Audio en iOS:** el volumen se controla con Web Audio (`GainNode`), porque `audio.volume` es de solo lectura.

## 3. Alcance
**Incluye:**
- Escena animada en Hoy y en Personaje.
- Partículas al registrar, completar, crear y subir de nivel.
- Elección de protagonista y variante en el onboarding y en Ajustes.
- Música opcional.
- Pantalla de créditos.
- Ajustes de "neón sutil" en la interfaz.
- Registro de licencias de todos los assets nuevos.

**Excluye:**
- Obstáculos, salto, interacción con la escena y minijuegos.
- Reloj.
- Fotos de perfil o retratos.
- Personaje que evoluciona o cosméticos desbloqueables (D-016, D-029).
- Efectos de sonido.
- Escenas distintas por pantalla u hora del día.
- Tema claro (P1).

## 4. Requisitos funcionales

### 4.1 Escena (ESC)
- **ESC-01.** Lienzo lógico de 384×192 px, escalado sin suavizado (`image-rendering: pixelated`) al ancho del contenedor (máximo 720 px), con proporción 2:1.
- **ESC-02.** **Parallax** de 3 capas de fondo de Warped City, que se desplazan al 2 %, 8 % y 20 % de la velocidad del suelo.
- **ESC-03.** **Puente:**
  - Acera, barandilla y carretera dibujadas en la escena.
  - Farolas de unas 2× la altura del protagonista, separadas 112 px.
  - Las farolas y su haz van al frente: por delante de peatones, detalles de la acera, ARVID y protagonista; solo la barandilla queda delante (D-074).
  - El haz de luz sale de la bombilla.
  - Cada farola parpadea de forma aleatoria e independiente.
- **ESC-04.** **Protagonista:** camina en el sitio a velocidad constante (el mundo se desplaza a 0,55 px por fotograma de 60 Hz). Nunca corre ni salta.
- **ESC-05.** **Vehículos:**
  - 3 modelos de Warped City, que circulan por la carretera en los dos sentidos.
  - Aparecen de forma esporádica, nunca más de uno a la vez por carril.
  - El sentido alterna (con un 20 % de repetición, para que no parezca mecánico).
- **ESC-06.** **Peatones:**
  - Residentes que caminan por la acera en ambos sentidos, con baja frecuencia (uno cada 15–25 s de media).
  - Se escalan a la altura del protagonista y caminan a una velocidad parecida a la suya.
- **ESC-07.** **Dron mascota:** sigue al protagonista por encima y detrás, con balanceo suave, y de vez en cuando hace la animación de escaneo.
- **ESC-08.** **Fecha** bajo la escena, en texto ("Sábado, 17 oct"). Sustituye al encabezado de fecha actual de Hoy. No hay reloj.
- **ESC-09.** **Animación por tiempo** (`requestAnimationFrame` con `dt` normalizado a 60 Hz y limitado a 3 fotogramas). Va a la misma velocidad a 60, 120 y 144 Hz.
- **ESC-10.** **Ahorro:** la escena no se anima con la app oculta (`visibilitychange`) ni cuando el lienzo está fuera de la pantalla (`IntersectionObserver`). Al volver, continúa sin saltos.
- **ESC-11.** **Movimiento reducido** (`prefers-reduced-motion` o el ajuste `reducedMotion`, C-003):
  - Escena estática, con el protagonista en reposo o en su primer fotograma.
  - Sin parallax, parpadeo, vehículos, peatones ni partículas.
  - El cambio se aplica en vivo.
- **ESC-12.** **Fallo de carga:** si un asset no carga, la escena se sustituye por un panel con el fondo de la paleta y la app funciona igual.
- **ESC-13.** **Drones del cielo:** otros 5 modelos del Free Drones Pack cruzan a lo lejos, uno cada 4–10 s y como mucho 3 a la vez, en ambos sentidos y con su animación. Cada uno va a una de 3 distancias (lejos, en medio, cerca): más pequeño y más teñido del color del cielo cuanto más lejos, con el parallax de la capa que tiene detrás. Los de lejos pasan por detrás de la ciudad del fondo; los de en medio, por detrás de los edificios delanteros; los de cerca, por delante. Con movimiento reducido no hay drones (D-075).

### 4.2 Ubicación (UB)
- **UB-01.** **Hoy:** la escena va arriba, con la fecha debajo (ESC-08), y después el contenido actual.
- **UB-02.** **Personaje:** la escena sustituye al sprite del 1-Bit Pack, con el nivel y el título superpuestos en la esquina superior izquierda ("Nv 5 · Aprendiz"). El resto de la pantalla no cambia (S4-01).
- **UB-03.** **≥ 768 px:** la escena ocupa el ancho de la columna principal (design-system §9).
- **UB-04.** Las dos pantallas comparten la misma instancia de la escena. Al cambiar de pestaña, los vehículos, los peatones y el desplazamiento continúan donde estaban.
- **UB-05.** **Hoy:** la escena, la fecha y el nivel quedan fijos arriba al hacer scroll, en el mismo sitio en que empiezan; el resumen del día y el resto del contenido pasan por debajo (D-072).

### 4.3 Partículas (PAR)
- **PAR-01.** **Ráfaga pequeña** (≈30 partículas en los 3 colores neón de la escena: cian, naranja y magenta) desde el protagonista al registrar progreso de una actividad, completar una misión o crear una actividad o misión.
- **PAR-02.** **Ráfaga grande** (≈70 desde el protagonista y ≈30 en cada lado del cielo) al subir de nivel, junto al aviso actual de LevelUp.
- **PAR-03.** Si el evento ocurre con la escena fuera de la pantalla (por ejemplo, al crear desde un formulario), la ráfaga se muestra al volver a ella, una sola vez y solo si han pasado menos de 10 s.
- **PAR-04.** Deshacer, editar, pausar, archivar y abandonar no generan partículas.
- **PAR-05.** Con movimiento reducido no hay partículas (ESC-11).

### 4.4 Protagonistas y variantes (PRO)
- **PRO-01.** **Catálogo:** 4 protagonistas × 6 variantes (§9 recoge las licencias que lo condicionan).

  | id | Nombre en la interfaz (provisional) | Origen | Animaciones |
  |---|---|---|---|
  | `ella` | Ella | Warped City | Reposo (4 fotogramas) y caminar (16) |
  | `ella2` | Ella 2 | Streets of Fight · Brawler Girl | Reposo (4) y caminar (10) |
  | `el` | Él | sprite-ai.art | Caminar (8), en espejo y siempre sin arma |
  | `el2` | Él 2 | sprite-ai.art | Caminar (8) |

  Variantes: `original`, `neon`, `carmesi`, `bosque`, `plata` y `ocaso`. Sus gamas de color están en el prototipo (`recolor.js`, `male.js` y `palette-recolor.js`) y se pasan a datos de dominio.
- **PRO-02.** **Onboarding:** paso nuevo "Elige tu protagonista", con una vista previa animada, 4 protagonistas y 6 colores. "Ella · Original" viene preseleccionada y se puede continuar sin cambiarla.
- **PRO-03.** **Ajustes → Apariencia:** el mismo selector. El cambio se ve al instante en la escena.
- **PRO-04.** El recoloreado se hace una vez por cambio de variante y se reutiliza (no se recalcula por fotograma).
- **PRO-05.** La elección es solo estética: no afecta a XP, atributos ni logros, y todas las opciones están disponibles desde el principio (D-016).

### 4.5 Música (MUS)
- **MUS-01.** Opcional y **desactivada por defecto** (C-003).
- **MUS-02.** **Lista:** las pistas verificadas de §9 (2 en la 0.5.0; 3 desde D-073). Orden aleatorio: se barajan todas, suenan todas una vez y se vuelve a barajar sin empezar por la última que sonó. Bucle indefinido.
- **MUS-03.** **Fundidos:** fundido de entrada de 1,2 s y de salida al final de cada pista. El volumen va por Web Audio (`GainNode`).
- **MUS-04.** **Arranque:** solo con un gesto del usuario. Si la música quedó activada, empieza con la primera interacción de la sesión.
- **MUS-05.** **App oculta:** se pausa y se reanuda al volver.
- **MUS-06.** **Controles:** en Ajustes → Sonido (activar, volumen y pista actual con "Siguiente"), y un botón ♪ de activar/pausar en la esquina de la escena de Hoy.
- **MUS-07.** **Offline:** las pistas **no** se precachean (≈13 MB). Se guardan en caché la primera vez que suenan (`CacheFirst` con soporte de peticiones por rangos), así que una pista ya escuchada suena sin conexión. Sin conexión solo se eligen las pistas en caché, y si no hay ninguna se avisa con "La música necesita conexión la primera vez".
- **MUS-08.** **Nombre de la pista:** cada vez que empieza una pista, su nombre ("♪ Black Chrome Horizon") aparece arriba a la izquierda de la escena y se desvanece a los 5 s (fundido de 0,8 s). Al cambiar de pantalla no vuelve a aparecer. Con movimiento reducido desaparece sin fundido (D-071).

### 4.6 Interfaz "neón sutil" (DIS)
- **DIS-01.** La interfaz mantiene Sweetie 16 (paleta A, D-037) y añade **brillo sutil**:
  - Tokens `--glow-cyan` y `--glow-gold`, como `text-shadow` o `box-shadow` de 6–12 px con baja opacidad.
  - Se aplican a títulos de pantalla, el nivel, el borde de la escena y el botón principal.
  - El brillo nunca sustituye al contraste: los valores de design-system §2 se siguen cumpliendo sin él.
- **DIS-02.** **Excepción a la regla de los 16 colores** (design-system §1): la escena, los protagonistas y sus variantes usan los colores de sus packs y de las gamas de §4.4. El resto de la interfaz sigue con los 16.
- **DIS-03.** Los iconos de categorías e interfaz siguen siendo del 1-Bit Pack (D-036). Solo el personaje deja de serlo.

### 4.7 Créditos y licencias (LIC)
- **LIC-01.** Ningún asset entra en el repositorio ni en el build sin estar registrado y verificado en `asset-licenses.md` (D-028). Si un protagonista, el dron, los peatones o una pista quedan sin verificar, **no se incluyen**: la escena funciona sin ellos y el catálogo se reduce.
- **LIC-02.** **Ajustes → Créditos** lista autor, recurso y licencia de cada asset de terceros, incluida la atribución que exija la licencia (p. ej. OGA-BY).

## 5. Datos
Ajustes nuevos en `settings` (clave–valor; entran en el backup sin cambiar el formato v1):

| Clave | Tipo | Por defecto |
|---|---|---|
| avatar | `{ cast: 'ella' \| 'ella2' \| 'el' \| 'el2', variant: 'original' \| 'neon' \| 'carmesi' \| 'bosque' \| 'plata' \| 'ocaso' }` | `{ cast: 'ella', variant: 'original' }` |
| music | `{ enabled: boolean, volume: number (0–1) }` | `{ enabled: false, volume: 0.4 }` |

Comportamiento con valores ausentes o desconocidos:
- Si falta una clave (por ejemplo, en un backup anterior), se usa el valor por defecto.
- Si un `cast` o una `variant` ya no existe (porque un asset se retiró por licencia), se usa el valor por defecto sin error.

## 6. Requisitos no funcionales
- **NFR5-01.** **Fluidez:** dibujar un fotograma de la escena cuesta < 4 ms en un Android de gama media. Objetivo de 60 fps (design-system §11).
- **NFR5-02.** **Peso de la escena:** imágenes de la escena, protagonistas, peatones y drones ≤ 350 KB en total (hoy ≈210 KB), precacheadas. Música fuera del precache (MUS-07).
- **NFR5-03.** **Recoloreado:** generar las hojas de una variante tarda < 50 ms (mejor de 7).
- **NFR5-04.** **Carga diferida:** la escena se carga después del contenido. Hoy es usable antes de que la escena termine de cargar, y la primera pintura no empeora más de 100 ms respecto a la 0.4.0.
- **NFR5-05.** **Accesibilidad:**
  - El lienzo lleva `role="img"` y un `aria-label` breve ("Tu protagonista camina por un puente de la ciudad de noche").
  - El nivel y la fecha existen como texto.
  - El botón ♪ tiene nombre accesible y estado (`aria-pressed`).
- **NFR5-06.** **Rendimiento con la app oculta:** 0 fotogramas dibujados (ESC-10).

## 7. Ejemplos (Given/When/Then)
**ESC-09 · Pantalla de 144 Hz**
- Given una pantalla de 144 Hz y otra de 60 Hz
- When pasan 10 s
- Then el desplazamiento del suelo es el mismo en ambas (±2 %)

**PAR-01 · Registrar**
- Given la escena visible en Hoy
- When se registra "Caminar"
- Then sale una ráfaga pequeña del protagonista
- And al deshacer no sale ninguna

**PAR-02 · Subir de nivel**
- Given faltan 5 XP para el nivel 6
- When se registra una actividad de 10 XP
- Then sale la ráfaga grande y aparece el aviso de LevelUp

**PAR-03 · Evento fuera de la escena**
- Given el usuario crea una misión desde su formulario y vuelve a Hoy en 3 s
- Then ve la ráfaga pequeña una vez
- And si vuelve a los 30 s, no la ve

**PRO-03 · Cambiar de protagonista**
- Given "Ella · Original"
- When elige "Él 2 · Ocaso" en Ajustes
- Then la escena de Hoy y la de Personaje muestran a Él 2 con pelo rojizo y camisa violeta
- And tras recargar la app sigue así

**MUS-02 · Orden aleatorio**
- Given la música activada
- When suenan 7 pistas seguidas
- Then son las 7 distintas
- And la 8.ª no es igual que la 7.ª

**MUS-07 · Sin conexión**
- Given sin conexión, con "Fallen" y "Taurus" escuchadas antes
- When se activa la música
- Then solo suenan esas dos, alternando al azar

**§5 · Backup antiguo**
- Given un backup de la 0.4.0 sin `avatar` ni `music`
- When se importa
- Then se usa "Ella · Original" con la música desactivada

**ESC-11 · Movimiento reducido**
- Given `prefers-reduced-motion: reduce`
- Then la escena está quieta, con el protagonista en reposo, y registrar no genera partículas

## 8. Estados de interfaz y casos límite
| Situación | Comportamiento |
|---|---|
| Escena cargando | Panel del color de fondo con la misma proporción (sin saltos de layout) |
| Fallo de carga de un asset | ESC-12 |
| Movimiento reducido activado en vivo | La escena se detiene en el acto (ESC-11) |
| App en segundo plano | Escena y música en pausa (ESC-10, MUS-05) |
| El navegador bloquea el audio | El botón ♪ queda en "activar"; sin errores visibles |
| iPhone con el interruptor de silencio | Comprobación manual (M5-04). Si Web Audio queda en silencio, se usa `navigator.audioSession.type = 'playback'` donde exista |
| Pantalla de 320 px | La escena mide 320×160 y sigue legible; el nivel superpuesto no tapa al protagonista |
| Pantalla de 144 Hz | ESC-09 |
| Variante desconocida al importar | §5 |

## 9. Dependencias, licencias y riesgos

**Licencias de los assets** (condición de LIC-01):

| Recurso | Licencia | Estado |
|---|---|---|
| Warped City (Ansimuz): fondos, vehículos, protagonista Ella | Dominio público; atribución opcional | ✔ Verificada (`public-license.txt`, 2026-10-18) |
| Streets of Fight (Ansimuz): Brawler Girl | CC0 | ✔ Verificada (`public-license.pdf`, 2026-10-18) |
| Free Townspeople Cyberpunk (CraftPix): peatones | Licencia gratuita de CraftPix: uso comercial sin atribución; prohíbe publicar los archivos originales | ✔ Verificada (2026-10-18). Se publican combinados en un atlas propio (`extras.png`) |
| Free Drones Pack (CraftPix): dron | La misma licencia de CraftPix | ✔ Verificada (2026-10-18). En el mismo atlas |
| Él y Él 2 (sprite-ai.art, IA) | Propios | ✔ Declaración del responsable (2026-10-18) |
| 5 pistas de CombinaDos (Ascension, Curiosity, Descent, Fallen, Taurus) | Desconocida | ✘ No se incluyen hasta verificarlas |
| Midnight Sector Drive (Gemini, IA) | Propia | ✔ Declaración del responsable (2026-10-18) |
| Glass Tower Horizon (Gemini, IA) | Propia | ✔ Declaración del responsable (2026-10-18) |
| Black Chrome Horizon (Gemini, IA) | Propia | ✔ Declaración del responsable (2026-10-18, D-073) |

**Riesgos:**
- **R5-1 · Licencias sin verificar.** Resuelto para todo salvo las 5 pistas de CombinaDos, que quedan fuera (D-051). *Mitigación:* LIC-01 deja que el incremento se publique con lo que esté verificado.
- **R5-2 · Batería y rendimiento** de una animación continua en el móvil. *Mitigación:* ESC-10, NFR5-01 y NFR5-06.
- **R5-3 · Coherencia visual** (R-005): Warped City y Streets of Fight son del mismo autor, pero los sprites de IA no. *Mitigación:* revisión visual en la escena; si desentonan, se retiran.
- **R5-4 · Audio en iOS:** autoarranque, interruptor de silencio y peticiones por rangos en el service worker. *Mitigación:* MUS-04, MUS-07 y checklist manual.

**Dependencias:** ninguna librería nueva (canvas 2D y Web Audio nativos). Los assets se copian de `vendor/` a `public/` solo tras verificar su licencia.

## 10. Decisiones de esta spec (aprobadas, D-050)
| ID | Propuesta |
|---|---|
| S5-01 | Escena animada de Warped City en Hoy y en Personaje, con los elementos de §4.1 (opción 2 de la exploración) |
| S5-02 | Interfaz con Sweetie 16 + neón sutil (DIS-01). La escena y los protagonistas son excepción a la regla de los 16 colores (DIS-02, enmienda a design-system §1) |
| S5-03 | Enmienda a **D-029**: el personaje sigue sin evolucionar, pero el usuario elige entre 4 protagonistas y 6 variantes (PRO). No es un cosmético desbloqueable (D-016 se mantiene) |
| S5-04 | Enmienda a **D-036**: el personaje deja de ser del 1-Bit Pack; los iconos siguen siéndolo |
| S5-05 | Partículas al registrar, completar, crear y subir de nivel, con la regla de los 10 s (PAR) |
| S5-06 | Música opcional, desactivada por defecto, sin precache (MUS). Adelanta "sonidos" de P1 solo para la música; los efectos de sonido siguen en P1 |
| S5-07 | Este incremento pasa a ser el 5; Logros y pulido pasa al 6 |
| S5-08 | Publicar solo los assets con licencia verificada (LIC-01). Las verificaciones pendientes de §9 son tarea del responsable del producto |
| S5-09 | Nombres de los protagonistas en la interfaz: provisionales ("Ella", "Ella 2", "Él", "Él 2") hasta que se decidan otros |
