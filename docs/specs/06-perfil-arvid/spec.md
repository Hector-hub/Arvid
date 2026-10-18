# Spec 06 — Perfil, ARVID con IA, idiomas y onboarding

Estado: **aprobada** (D-066, 2026-10-18) · **0.6.0 desplegada** y **0.6.1 implementada** 2026-10-18 (pendiente: desplegar la 0.6.1 y checklists M6 y M6-IA) · Incremento 6 de implementation-plan.md (Logros y pulido pasa a ser el 7)
Cubre: MVP-05 (perfil), MVP-08 (onboarding), MVP-10 (personalidad e idiomas) y la ampliación de alcance de D-059 (IA)
Decisiones que implementa: D-052 a D-064
Modifica:
- spec 05: PRO-01 (nombres), PRO-02 (onboarding), ESC-07 (dron) y MUS-06 (control de música);
- D-023 (sin servidor), D-029 (protagonista = usuario) y D-057 (estilo de diálogo);
- security-privacy.md §2 (datos que salen del dispositivo).

Prototipo de referencia: `prototypes/escena-warped/arvid.html` (estilos de diálogo y colores de ARVID).

## 1. Contexto y objetivo
Hasta la 0.5.0 el protagonista era un "personaje" con etiquetas como "Él 2", el dron era decoración y la app solo estaba en español. El responsable del producto quiere:
- **El protagonista es el usuario:** "Personaje" pasa a ser **Perfil**, con su alias.
- **Un onboarding profesional:** idioma, alias, género y personaje, con la UX de un juego.
- **ARVID, el dron, es la mascota.** Da la bienvenida, se mueve por la escena y **habla con IA**: aconseja según el estado real del usuario, por iniciativa propia en los momentos clave o cuando el usuario le escribe.
- **La app está en español e inglés.**

Principio: ARVID **acompaña, no juzga ni presiona**. Habla en momentos concretos, con frases breves, y nunca bloquea una acción. Sin conexión o sin IA, sigue hablando con sus frases fijas.

## 2. Alcance
**Incluye:**
- Perfil: renombrar Personaje y añadir alias y estilo.
- Onboarding nuevo guiado por ARVID e idioma elegible.
- Todos los textos de la interfaz en JSON (es/en).
- Colores, entrada, paseos y animaciones de ARVID.
- Burbuja pixel ×2.
- Chat con ARVID.
- IA con Mistral mediante una función de Netlify.
- Permiso para la IA.
- Presentación para los usuarios existentes.
- Bocina para la música.

**Excluye:**
- Voz o sonidos de ARVID (efectos de sonido en P1).
- Historial de chat guardado entre sesiones.
- Más modelos de dron.
- Idiomas distintos de español e inglés.
- Notificaciones push (P1).

## 3. Requisitos funcionales

### 3.1 Perfil (PF)
- **PF-01.** La pestaña "Personaje" pasa a llamarse **Perfil** y su ruta, `/perfil`. `/personaje/*` redirige a `/perfil/*`.
- **PF-02.** El encabezado de Perfil muestra el alias y el estilo ("Héctor · Drifter"). La escena mantiene el nivel y el título superpuestos.
- **PF-03.** Ajustes → **Perfil**: alias, género, idioma, personaje (el carrusel), color de ARVID, "ARVID con IA" y "ARVID habla por iniciativa propia". Sustituye a Ajustes → Apariencia.

### 3.2 Personajes y carrusel (PJ, CR)
- **PJ-01.** Nombres de estilo y descripción (D-058). Los identificadores internos no cambian.

  | Estilo | Personaje | Descripción |
  |---|---|---|
  | Runner | Chaqueta amarilla | Ágil, se mueve por la ciudad |
  | Brawler | Coleta roja | Fuerte y directa |
  | Ghost | Encapuchado | Sigiloso, de noche |
  | Drifter | Camisa blanca | Tranquilo, siempre de paso |
