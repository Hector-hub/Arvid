# ARVID — Registro de decisiones

Fuente de verdad de las decisiones de producto y técnicas. Cada spec debe referenciar los IDs que implementa.

**Tipos:** A = decidida por el responsable del producto · B = recomendación pendiente de aprobación · C = decisión técnica reversible · D = bloqueante, requiere respuesta · E = hipótesis pendiente de validar.

Última actualización: 2026-10-18.

## Decisiones

| ID | Decisión | Tipo | Fecha |
|---|---|---|---|
| D-001 | Usuario principal del MVP: el propio responsable del producto, con uso diario personal. Apertura a otros usuarios más adelante | A | 2026-10-17 |
| D-002 | Problema prioritario: abandono de rutinas. ARVID debe favorecer la constancia y facilitar retomar tras fallar | A | 2026-10-17 |
| D-003 | Plataformas a soportar: iPhone, Android y escritorio | A | 2026-10-17 |
| D-004 | Sin sincronización multi-dispositivo | A | 2026-10-17 |
| D-005 | Usuarios reales del MVP: responsable (iPhone) y su hermano (Android), cada uno con sus datos de forma independiente | A | 2026-10-17 |
| D-006 | Núcleo: actividades recurrentes definidas por el usuario, con frecuencia diaria, semanal o mensual y N veces por periodo | A | 2026-10-17 |
| D-007 | Cada actividad pertenece a una categoría (aspecto de vida) y tiene un valor en puntos que alimenta el perfil | A | 2026-10-17 |
| D-008 | ~~Incumplir resta el mismo valor (±)~~ → **sustituida por D-011** | — | 2026-10-17 |
| D-009 | Rachas con comodines | A | 2026-10-17 |
| D-010 | Sin límite de actividades activas | A | 2026-10-17 |
| D-011 | Dos sistemas separados: Nivel/XP que solo sube (historial) y atributos 0–100 calculados sobre una ventana reciente (ganado / posible), que suben y bajan | A | 2026-10-17 |
| D-012 | Cumplimiento parcial proporcional (3 de 4 → 75 % del valor) | A | 2026-10-17 |
| D-013 | Valor por dificultad: Fácil / Media / Difícil (provisional 5 / 10 / 20) | A | 2026-10-17 |
| D-014 | Los comodines se ganan: 1 por cada 7 periodos cumplidos seguidos, máximo 2 guardados (números provisionales) | A | 2026-10-17 |
| D-015 | Progreso representado por un personaje pixel art con "hoja de personaje" (nivel + radar). Sin refugio ni mundo en el MVP | A | 2026-10-17 |
| D-016 | Subir de nivel otorga títulos; existen logros e insignias por hitos. Sin cosméticos desbloqueables en el MVP | A | 2026-10-17 |
| D-017 | ~6 categorías predefinidas activables + categorías propias; radar con 3–8 ejes | A | 2026-10-17 |
| D-018 | El MVP incluye misiones únicas (tareas no recurrentes con categoría, dificultad y fecha límite opcional) | A | 2026-10-17 |
| D-019 | Recordatorios deseados: resumen diario a hora fija + estado dentro de la app. Sin recordatorios por actividad | A | 2026-10-17 |
| D-020 | Una misión vencida penaliza su valor una sola vez; si se reprograma y se completa, recupera lo perdido sin ganancia neta | A | 2026-10-17 |
| D-020b | Concreción de D-020: misión a tiempo → XP + suma a su categoría. Vencida → penaliza el atributo **Disciplina** (no la categoría). Completada tarde → anula el fallo en Disciplina (y da XP, D-032). Sin fecha límite → nunca penaliza | A | 2026-10-17 |
| D-021 | Registro retroactivo permitido para el periodo en curso y el día anterior | A | 2026-10-17 |
| D-022 | Sin tipo "hábito a reducir"; se expresan como actividad positiva ("día sin X") | A | 2026-10-17 |
| D-023 | MVP = PWA 100 % offline sin servidor. Recordatorio = estado dentro de la app. Resumen diario push → P1, con un micro-servidor que solo guarda la hora y la suscripción | A | 2026-10-17 |
| D-024 | Exportar e importar el backup en archivo es P0, con aviso en la app si han pasado más de 7 días desde el último (antes B-001, aprobada con el plan de MVP) | A | 2026-10-17 |
| D-025 | Disciplina = % de cumplimiento global del periodo (actividades + misiones con fecha límite); se muestra como medidor aparte, no como eje del radar | A | 2026-10-17 |
| D-026 | Radar: periodo por defecto de 30 días, selector 7/90 y superposición del periodo anterior para ver la tendencia | A | 2026-10-17 |
| D-027 | Estilo pixel art moderno: sprites, iconos y marcos en pixel art; el texto en una fuente legible; layout fluido | A | 2026-10-17 |
| D-028 | Assets desde packs CC0 o de licencia libre, verificando la licencia de cada pack | A | 2026-10-17 |
| D-029 | Personaje fijo: no cambia de aspecto; el progreso se ve en la hoja de personaje. **Enmendada por D-050 (S5-03):** el usuario elige entre 4 protagonistas × 6 variantes de color; el personaje sigue sin evolucionar | A | 2026-10-17 |
| D-030 | El badge en el icono pasa a P1 junto al push (en iOS requiere permiso de notificaciones). Ajusta D-023 (antes B-002, aprobada con el plan de MVP) | A | 2026-10-17 |
| D-031 | Alcance del MVP aprobado según `docs/product/mvp-scope.md` | A | 2026-10-17 |
| D-032 | Completar tarde una misión vencida **sí da XP** (+v); en Disciplina solo anula el fallo (antes P-003) | A | 2026-10-17 |
| D-033 | Abandonar una misión con fecha límite **antes** de vencer penaliza **la mitad** en Disciplina (E = 0, P = v/2); abandonar es definitivo (antes P-004) | A | 2026-10-17 |
| D-034 | La racha exige completar el periodo al 100 %; un periodo parcial no la mantiene (antes P-005) | A | 2026-10-17 |
| D-035 | `docs/design/game-design.md` aprobado, incluidos los títulos y logros propuestos (antes P-006) y los umbrales de "sin datos" = 3 y tendencia = ±5, revisables tras 4 semanas de uso (P-008) | A | 2026-10-17 |
| D-036 | Assets: Kenney 1-Bit Pack (CC0) recoloreado con la paleta; paneles y botones dibujados con CSS (antes P-007). **Enmendada por D-050 (S5-04):** el personaje y la escena salen de Warped City y Streets of Fight (Ansimuz) y de los packs verificados; los iconos siguen siendo del 1-Bit Pack | A | 2026-10-17 |
| D-037 | Paleta Sweetie 16 (antes P-007) | A | 2026-10-17 |
| D-038 | Tipografía: Pixelify Sans en títulos, cifras y botones; Atkinson Hyperlegible Next en el resto; ambas autoalojadas | A | 2026-10-17 |
| D-039 | Solo tema oscuro en el MVP; tema claro en P1 | A | 2026-10-17 |
| D-040 | Aprobados `design-system.md`, `asset-licenses.md`, `architecture.md` (incluido el stack: Vite + React + TS + pnpm, Dexie, vite-plugin-pwa, Zod, React Router, Fontsource, Vitest, Testing Library, fake-indexeddb, Playwright; antes B-003), `data-model.md`, `offline-strategy.md` y `security-privacy.md`, incluida la navegación de 3 pestañas (Hoy · Actividades · Personaje; Ajustes desde Personaje; antes B-004) | A | 2026-10-17 |
| D-041 | Hosting estático en Netlify, plan gratuito (antes P-010) | A | 2026-10-17 |
| D-042 | Spec 01 (Actividades + Hoy + PWA offline) aprobada con S1-01 a S1-04; categorías predefinidas: Cuerpo, Descanso, Mente, Aprendizaje, Relaciones y Orden (antes P-009). Permiso para instalar dependencias y descargar el 1-Bit Pack | A | 2026-10-17 |
| C-004 | TypeScript 6.0.3 en lugar de 7: `typescript-eslint` 8.71 solo admite `<6.1`. Reversible cuando lo soporte | C | 2026-10-17 |
| C-005 | Sprites elegidos del 1-Bit Pack (`scripts/sprites.txt`); personaje = tile (28, 4). Atlas ampliado ×12 para mostrarse nítido a 32/48/64 px | C | 2026-10-17 |
| C-006 | Tras registrar, el botón ignora toques durante 400 ms para evitar duplicados por doble toque (LOG-06) | C | 2026-10-17 |
| C-007 | Enlaces de vuelta explícitos en pantallas secundarias: la PWA instalada en iPhone no tiene botón Atrás (UI-05) | C | 2026-10-17 |
| D-043 | Sitio de Netlify `arvid-app` (https://arvid-app.netlify.app) en el equipo Hecrey (`hector-hub`), con despliegue manual desde la CLI (`netlify deploy --prod`) | A | 2026-10-17 |
| D-044 | Enmiendas a game-design.md: R-A9 (un periodo truncado por un cambio de tipo no se evalúa pero da XP; antes GD-A1) y R-S5 (un periodo abierto ya cumplido cuenta también para ganar comodines; antes GD-A2) | A | 2026-10-17 |
| D-045 | Spec 02 (Backup y progreso básico) aprobada con S2-01 a S2-05 | A | 2026-10-17 |
| D-046 | Aclaraciones de misiones R-M8 a R-M11 en game-design §8 (quitar la fecha, desmarcar tras vencer, no completar antes de la creación, vencimiento con la fecha vigente; antes GD-A3 a GD-A6) | A | 2026-10-17 |
| D-047 | Spec 03 (Misiones) aprobada con S3-01 a S3-05 | A | 2026-10-17 |
| D-048 | Aclaraciones de atributos y radar R-AT6 a R-AT9 en game-design §5 (sin radar con menos de 3 categorías, ejes sin datos sin vértice, categoría por versión, desactivadas cuentan en Disciplina; antes GD-A7 a GD-A10) | A | 2026-10-17 |
| D-049 | Spec 04 (Hoja de personaje) aprobada con S4-01 a S4-04 | A | 2026-10-17 |
| D-051 | Licencias de la escena verificadas (spec 05 §9): Warped City (dominio público) y Streets of Fight (CC0); peatones y dron de CraftPix (licencia gratuita: se publican combinados en un atlas propio porque no se pueden publicar sus archivos originales); Él, Él 2 y las pistas Midnight Sector Drive y Glass Tower Horizon son propios (generados por el responsable con sprite-ai.art y Gemini). Las 5 pistas de CombinaDos quedan fuera hasta verificarlas (antes P-011) | A | 2026-10-18 |
| D-052 | La pestaña y la pantalla "Personaje" pasan a llamarse **Perfil**: el protagonista representa al usuario. El onboarding pide alias, género y personaje con un estilo profesional (sin etiquetas tipo "Él 2"). El dron es **ARVID**, la mascota que acompaña al usuario | A | 2026-10-18 |
| D-053 | ARVID: **un solo modelo** (el dron actual) en **varios colores** que el usuario elige; además cambia de animación según el momento (flotar, escanear al hablar, celebrar) | A | 2026-10-18 |
| D-054 | Género (Masculino, Femenino, Prefiero no decirlo): adapta el lenguaje de ARVID (neutro si no se indica) y ordena primero los personajes afines; todos siguen disponibles | A | 2026-10-18 |
| D-055 | Elección de personaje en un **carrusel** de tarjetas con la animación y un nombre de estilo; los colores, como muestras debajo | A | 2026-10-18 |
| D-056 | ARVID habla con diálogos en el onboarding y en momentos clave (saludo del día, primera actividad, día completo, subida de nivel, retomar tras fallar), con reglas fijas y offline. La burbuja aparece en la escena de Hoy y Perfil | A | 2026-10-18 |
| D-057 | Diálogos de ARVID **mixtos**: caja de diálogo con retrato en el onboarding y burbuja flotante anclada a ARVID en Hoy y Perfil; texto nítido y accesible (no dibujado en el lienzo) | A | 2026-10-18 |
| D-058 | Nombres de estilo de los personajes: **Runner** (chaqueta amarilla), **Brawler** (coleta roja), **Ghost** (encapuchado) y **Drifter** (camisa blanca) | A | 2026-10-18 |
| D-059 | ARVID habla con **IA (Mistral)** en la entrada a la app y en momentos clave, y el usuario puede abrir una conversación en cualquier momento. La clave vive en una **función de Netlify** (variable de entorno), nunca en la app. Ajusta D-023 (sin servidor) y la exclusión "generación con IA" del MVP | A | 2026-10-18 |
| D-060 | Contexto para la IA: **todo el contexto** del usuario (perfil, progreso, actividades, historial reciente y misiones) | A | 2026-10-18 |
| D-061 | Burbuja **pixel ×2** dibujada en la escena para ARVID en Hoy y Perfil; el onboarding mantiene la caja de diálogo (enmienda a D-057). Las respuestas se muestran de 2 en 2 líneas: pasan a las siguientes a los 5 s o al tocar | A | 2026-10-18 |
| D-062 | Al entrar a la app, ARVID llega volando desde el fondo, la izquierda o arriba (al azar) y después habla. Se mueve de forma pausada y aleatoria por la escena, se acerca a detalles de la acera para escanearlos y vuelve a su sitio; siempre habla desde su posición | A | 2026-10-18 |
| D-063 | App en **español e inglés**: todos los textos en archivos JSON; el idioma se elige en el onboarding. ARVID responde en el idioma en que le escriba el usuario | A | 2026-10-18 |
| D-064 | En la escena: botón de **chat** abajo a la derecha (se despliega un campo hacia la izquierda y el botón pasa a "Enviar") y **bocina** (tachada o no) arriba a la derecha para la música | A | 2026-10-18 |
| D-065 | La clave de Mistral es **de pruebas**, con límites propios y sin cargos por abuso: puede exponerse. Se mantiene en la función de Netlify (cambiarla sin volver a publicar, CSP intacta) y no hay contadores de uso en el servidor | A | 2026-10-18 |
| D-066 | Spec 06 (Perfil, ARVID con IA, idiomas y onboarding) aprobada con S6-01 a S6-16. Enmienda D-023 (función propia `/api/arvid` como única pieza de servidor), D-029 (el protagonista es el usuario), D-057 (burbuja pixel ×2 en Hoy y Perfil) y security-privacy §2 (contexto a Mistral con permiso). Entrega en 0.6.0 (sin IA) y 0.6.1 (IA); Logros y pulido pasa al incremento 7 | A | 2026-10-18 |
| D-067 | La función `/api/arvid` espera a Mistral como mucho 9 s: el plan gratuito de Netlify corta las funciones a los 10 s (ajusta el 15 s de IA-02; el chat del cliente sigue esperando hasta 15 s) | C | 2026-10-18 |
| D-068 | Modelo de ARVID con IA: `ministral-8b-2512`, uno de los permitidos para la clave de pruebas (con `mistral-small-latest` Mistral respondía 429 `rate_limited`) | C | 2026-10-18 |
| D-069 | Se quita de la acera el letrero morado «4F» (`prop-banner-floor.png`); quedan las dos cajas de control para MV-03 | A | 2026-10-18 |
| D-070 | Al escanear (un detalle o en su sitio, no al hablar), ARVID proyecta hacia la acera un cono de luz blanca translúcida, como un rayo de abducción, con bordes en escalera pixel; late y lo recorren franjas, y queda fijo con movimiento reducido | A | 2026-10-18 |
| D-071 | Al empezar cada pista, su nombre aparece arriba a la izquierda de la escena y se desvanece a los 5 s (spec 05, MUS-08) | A | 2026-10-18 |
| D-072 | En Hoy, la escena, la fecha y el nivel quedan fijos arriba al hacer scroll (spec 05, UB-05) | A | 2026-10-18 |
| D-073 | Se añade la pista Black Chrome Horizon (propia, generada con Gemini como las otras dos) | A | 2026-10-18 |
| D-074 | Las farolas y su haz se dibujan al frente, por delante de peatones, detalles de la acera, ARVID y protagonista; solo la barandilla queda delante (spec 05, ESC-03) | A | 2026-10-18 |
| D-075 | Drones del cielo: los otros modelos del Free Drones Pack cruzan a lo lejos a 3 distancias, por detrás y por delante de los edificios (spec 05, ESC-13) | A | 2026-10-18 |
| D-076 | Spec 07 · Logros: sección en Perfil (cuadrícula de insignias bajo el radar); al tocar una se ven nombre, condición y fecha | A | 2026-10-18 |
| D-077 | Spec 07 · Al desbloquear un logro: ráfaga de partículas, ARVID lo anuncia en su burbuja (con IA, frase personalizada) y un aviso pequeño con la insignia que se cierra solo; sin bloquear la pantalla | A | 2026-10-18 |
| D-078 | Spec 07 · Los logros pendientes se ven en gris con nombre y condición, con barra de progreso cuando es medible | A | 2026-10-18 |
| D-079 | Spec 07 · Logros ya cumplidos al llegar la versión o al importar un backup: se ganan en silencio (con la fecha de esa evaluación), sin celebrar cada uno (los historiales previos son de prueba) | C | 2026-10-18 |
| D-080 | Spec 07 · Set: los 11 logros de game-design §9 con sus nombres (pasan a definitivos, con traducción al inglés). Insignias generadas con IA por el responsable a partir de un prompt común | A | 2026-10-18 |
| D-081 | Spec 07 · Pulido: botones pixel más modernos hechos con CSS, revisión de accesibilidad automática (axe en E2E) y de rendimiento (Lighthouse); la checklist en teléfonos queda aparte | A | 2026-10-18 |
| D-082 | Spec 07 · Estilo de botón "Bisel pixel" (variante A de `prototypes/botones/`): relleno de color, esquinas en escalera de 2 px, luz arriba, sombra abajo y hundimiento al pulsar | A | 2026-10-18 |
| D-083 | Spec 07 (Logros y pulido) aprobada con S7-01 a S7-10. Precisa D-079 (fecha de la evaluación) y game-design §9 (L-02 solo diarias; L-08 exige un registro previo; nombres definitivos) | A | 2026-10-18 |
| D-084 | Hoy: al abrir la app, la escena empieza en negro con la fecha escrita letra a letra en el centro; se desvanece, se abren bandas negras hacia arriba y abajo y la fecha queda en la esquina superior izquierda de la escena (deja de ir debajo). Dentro del recuadro de la escena, una vez por apertura y sin movimiento reducido (spec 05, UB-06, ESC-08) | A | 2026-10-19 |
| D-085 | El nombre de la pista que empieza aparece abajo a la izquierda de la escena (antes, arriba; spec 05, MUS-08) | A | 2026-10-19 |
| D-086 | Actividades y Misiones: el botón de crear es solo "+" (nombre accesible "Nueva actividad" / "Nueva misión") y las flechas de orden usan ese mismo estilo principal; los nombres sin espacios se parten en vez de salirse (bug reportado en Android, 2026-10-19) | A | 2026-10-19 |
| D-087 | Drifter (Él 2) pasa a una hoja nueva generada con IA (8 fotogramas de 64×64, ciclo de caminar con pierna lejana más oscura), con recoloreado por color y zona (pelo, camisa, piel, vaqueros, zapatos). La hoja anterior se conserva en `archive/protagonists/`. La evolución por etapas sigue pendiente | A | 2026-10-19 |
| D-088 | Se añaden las pistas Chrome Horizon Drive y Rain on the Expressway (propias, generadas con Gemini como las demás) | A | 2026-10-19 |
| D-089 | La preferencia de música se respeta al volver a abrir la app: la bocina muestra la preferencia guardada y la música arranca con el primer toque válido para el navegador (al levantar el dedo en iPhone) (spec 05, MUS-09) | A | 2026-10-20 |
| D-090 | Spec 08 · DARIS es una compañera alternativa a ARVID: se elige en el onboarding y en Ajustes → Perfil; ARVID sigue por defecto | A | 2026-10-20 |
| D-091 | Spec 08 · DARIS es un personaje distinto, con nombre propio en diálogos, chat e IA (no solo otro aspecto de ARVID) | A | 2026-10-20 |
| D-092 | Spec 08 · DARIS va en tierra junto al protagonista: entrada con acelerón, cara contenta al hablar y salto de corazones al celebrar; no pasea ni escanea | A | 2026-10-20 |
| D-093 | Spec 08 · DARIS tiene 6 colores: rosa (por defecto), cian, lima, ámbar, rojo y negro, y violeta | A | 2026-10-20 |
| D-094 | Spec 08 (DARIS, compañera alternativa a ARVID) aprobada con S8-01 a S8-06: DARIS en femenino en español, frases fijas compartidas con `{companion}` y tono propio en la IA; entrega en 0.8.0 | A | 2026-10-20 |
| D-095 | Icono oficial de la app: ARVID con su cono de escaneo sobre la ciudad (generado con IA por el responsable); en Android, versión con margen para que el recorte circular no corte el anillo | A | 2026-10-21 |
| D-096 | Ghost (Él) pasa a ser el ninja extraído de un vídeo generado con IA: ciclo completo de 35 fotogramas (un paso con cada pierna), sin arma, con recoloreado por material (armadura, luces y piezas blancas) en las 6 variantes. La hoja anterior se conserva en `archive/protagonists/` | A | 2026-10-21 |
| D-097 | Consejo diario de IA sobre la Disciplina: con «IA» activada y conexión, al abrir la app por primera vez en el día se pide a Mistral (momento `discipline`) un análisis breve y una sugerencia, que se guarda en el dispositivo (no va en el backup) y se muestra todo el día en Perfil → Disciplina como «Consejo de {compañero}». Se renueva al día siguiente o si cambian el idioma o el compañero. La cifra y la explicación fija no cambian | A | 2026-10-22 |
| D-098 | Chat en la escena con dos botones: flecha (envía y cierra) y expandir, que abre la página «Conversación con {compañero}» (`/chat`) con lo escrito. La conversación se guarda en el dispositivo (ajuste `chatLog`, últimas 200 líneas, no va en el backup), incluye también lo que el compañero dice por iniciativa propia, se agrupa por días y se puede borrar. Modifica CH-04 de la spec 06 | A | 2026-10-22 |
| D-099 | Juegos dentro de ARVID (spec 09): botón «Jugar» con un mando pixel encima del chat de la escena que abre `/juego`, donde se muestra CombinaDos (Unity WebGL) desde su propio sitio en un marco, con pantalla completa propia (no la del navegador). Necesita conexión (sin ella, un aviso). La música de ARVID calla mientras se juega. Se activa o desactiva en Ajustes → Perfil («Juegos», activado por defecto). Sin comunicación entre juego y app por ahora | A | 2026-10-23 |
| D-100 | Protección de la IA contra abuso (la app no tiene login): **un código por persona** con el patrón `ARVID-NOMBRE-FIRMA`, donde la firma (10 caracteres) es un HMAC del nombre con el secreto `ARVID_CODE_SECRET` (en Netlify, lo crea el responsable; los códigos se generan con `scripts/new-ai-code.mts` y no se guardan en ningún sitio). Cada código tiene **25 mensajes con IA al día** (UTC; cuentan todas las peticiones a la IA, también lo que el compañero dice por iniciativa propia), contados en Netlify Blobs con una sola entrada por código (`{ day, used }`, se sobrescribe al cambiar de día: no se acumulan registros); agotados, el compañero lo explica y usa sus frases fijas. El código se escribe en Ajustes → Perfil, se guarda en el dispositivo y no va en el backup. Sin el secreto configurado no se exige código. Además, límite de Netlify de 20 peticiones por minuto por IP y tope de gasto recomendado en la consola de Mistral | A | 2026-10-23 |
| D-101 | Lanzamiento de la **1.0.0** (2026-10-24): MVP completo más los incrementos posteriores (DARIS, chat con conversación guardada, consejo diario, juegos, códigos de acceso a la IA). El código de acceso se puede escribir también en el paso de la IA del onboarding y de la presentación. Checklist en teléfonos cerrada por el responsable: copia de seguridad entre dispositivos, M7 de la spec 07 y pruebas en Android | A | 2026-10-24 |
| D-102 | Notificaciones con Web Push directo (claves VAPID, enviado desde Netlify), sin Firebase: gratis, sin SDK extra y un solo service worker | A | 2026-10-25 |
| D-103 | Dos resúmenes diarios: mañana (7:00, plan del día y misiones que vencen hoy) y noche (22:00, lo que falta y rachas en peligro); horas configurables | A | 2026-10-25 |
| D-104 | El servidor solo conoce horas e identificadores opacos; el texto de cada aviso lo escribe el service worker con los datos locales | A | 2026-10-25 |
| D-105 | Recordatorios por actividad opcionales, tantos como veces del periodo: horas (diaria), día de la semana + hora (semanal), día del mes + hora (mensual); se saltan si la actividad ya está cumplida en su periodo | A | 2026-10-25 |
| D-106 | Notificaciones apagadas por defecto; se activan en Ajustes → Notificaciones y en un paso nuevo del onboarding | A | 2026-10-25 |
| D-107 | Si a la hora del aviso ya no queda nada, se muestra un mensaje breve de ánimo (Safari obliga a mostrar algo en cada push) | A | 2026-10-25 |
| D-108 | Envío de notificaciones con dos funciones programadas: cada minuto de 7:00 a 21:59 y cada hora en punto de 22:00 a 6:00, en la hora de Santo Domingo (UTC−4). Los avisos de día llegan como mucho 1 minuto tarde; los recordatorios nocturnos, hasta 59 minutos. Unas 28.000 ejecuciones al mes, dentro del plan gratuito | A | 2026-10-25 |
| D-109 | Ciudad viva (spec 11): la escena se completa en el nivel 10 (~3 meses), con llegadas repartidas desde el nivel 2 | A | 2026-10-25 |
| D-110 | Un usuario nuevo empieza con lo imprescindible: ciudad de fondo, carretera, acera, barandilla, protagonista y compañero; las farolas también se ganan | A | 2026-10-25 |
| D-111 | Los peatones se desbloquean uno a uno, cada uno como vecino con nombre y carácter | A | 2026-10-25 |
| D-112 | Las llegadas las anuncia el compañero y se consultan en la pantalla «Tu ciudad» (desbloqueados y siluetas con su nivel) | A | 2026-10-25 |
| D-113 | Vecinos que hablan: 10 % al verlos, como mucho uno al día; con IA usan el mismo contexto que el compañero y no gastan créditos; sin IA, frases fijas | A | 2026-10-25 |
| D-114 | La burbuja del vecino le sigue mientras camina, sin detenerse | A | 2026-10-25 |
| D-115 | El fondo también se gana: en el nivel 1 solo la capa 1 (cielo y horizonte lejano); la capa 2 (rascacielos) llega en el nivel 3 y la 3 (edificios cercanos) en el nivel 7. La ciudad pasa a tener 17 elementos | A | 2026-10-25 |
| D-116 | Pantalla de carga al abrir la app: el icono aparece con un fundido, «ARVID» se escribe letra a letra debajo y la app entra con un fundido. Con movimiento reducido, sin animaciones y más breve | A | 2026-10-25 |
| D-117 | Descansos planificados por rango de fechas, para todas las actividades (por defecto) o solo las elegidas | A | 2026-10-26 |
| D-118 | Un descanso solo se puede poner desde hoy en adelante. Un periodo que contiene un día de descanso se evalúa solo si se cumple al 100 % (como la gracia, R-A6), en diarias, semanales y mensuales. Las misiones admiten una hora opcional con aviso | A | 2026-10-26 |
| D-119 | Objetivos con hitos en una pestaña propia (Hoy · Actividades · Objetivos · Perfil); los hitos van en secuencia y cada hito activo es una misión normal | A | 2026-10-26 |
| D-120 | Crear con el compañero: propone y el usuario confirma (Crear / Editar / Cancelar); puede proponer misiones, objetivos con hitos, días de descanso y actividades recurrentes | A | 2026-10-26 |
| D-121 | Se levanta en parte la exclusión «generación de misiones con IA»: la IA solo estructura lo que el usuario pide expresamente (salida JSON validada, function calling) y nunca crea nada sin confirmación | A | 2026-10-26 |
| D-122 | Completar un objetivo da celebración y queda en el historial, sin XP extra | A | 2026-10-26 |
| D-123 | Entrega por fases: 1.3.0 descansos, 1.4.0 objetivos con hitos y hora en misiones, 1.5.0 crear con el compañero | A | 2026-10-26 |
| D-124 | Un error de generación no cuesta crédito: se descuenta antes de llamar a Mistral y se devuelve si la llamada falla (tiempo agotado, error o respuesta vacía). En la 1.5.0, el reintento interno por JSON inválido no cuesta extra; una propuesta válida que el usuario cancela sí cuenta | A | 2026-10-26 |
| D-125 | Río con reflejos de neón entre el horizonte lejano y la carretera (versión compacta del pack propio, 360×15 en la escena, 24 fotogramas a 12 fps, parallax del horizonte). Hasta el nivel 5. Los rascacielos (capa 2) se retrasan del nivel 3 al 6: al llegar, el río se desvanece mientras aparecen (fundido cruzado), como si se cruzara a la ciudad | A | 2026-10-26 |
| D-126 | Burbujas pixel en el chat (página de conversación), solo con CSS e inspiradas en una referencia pixel: contorno de 3 px en lavanda con esquinas en escalón, sombra debajo y cola en escalera (clip-path); el compañero a la izquierda en blanco y el usuario a la derecha en lavanda | A | 2026-10-26 |
| D-127 | La conversación se comporta como el chat de una red social: pantalla completa (sin la barra de navegación), cabecera fija con volver, el compañero y la papelera; mensajes con su propio scroll; campo de texto (crece hasta 5 líneas, Intro envía) siempre visible abajo, también con el teclado abierto; borrar con un diálogo flotante | A | 2026-10-26 |
| D-128 | Las fechas y horas opcionales (fecha límite y hora de una misión, fecha meta de un objetivo y fecha de cada hito) tienen un botón «Quitar fecha» / «Quitar hora»: en iPhone el selector no permite vaciarlas | A | 2026-10-26 |
| D-129 | Memoria del compañero (spec 13): notas sobre el usuario creadas a petición suya («recuerda que…») y por iniciativa del compañero; siempre avisadas en el chat y sin datos sensibles | A | 2026-10-26 |
| D-130 | El chat tiene un menú de tres puntos: «Lo que {compañero} sabe de ti» (lista con borrar una a una), «Borrar conversación» y «Borrar memoria completa», con confirmaciones flotantes | A | 2026-10-26 |
| D-131 | Como mucho 30 notas de 120 caracteres; el compañero fusiona o sustituye al llegar al límite | A | 2026-10-26 |
| D-132 | El historial que se envía a la IA son los últimos 10 mensajes de la conversación guardada (continuidad entre sesiones) | A | 2026-10-26 |
| D-133 | La memoria va en el backup y la comparten ARVID y DARIS | A | 2026-10-26 |
| D-134 | Las notas se inyectan como mensaje de sistema antes del contexto en todo lo que el compañero dice con IA (no en los vecinos) | A | 2026-10-26 |
| D-135 | Mensajes de prueba sin código: 5 en total por dispositivo (identificador aleatorio de la app) y como mucho 15 en total por IP (guardada como resumen cifrado, nunca en claro), contados en Netlify Blobs. Solo el chat; los momentos por iniciativa propia y los vecinos siguen necesitando código. Un fallo de la IA devuelve el crédito. Modifica D-100 | A | 2026-10-26 |
| D-136 | El nombre del proveedor de IA (Mistral AI) solo aparece en Créditos; en el resto de la app se habla de «un servicio de IA externo (en Europa)», manteniendo el aviso de privacidad | A | 2026-10-26 |
| D-137 | La burbuja de la escena adopta el estilo pixel del chat: fondo claro, contorno lavanda en escalón, sombra y cola en escalera; la de los vecinos, con contorno dorado | A | 2026-10-26 |
| D-138 | Los insights del P1 se dan por hechos con lo que ya existe (atributos por área, Disciplina, consejo diario con IA y detalle por actividad). Del P1 quedan los retos temporales, los efectos de sonido y, opcionalmente, un resumen semanal | A | 2026-10-27 |
| D-139 | Versionado: los incrementos pequeños siguen en 1.x (sonido 1.7.0, resumen semanal 1.8.0); la **2.0.0** sale cuando estén completos y probados juntos la cuenta ligera, la copia en la nube y los retos con amigos. Las fases intermedias no se publican a medias | A | 2026-10-27 |
| D-140 | Principio de la 2.0: **offline-first y cuenta opcional**. El dispositivo es la fuente principal y la nube es copia y punto de encuentro; sin conexión funciona todo lo de hoy (también marcar tu progreso en un reto) y solo necesitan red crear o recuperar la cuenta, invitar o aceptar retos, ver el progreso de otros y subir la copia. Sin cuenta, ARVID funciona como ahora | A | 2026-10-27 |
| D-141 | Cuenta 2.0 sin email ni contraseña: acceso con **passkey** (Face ID o huella, sincronizada por iCloud o Google) y **clave de recuperación** de respaldo (para cambiar de ecosistema). Un **ID público** (UUID v4) para enlaces e invitaciones, distinto de la credencial privada | A | 2026-10-27 |
| D-142 | La nube guarda una **copia cifrada** de los datos personales con una clave que el servidor no tiene (viaja con la passkey o la clave de recuperación). El servidor solo ve en claro lo mínimo de amigos y retos | A | 2026-10-27 |
| D-143 | La cuenta se ofrece en un paso opcional del onboarding («Guarda tu progreso») y siempre en Ajustes; a los usuarios actuales se les ofrece una vez | A | 2026-10-27 |
| D-144 | Los demás solo ven tu **alias**; tus amigos ven además tu **nivel** y los retos que habéis hecho juntos. Nada de tus hábitos fuera de los retos | A | 2026-10-27 |
| D-145 | Reto = **una actividad diaria durante N días**, con fecha de inicio elegida por quien lo crea; se puede aceptar hasta que empieza. Al aceptarlo se crea **siempre una actividad nueva** para el reto, que da su XP diaria normal; hasta **20 participantes** | A | 2026-10-27 |
| D-146 | Dos modos al crear el reto: **cooperativo** (meta del grupo: la suma de días cumplidos de todos llega al 80 % del total) y **competitivo** (gana quien más días cumple; empate si igualan; marcador visible durante el reto) | A | 2026-10-27 |
| D-147 | Invitaciones: **enlace por reto** y **enlace de amistad** personal. Si te invitan a un reto quien no es tu amigo, tras aceptar el reto se ofrece añadirlo como amigo y él debe confirmarlo; la amistad es mutua solo si ambos aceptan. El enlace de amistad directo hace amigos al aceptarlo | A | 2026-10-27 |
| D-148 | Recompensa de un reto: la XP diaria de su actividad y un apartado de **retos cumplidos** en el Perfil (sin XP extra) | A | 2026-10-27 |
| D-149 | Avisos push de amigos y retos: invitaciones y amistad, recordatorio del reto del día, avances de otros y final del reto | A | 2026-10-27 |
| D-150 | Gestión: eliminar amigo, bloquear (no puede volver a invitarte), abandonar un reto (queda como «abandonó») y borrar la cuenta (se borra todo lo de la nube; el dispositivo sigue como sin cuenta) | A | 2026-10-27 |
| D-151 | Spec 14 (cuenta ligera y copia en la nube) aprobada con S14-01 a S14-07: Netlify Blobs; clave de recuperación con HKDF (auth/wrap) y servidor que nunca descifra; PRF de la passkey donde se pueda; una sola copia con versión; sesión de 1 año (`ARVID_SESSION_SECRET`); todo tras `VITE_ACCOUNTS` hasta la 2.0 con prototipo 14a primero; se sigue en `arvid-app.netlify.app` y un futuro dominio se migraría con Related Origin Requests | A | 2026-10-27 |
| D-152 | Spec 15 (amigos y retos) aprobada con S15-01 a S15-09: Netlify Blobs con documentos por participante; al servidor solo las fechas cumplidas, con 2 días de margen; retos en la pestaña Objetivos y amigos en el Perfil; de 3 a 60 días y 5 retos activos; los descansos no cuentan; competitivo cumplido con el 80 %; un aviso de avances al día por reto; en iPhone, «Tengo un enlace» y detección del portapapeles porque los enlaces se abren en Safari; la actividad del reto se archiva sola | A | 2026-10-27 |
| D-153 | Spec 16 (efectos de sonido y panel de sonido) aprobada con S16-01 a S16-05: 10 efectos sintetizados sin archivos; encendidos al 50 % y timbre Suave por defecto; el toque solo en acciones; reproductor centrado (anterior, reproducir/pausa, siguiente, barra de progreso, botones compactos); los ajustes de sonido viajan en el backup | A | 2026-10-27 |
| D-154 | Tonos de noche neón en toda la app (de la página de prueba de sonido): fondo `#0b0d1a`, paneles `#161a33`, hundidos `#1f2547`, bordes índigo `#3a4280` y texto secundario lavanda `#9aa3d6`. Las acciones principales con texto van en dorado con texto oscuro (los botones de solo icono siguen en azul). Las opciones de tipo casilla muestran una casilla pixel sin recuadro (variante B). El timbre usa un selector segmentado | A | 2026-10-28 |
| D-155 | Estilo «Cristal neón» (propuesta A de la exploración de componentes) para toda la app, con neón tenue: paneles translúcidos con desenfoque y borde de luz de 1 px, esquinas pixel, fondo con brillos suaves, barras de un solo color que se aclara, botón principal dorado, «+» en cian y rebote elástico al pulsar; barra de pestañas pegada abajo con solo una línea arriba. La escena va sin marco, de lado a lado y fundida hacia el fondo, arriba del todo también en Perfil; sus botones (música, juego y chat) se desvanecen y aparecen 4 s al tocarla o con el teclado. Las propuestas B (Arcilla) y C (Mínimo) quedan como borrador en `docs/design/drafts/estilos-2026-10/` | A | 2026-10-28 |
| D-156 | La burbuja de la escena pasa a ser de cristal (sustituye a D-137): relleno oscuro translúcido, borde de luz de 1 px con esquinas recortadas, brillo arriba, texto claro y cola en escalera; la de los vecinos, con borde dorado. En Hoy, la fecha de la escena también se desvanece y aparece con los botones al tocarla; en Perfil, el nivel sigue visible | A | 2026-10-28 |
| D-157 | Iconos pixel del estilo Cristal neón en una cuadrícula de 12×12, a escala entera: las cuatro pestañas (sol, lista, bandera y persona) y el corazón relleno de Cuerpo sustituyen a los del atlas; el resto de iconos sigue en el atlas hasta redibujarlos | A | 2026-10-28 |
| D-158 | Registrar en Hoy sin saltos de diseño: la barra se rellena de izquierda a derecha, «Hecho» entra deslizándose entre la barra y el botón, el «−» es cian como el «+» y se reserva el hueco de los dos botones en las actividades de varias veces. La XP ganada (o perdida, en gris) sale flotando sobre la cabeza del protagonista en la escena, con un rebote, en lugar de en la tarjeta; el texto completo se sigue anunciando a los lectores de pantalla. Más espacio entre la cabecera fija y lo que hay debajo | A | 2026-10-28 |
| D-159 | Chat de la escena en el estilo Cristal neón: campo de cristal oscuro con borde de luz de 1 px y foco cian (sin el doble marco dorado), expandir de cristal y enviar en cian como el «+»; botones de la escena de 40 px; el campo se abre con un rebote | A | 2026-10-28 |
| D-160 | En Hoy, las misiones tienen la misma forma que las actividades: título en negrita y plazo, la etiqueta de estado en su propia columna y un botón cuadrado cian (✓ para completar, «−» para deshacer); el aviso de XP ya no ocupa la fila (sale en la escena, D-158). El resumen pasa a «x actividad(es) y x misión(es) pendientes» (o «Día completo») | A | 2026-10-28 |
| D-161 | Paralaje suave: el lienzo de la escena se dibuja a la resolución de la pantalla (×1 a ×3 según el ancho y la densidad) y el fondo, el río y los drones del cielo se colocan en la rejilla de píxeles de pantalla, así avanzan de 1 en 1 píxel de pantalla en lugar de saltar de 3 en 3; el pixel art sigue nítido (cada píxel, k×k) y el texto de las burbujas gana nitidez | A | 2026-10-28 |
| D-162 | Al completar una actividad o misión en Hoy, la tarjeta se queda en su sitio ~0,85 s (barra y «Hecho») y luego baja deslizándose, algo elevada, mientras las de abajo suben una tras otra con un pequeño rebote (ola); igual al deshacer, en sentido contrario; sin seguirla con el scroll y sin animación con movimiento reducido. Créditos: las cinco pistas una por línea (de la lista del reproductor) y un apartado Juegos con CombinaDos (hecrey) | A | 2026-10-28 |
| D-163 | Música en segundo plano (1.8.0, modifica MUS-05 de la spec 05): interruptor «Seguir sonando al salir de la app» en Ajustes → Sonido, **encendido por defecto**; controles en la pantalla de bloqueo y en la notificación (Media Session: carátula, pista, anterior, pausa y siguiente). En iPhone, para poder seguir sonando la música no pasa por Web Audio: el volumen lo controlan los botones del teléfono y no hay fundidos (la app lo explica). Los efectos solo suenan con la app abierta. Primero, un prototipo probado en los dos teléfonos | A | 2026-10-28 |
| D-164 | Al cerrar la app (evento `pagehide`, no al pasarla a segundo plano) la música se para: iOS la mantenía sonando tras cerrarla desde el selector de apps. La preferencia no cambia | A | 2026-10-28 |
| D-165 | Solo suena un ARVID a la vez: al empezar a sonar, la app lo anuncia por un BroadcastChannel y cualquier otra copia abierta (por ejemplo, una que iOS dejó viva tras cerrarla) se calla sola, sin cambiar la preferencia | A | 2026-10-28 |
| D-166 | Sexta pista, **Afterglow Avenue**: versión corta de «Rain Slicked Boulevard» (aportada por el responsable), cortada de 1:09,95 a 1:44,86, 16 compases exactos a 110 BPM, con un fundido de medio tiempo para que el ritmo siga sin salto; 1:30, AAC de 128 kbps como las demás | A | 2026-10-28 |
| D-167 | Cada pista tiene su portada (pixel art de ciudad neón, generada por el responsable con IA): sale en la pantalla de bloqueo y la notificación mientras suena, en lugar del icono de ARVID. JPEG de 96, 192 y 512 px en `public/music/covers/` | A | 2026-10-28 |
| D-168 | El reproductor de Ajustes muestra la portada de la pista (opción B): de fondo, difuminada y oscurecida bajo el cristal, con una miniatura de 120 px encima y un brillo neón en los bordes del color más vivo de cada portada (guardado por pista); cambia con un fundido al cambiar de pista | A | 2026-10-28 |
| D-169 | Spec 14: la clave de datos de la cuenta es **extraíble** (y no «no exportable», como decía §5.1), para poder volver a envolverla al generar otra clave de recuperación o añadir una passkey; solo vive en IndexedDB del dispositivo | A | 2026-10-28 |
| D-170 | Hasta la 2.0, la cuenta, los amigos y los retos se activan por dispositivo: con `?cuentas=1` en el navegador o con **7 toques seguidos en la versión** (al final de Ajustes) en la app instalada; otros 7 toques la ocultan | A | 2026-10-28 |
| D-171 | Spec 15, EN-03: en lugar de leer el portapapeles al volver a la app (iOS pide permiso cada vez), «Tengo un enlace» tiene un botón **Pegar** que lo lee con un toque | A | 2026-10-28 |
| D-172 | Spec 15, SY-02: sin cola de envíos (`socialQueue`): la app compara las fechas registradas en la actividad del reto con las que tiene el servidor y envía solo la diferencia, al registrar, al abrir la app, al volver la conexión y cada 5 minutos. El área no se guarda en el servidor: cada participante la elige al crear o aceptar; la actividad de un reto que empieza más tarde se crea al unirse y los registros anteriores al inicio no cuentan | A | 2026-10-28 |
| D-173 | Spec 15, FN-01: el resultado de un reto lo calcula cada dispositivo con el marcador descargado (y el servidor, igual, para el aviso final); no se guarda aparte | A | 2026-10-29 |
| D-174 | Spec 15, AV: el dispositivo se asocia a la cuenta con sus interruptores (Invitaciones y amistad, Reto en el resumen de la tarde, Avances, Resultado). Amistad e invitaciones salen al momento; avances y resultado los revisa el cron de día cada 10 minutos, con «hoy» en la zona horaria del dispositivo. AV-02 lo añade el service worker al resumen de la tarde. En el cooperativo, el aviso de avances va a quien aún no cumplió cuando ya cumplió al menos la mitad del grupo. El compañero celebra cada reto una vez por dispositivo | A | 2026-10-29 |
| D-175 | Iconos Cristal neón (siluetas de 12 px) también para Relaciones (dos personas), Música, Poción, Gema, Trofeo y las flechas de subir y bajar; el resto del atlas se queda como está | A | 2026-10-29 |
| D-176 | El aviso «Nueva versión disponible» va en una sola línea también en móvil: cristal cian, flecha hacia arriba, texto y botón compacto «Actualizar» | A | 2026-10-29 |
| D-050 | Spec 05 (Escena neón, protagonistas y música) aprobada con S5-01 a S5-09: escena de Warped City en Hoy y Personaje; Sweetie 16 + neón sutil, con la escena como excepción a los 16 colores; 4 protagonistas × 6 variantes (enmienda D-029 y D-036); partículas; música opcional desactivada por defecto y sin precache; la escena es el incremento 5 y Logros el 6; solo se publican assets con licencia verificada; nombres de protagonistas provisionales | A | 2026-10-18 |
| C-001 | El onboarding guía la instalación en la pantalla de inicio y solicita `navigator.storage.persist()` | C | 2026-10-17 |
| C-002 | Una categoría sin datos suficientes se muestra como "sin datos", nunca como 0. El radar tiene una alternativa accesible en forma de lista | C | 2026-10-17 |
| C-003 | Sonidos opcionales y desactivados por defecto; se respeta `prefers-reduced-motion` | C | 2026-10-17 |

## Decisiones pendientes

| ID | Pregunta | Dónde se resuelve |
|---|---|---|

## Riesgos

| ID | Riesgo | Mitigación |
|---|---|---|
| R-001 | Sin sync ni backup, perder el dispositivo o que se purgue el almacenamiento implica perder todos los datos | Backup P0 (D-024) + `persist()` (C-001) |
| R-002 | iPhone es la plataforma principal: sin instalar la app, Safari purga los datos en 7 días; las notificaciones exigen la app instalada y un servidor | Instalación guiada en el onboarding; push en P1 |
| R-003 | Sin límite de actividades + rachas → sobrecarga y desánimo | Rachas por actividad; los atributos por ventana se recuperan solos; comodines; logro "Regreso" |
| R-004 | Los puntos acumulados miden volumen, no el estado actual | Resuelto con D-011 (atributos por ventana y por ratio) |
| R-005 | Packs CC0 de distintos autores → estilo incoherente | Una familia principal de un solo autor, recolorear a la paleta propia, `asset-licenses.md` |
| R-006 | Assets de la escena con licencia sin verificar (spec 05 §9) | Resuelto por D-051 salvo las 5 pistas de CombinaDos, que no se publican (S5-08); `licenses.test.ts` impide publicar un asset sin registrar |

## Hipótesis

| ID | Hipótesis | Cómo validarla |
|---|---|---|
| H-001 | Para el MVP basta con local-first, sin cuenta ni servidor | Uso real durante 4 semanas por los dos usuarios |
| H-002 | Separar XP (que solo sube) de los atributos (que fluctúan) reduce el abandono tras una mala semana | Observar si se retoma la app tras periodos con baja Disciplina |

## Excluido del MVP

Monedas, tienda, inventario, equipamiento, competición o ranking social, generación de misiones con IA, sincronización y cuentas, cosméticos, personaje evolutivo, refugio o mundo, tipo "hábito a reducir", app nativa (Capacitor), notificaciones push y badge (P1).

## Cambios de alcance

| Fecha | Cambio | Motivo |
|---|---|---|
| 2026-10-17 | D-008 (±simétrico) sustituida por D-011 | Riesgo de espiral de abandono (R-003) y de medir volumen en lugar del estado actual (R-004) |
| 2026-10-17 | Badge del icono de P0 a P1 (D-030) | En iOS requiere permiso de notificaciones, que no se justifica sin push |
| 2026-10-18 | Entran en el MVP ARVID con IA (Mistral, mediante una función de Netlify), el chat y el inglés (D-059, D-063, D-066); Logros y pulido pasa al incremento 7 | Que ARVID acompañe de verdad y que la app sirva a usuarios de otros idiomas |
| 2026-10-18 | Entran en el MVP la escena animada y la música opcional (incremento 5); Logros y pulido pasa al incremento 6 (D-050). Los efectos de sonido siguen en P1 | Exploración visual: la app debe apetecer abrirla sin añadir mecánicas |
| 2026-10-27 | Se abre la 2.0: cuenta ligera, copia en la nube y retos con amigos (D-139, D-140). La app deja de ser solo local, pero sigue siendo offline-first | Retos compartidos y recuperar los datos al perder el dispositivo |
| 2026-10-27 | La competición deja de estar excluida **solo en los retos entre amigos** (modo competitivo, D-146); sigue excluido un ranking general o público | Decisión del responsable: retos cooperativos o competitivos a elegir |