- **PJ-02.** **Orden según el género** (D-054): masculino → Ghost, Drifter, Runner, Brawler; femenino → Runner, Brawler, Ghost, Drifter; sin indicar → Runner, Ghost, Brawler, Drifter. Se preselecciona el primero y todos están disponibles.
- **CR-01.** **Tarjeta:** una tarjeta grande por personaje, con su animación ×3, el nombre de estilo y la descripción.
- **CR-02.** **Navegación:** deslizar con el dedo, flechas ‹ ›, las teclas ← → y puntos de paginación. Con movimiento reducido, sin animación de deslizamiento.
- **CR-03.** **Colores:** 6 muestras circulares con nombre accesible. La tarjeta se actualiza al instante.
- **CR-04.** **Accesibilidad:** el carrusel es un grupo de `radio` con nombre ("Elige tu personaje"). Cada tarjeta se anuncia como "Drifter, 4 de 4, Tranquilo, siempre de paso".

### 3.3 Idiomas (I18N, D-063)
- **I18N-01.** Todos los textos de la interfaz, de las frases fijas de ARVID y de los mensajes de error están en `src/i18n/es.json` y `src/i18n/en.json`, con las mismas claves. Ningún componente escribe texto literal.
- **I18N-02.** **Sintaxis:** interpolación `{nombre}` y plurales con sufijos `_one` / `_other` (con `Intl.PluralRules`). Las fechas y los números usan `Intl` con el idioma activo ("Domingo, 18 oct" / "Sunday, Oct 18").
- **I18N-03.** **Idioma por defecto:** el del navegador si es español o inglés; si no, español. Se elige en el primer paso del onboarding y se cambia en Ajustes → Perfil. Se aplica en el acto, sin recargar, y actualiza `<html lang>`.
- **I18N-04.** **Lo que el usuario escribe no se traduce:** nombres de actividades, misiones, categorías propias y alias. Las categorías predefinidas sí se muestran traducidas mientras el usuario no las renombre.
- **I18N-05.** **Prueba:** los dos archivos tienen exactamente las mismas claves y las mismas variables en cada texto.

### 3.4 ARVID: colores, entrada y movimiento (AV, MV)
- **AV-01.** **Colores** (D-053): Ámbar, Cian, Magenta, Lima, Oro y Violeta. Solo cambian los acentos (hélice, banda y luces). Por defecto, Cian.
- **AV-02.** **Animaciones:** flotar; escanear (luz encendida) al hablar, al pensar una respuesta y al inspeccionar un detalle; y un salto corto al celebrar.
- **MV-01.** **Entrada** (D-062): la primera vez que se muestra la escena en cada apertura de la app, ARVID llega a su sitio por una de estas vías, elegida al azar:
  - **Desde el fondo:** pequeño, alto y semitransparente, crece hasta su tamaño.
  - **Desde la izquierda:** por detrás del protagonista.
  - **Desde arriba:** baja y se estabiliza.

  Dura unos 2 s, con suavizado. Al llegar, puede hablar (DL).
- **MV-02.** **Paseos:** cada 20–40 s, si no está hablando, ARVID se desplaza despacio (unos 0,3 px por fotograma) a un punto al azar de la zona alta y media de la escena. Se queda 3–6 s flotando y vuelve a su sitio.
- **MV-03.** **Detalles de la acera:** por la acera pasan, con el suelo, detalles de Warped City (cajas de control y una señal en el suelo), cada 15–30 s. A veces (1 de cada 3), ARVID se acerca a uno, lo escanea 2–3 s y vuelve.
- **MV-04.** **Para hablar, ARVID vuelve siempre a su sitio** y empieza a hablar al llegar. Si el usuario abre el chat a mitad de un paseo, vuelve antes de responder.
- **MV-05.** **Movimiento reducido:** sin entrada animada, paseos ni saltos; ARVID queda quieto en su sitio y la burbuja sale sin escritura letra a letra.
- **MV-06.** La simulación de ARVID (estado, destino, velocidad y fases) es pura y determinista con semilla (`domain/scene`), como el resto de la escena.

### 3.5 Burbuja pixel ×2 (BP, D-061)
- **BP-01.** **Dibujo:** ARVID habla en Hoy y Perfil con una **burbuja pixel dibujada en la escena**, al doble del tamaño del prototipo: texto en Pixelify a 16 px lógicos, con borde cian y una cola hacia ARVID.
- **BP-02.** **Paginación:**
  - El texto se ajusta al ancho de la burbuja y se muestra **de 2 en 2 líneas**.
  - Cada página aparece letra a letra.
  - Se pasa a la siguiente **a los 5 s** de terminar o **al tocar** la burbuja; al tocar durante la escritura, se completa la página.
  - Tras la última página, la burbuja se cierra a los 5 s o al tocar.
- **BP-03.** Un indicador ▼ en la esquina avisa de que hay más páginas.
- **BP-04.** **Accesibilidad:** la página visible se repite en una región oculta `role="status"` (`aria-live="polite"`), porque el texto del lienzo no lo leen los lectores de pantalla.
- **BP-05.** **Onboarding:** usa la **caja de diálogo** con retrato (D-061), con la misma paginación de 2 en 2 líneas.

### 3.6 Chat (CH, D-064)
- **CH-01.** **Botón de chat** abajo a la derecha de la escena (donde estaba "Música"), con un icono pixel de bocadillo.
- **CH-02.** **Apertura:**
  - Al pulsarlo, un **campo de texto se despliega desde el botón hacia la izquierda** (unos 250 ms, por pasos; instantáneo con movimiento reducido) y recibe el foco.
  - El botón pasa a **"Enviar"**, con un icono de flecha.
  - Se cierra con Esc, tocando fuera o con el campo vacío y "Enviar".
- **CH-03.** **Envío:** el mensaje va a ARVID, que vuelve a su sitio (MV-04), escanea mientras "piensa" y responde en la burbuja. Mientras espera, la burbuja muestra "…" y el campo no admite otro mensaje.
- **CH-04.** **Límites:** el mensaje del usuario tiene hasta 280 caracteres. La conversación de la sesión, con un máximo de 10 turnos, se envía como historial y no se guarda al cerrar la app.
- **CH-05.** **Sin IA o sin conexión:** el campo se abre igualmente, y ARVID explica en el idioma activo que ahora no puede conversar y por qué (sin conexión, IA desactivada o límite diario).

### 3.7 IA con Mistral (IA, D-059, D-060)
- **IA-01.** **Arquitectura:**
  - La app llama a `POST /api/arvid`, una función de Netlify del mismo sitio, así que la CSP no cambia (`connect-src 'self'`).
  - La función añade la clave (`MISTRAL_API_KEY`, variable de entorno de Netlify) y llama a la API de chat de Mistral.
  - **La clave nunca está en el código ni en el repositorio.**
- **IA-02.** **Modelo y parámetros:** `ministral-8b-2512`, temperatura 0,7 y como máximo 350 tokens de respuesta. La función espera a Mistral como mucho **9 s**, porque el plan gratuito de Netlify corta las funciones a los 10 s (D-067); el cliente espera 15 s en el chat y 6 s por iniciativa propia.
- **IA-03.** **Personalidad** (instrucciones de sistema, en la función):
  - ARVID es un dron compañero, cercano y breve.
  - Basa sus consejos en el contexto y **no inventa datos**.
  - No da diagnósticos médicos ni psicológicos.
  - Anima sin culpabilizar.
  - Responde **en el idioma en que le escribe el usuario**; si habla por iniciativa propia, en el idioma de la app.
  - Como mucho, 6 frases si no le piden más.
- **IA-04.** **Contexto** (D-060), en JSON y calculado en el dispositivo:
  - Perfil: alias, género e idioma.
  - Fecha y hora local.
  - Nivel, título y XP.
  - Disciplina y atributos a 7 y 30 días, con tendencia.
  - Categorías activas.
  - Actividades activas: nombre, categoría, frecuencia, estado del periodo actual, racha y comodines, y cumplimiento de los últimos 30 días.
  - Misiones activas, vencidas y completadas en 30 días.
  - Momento que lo dispara.

  No incluye identificadores internos ni los registros con su hora exacta.
- **IA-05.** **Cuándo habla ARVID con IA:**
  - Por iniciativa propia en la **entrada a la app** (MV-01) y en los **momentos clave** (§3.8).
  - Cuando el usuario le escribe (CH).

  Si la IA no responde en 6 s por iniciativa propia (15 s en el chat), o falla, ARVID dice su frase fija del momento.
- **IA-06.** **Permiso:**
  - La IA solo se usa con **"ARVID con IA" activado**.
  - Se pregunta en el onboarding (y en la presentación PR), explicando qué se envía y a quién: "Para darte consejos, ARVID envía tu progreso y tus actividades a Mistral AI (Francia). Puedes desactivarlo cuando quieras".
  - Hasta que el usuario lo acepte, está desactivado.
- **IA-07.** **Límites:** cuerpo de la petición de 24 KB como máximo (validado con Zod en la función) y 350 tokens de respuesta. La clave es **de pruebas y tiene sus propios límites en Mistral**, sin cargos por abuso (indicación del responsable, 2026-10-18), así que no hay contadores en el servidor. Si Mistral responde 429 (cuota agotada), la función lo devuelve tal cual y ARVID lo explica con su frase fija (CH-05).
- **IA-08.** **Seguridad del texto:** la respuesta se trata como texto plano, sin HTML ni Markdown; se eliminan los símbolos de Markdown y se recorta a 1 200 caracteres.

### 3.8 Momentos en que ARVID habla por iniciativa propia (DL)
- **DL-01.** **Momentos, prioridades y reglas.** Cada momento sale como mucho **una vez al día**; si coinciden varios, solo el de mayor prioridad:

  | Prioridad | Momento | Cuándo |
  |---|---|---|
  | 1 | Subida de nivel | Con el aviso de nivel; ARVID aparece en el aviso, en lugar del personaje |
  | 2 | Día completo | Al registrar lo último pendiente del día |
  | 3 | Primera actividad | Al volver a Hoy tras crear la primera actividad |
  | 4 | Retomar | Primera apertura del día, si ayer quedaron actividades diarias sin completar |
  | 5 | Saludo | Primera apertura del día, al terminar la entrada de ARVID |

  Con la IA, la frase se genera con el contexto. Sin ella, se usa una de las frases fijas del momento (3 o más por momento e idioma, sin repetir la del día anterior).
- **DL-02.** El saludo fijo depende de la hora local: "Buenos días" hasta las 12:59, "Buenas tardes" hasta las 19:59 y "Buenas noches" después (en inglés, "Good morning / afternoon / evening").
- **DL-03.** Ajustes → Perfil incluye **"ARVID habla por iniciativa propia"** (activado por defecto). Desactivarlo quita los momentos 2 a 5. El aviso de nivel y el chat siguen igual.

### 3.9 Lenguaje según el género (LG, D-054)
- **LG-01.** Las frases fijas sobre el usuario tienen forma masculina, femenina y neutra (que reformula la frase sin "@", "x" ni "e"). ARVID habla de sí mismo en masculino. La IA recibe el género para concordar.

### 3.10 Onboarding (ON)
- **ON-01.** **Diseño de cada paso:** la escena arriba, con el personaje elegido hasta el momento, y debajo la caja de diálogo de ARVID y el control del paso.
- **ON-02.** **Pasos:** las frases son fijas y van en los JSON, traducidas.

  | Paso | Control |
  |---|---|
  | 1. Idioma | "Español" / "English" (preseleccionado según I18N-03) |
  | 2. Bienvenida | ARVID se presenta en 3 frases → "Empezar" |
  | 3. Alias | Campo de 1 a 20 caracteres |
  | 4. Género | Masculino / Femenino / Prefiero no decirlo |
  | 5. Personaje | Carrusel (CR) |
  | 6. Color de ARVID | 6 muestras con vista previa |
  | 7. ARVID con IA | Explicación de IA-06 → "Activar" / "Ahora no" |
  | 8. Áreas de vida | Categorías (ONB-02) |
  | 9. Instalar (solo iPhone sin instalar) | Guía (ONB-03) |
  | 10. Listo | "Todo listo, {alias}" → "Ir a Hoy" |
- **ON-03.** **Escritura y avance:** el texto aparece letra a letra; un toque completa la frase y otro pasa a la siguiente. Hay un botón "Saltar" y "Atrás" en cada paso salvo el primero.
- **ON-04.** **IA en el onboarding:** las frases del onboarding no usan IA. La primera intervención con IA es el saludo al llegar a Hoy.

### 3.11 Presentación para usuarios existentes (PR)
- **PR-01.** Si el onboarding ya se completó pero no hay alias, al abrir Hoy aparece una hoja en la que ARVID se presenta y pide idioma, alias, género, color de ARVID y permiso de IA. El personaje ya elegido se mantiene.
- **PR-02.** La hoja se puede posponer con "Más tarde" hasta el día siguiente.

### 3.12 Música (MU, enmienda a MUS-06)
- **MU-01.** El control de música pasa a una **bocina pixel arriba a la derecha** de la escena: con ondas si suena y tachada si está apagada. Es un botón con `aria-pressed` y nombre accesible ("Música").
- **MU-02.** El nivel superpuesto de Perfil sigue arriba a la izquierda, así que no coinciden.

## 4. Datos
Ajustes nuevos en `settings` (formato de backup v1, sin migración):

| Clave | Tipo | Por defecto | En el backup |
|---|---|---|---|
| locale | `'es' \| 'en'` | según el navegador (I18N-03) | Sí |
| profile | `{ alias: string, gender: 'm' \| 'f' \| 'x' }` | ausente (PR-01) | Sí |
| arvidColor | `'original' \| 'cian' \| 'magenta' \| 'lima' \| 'oro' \| 'violeta'` | `'cian'` | Sí |
| arvidAi | boolean | `false` hasta aceptar (IA-06) | Sí |
| arvidTalks | boolean | `true` (DL-03) | Sí |
| arvidSeen | momentos ya dichos hoy y la última frase de cada uno | `{}` | No (del dispositivo) |
| introSnoozedUntil | LocalDate? | — | No |

Los valores desconocidos se normalizan al cargar.

## 5. Privacidad y seguridad (enmienda a security-privacy.md §2)
- **Principio 2:** pasa a decir "Local por defecto: ningún dato sale del dispositivo salvo en un backup exportado o, **con permiso explícito**, el contexto que ARVID envía a Mistral AI (IA-04, IA-06)".
- **Principio 3:** "Sin peticiones a terceros desde la app". La única excepción es la función propia `/api/arvid`, que reenvía a Mistral.
- **Nuevas amenazas:**

  | Amenaza | Mitigación |
  |---|---|
  | Uso de la función por terceros | Agota como mucho la cuota de pruebas; ARVID vuelve a las frases fijas (IA-05) |
  | Fuga de la clave | Solo existe en Netlify como variable de entorno |
  | Inyección de instrucciones por nombres de actividades | El contexto va como datos JSON separados de las instrucciones; la respuesta se trata como texto plano (IA-08) |

- **La clave** es de pruebas y su exposición no genera cargos (indicación del responsable, 2026-10-18). Aun así, vive solo en Netlify, no en el repositorio, para poder cambiarla sin volver a publicar.

## 6. Requisitos no funcionales
- **NFR6-01.** Los diálogos nunca bloquean acciones: la burbuja no tapa los botones de registrar y el onboarding se puede saltar.
- **NFR6-02.** Las frases fijas tienen 120 caracteres como máximo (prueba sobre los JSON).
- **NFR6-03.** El saludo con IA aparece en menos de 6 s tras la entrada de ARVID; si no, frase fija (IA-05).
- **NFR6-04.** El texto de la burbuja ×2 se lee en un móvil de 360 px (unos 15 px de tamaño real).
- **NFR6-05.** El cambio de idioma se aplica sin recargar y no deja textos sin traducir (I18N-05).

## 7. Ejemplos (Given/When/Then)
**IA · Saludo con contexto**
- Given "ARVID con IA" activado, las 8:30 y "Gym" sin hacer esta semana con una racha de 4
- When el usuario abre la app
- Then ARVID llega volando, vuelve a su sitio y saluda mencionando la racha de Gym, en 2 o más páginas de 2 líneas que avanzan cada 5 s o al tocar

**CH · Conversación**
- When el usuario pulsa el chat, escribe "what should I do today?" y pulsa "Enviar"
- Then ARVID vuelve a su sitio, piensa ("…") y responde en inglés aunque la app esté en español

**CH-05 · Sin conexión**
- Given sin conexión
- When el usuario escribe a ARVID
- Then ARVID responde con su frase fija "Ahora no tengo conexión; cuando vuelva, hablamos"

**MV-01 · Entrada**
- Given 30 aperturas de la app
- Then ARVID llega por las tres vías (fondo, izquierda y arriba)

**I18N · Idioma**
- Given idioma English
- Then Hoy muestra "Sunday, Oct 18", la navegación "Today · Activities · Profile" y la categoría "Body"
- And la actividad "Caminar" se queda como está

**IA-07 · Cuota agotada**
- Given Mistral responde 429
- When el usuario escribe a ARVID
- Then ARVID dice (sin IA) que por ahora no puede conversar y que lo intente más tarde

## 8. Dependencias y riesgos
- **Dependencias:**
  - Netlify Functions, del plan gratuito (sin dependencias nuevas).
  - La cuenta y la clave de Mistral del responsable.
  - El despliegue pasa a incluir funciones (`netlify deploy --prod --dir dist --functions netlify/functions`).
  - Assets de Warped City ya verificados (cajas de control y señal del suelo).
- **Riesgos:**
  - **R6-1 · ARVID cansa.** *Mitigación:* una vez al día por momento, prioridades y DL-03.
  - **R6-2 · Cuota de la IA agotada.** *Mitigación:* respaldo con frases fijas (IA-05) y límite de tokens.
  - **R6-3 · Calidad o tono de las respuestas.** *Mitigación:* instrucciones de sistema (IA-03), revisión manual (M6) y respaldo con frases fijas.
  - **R6-4 · Privacidad.** *Mitigación:* permiso explícito, explicación clara y desactivación en Ajustes.
  - **R6-5 · Esfuerzo de los idiomas:** hay que pasar todos los textos a JSON. *Mitigación:* hacerlo primero, con la prueba de claves (I18N-05) y los E2E en español.
  - **R6-6 · Onboarding largo** (10 pasos). *Mitigación:* "Saltar" y pasos breves.

## 9. Plan de entrega
Para poder probar antes, la spec se entrega en dos versiones:
- **0.6.0:** Perfil, idiomas, onboarding nuevo, presentación, carrusel, colores, entrada y paseos de ARVID, burbuja ×2, chat (que sin IA responde con frases fijas) y bocina.
- **0.6.1:** función de Netlify, IA y permiso.

## 10. Decisiones de esta spec (aprobadas, D-066)
| ID | Propuesta |
|---|---|
| S6-01 | Ruta `/perfil` y Ajustes → Perfil (PF) |
| S6-02 | Descripciones de los estilos y orden por género (PJ) |
| S6-03 | Onboarding de 10 pasos, con idioma primero, y "Saltar" (ON) |
| S6-04 | Presentación que se puede posponer para usuarios existentes (PR) |
| S6-05 | ARVID Cian por defecto; entrada, paseos y detalles de la acera con los tiempos de MV |
| S6-06 | Burbuja ×2 de 2 en 2 líneas, avance a los 5 s o al tocar (BP) |
| S6-07 | Chat: 280 caracteres, 10 turnos por sesión, sin historial guardado (CH) |
| S6-08 | `ministral-8b-2512`, 350 tokens, tiempos de espera de 6 y 15 s (IA-02, IA-05) |
| S6-09 | Contexto de IA-04 (sin identificadores internos ni horas exactas) |
| S6-10 | Permiso explícito para la IA, desactivada hasta aceptar (IA-06) |
| S6-11 | Sin contadores en el servidor: solo límites de tamaño y la cuota propia de la clave de pruebas (IA-07) |
| S6-12 | Momentos y prioridades (DL-01) y el ajuste "ARVID habla por iniciativa propia" (DL-03) |
| S6-13 | Idiomas: JSON, plurales con `Intl`, idioma del navegador por defecto, categorías predefinidas traducidas (I18N) |
| S6-14 | Bocina arriba a la derecha (MU) |
| S6-15 | Entrega en 0.6.0 y 0.6.1 (§9) |
| S6-16 | Este incremento es el 6; Logros y pulido pasa al 7 |
