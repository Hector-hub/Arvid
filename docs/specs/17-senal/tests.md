# Spec 17 — Pruebas

Aquí «prueba» es una comprobación de la app. Las pruebas del programa ORIGEN (PR) se nombran siempre como «prueba del programa».

## Automáticas
| Requisito | Prueba |
|---|---|
| PC-01 | `src/domain/origen/contact.test.ts`: el momento sorteado cae entre 6 y 55 s; solo cuenta el tiempo con la app a la vista; espera al primer toque y a que no haya otro aviso; ocurre igual con la app instalada que en el navegador |
| PC-02, PC-05, PC-06 | `src/app/origen/FirstContact.test.tsx`: las fases en orden y con sus duraciones (reloj simulado); tocar no adelanta nada; cerrar a medias lo deja pendiente y terminar la voz lo marca como visto |
| PC-03 | `FirstContact.test.tsx`: la réplica no tiene ningún elemento enfocable ni enlaces; en inglés escribe «Origin Program» |
| PC-08, PC-09, PC-10 | `FirstContact.test.tsx`: con «Reducir movimiento» no hay interferencias ni letras revueltas; con los efectos apagados no se crea audio y los subtítulos siguen su ritmo; diálogo modal con `aria-live` |
| DE-01, DE-05 | `src/app/origen/Decision.test.tsx`: la pregunta sale al terminar el primer contacto; no se puede cerrar sin elegir; si se cierra la app, vuelve a salir |
| DE-02, DE-03, DE-04 | `Decision.test.tsx`: «Investigar» crea el contacto «???» con la sesión 1; «Bloquear la señal» deja un solo chat y no entrega nada; el interruptor de Ajustes refleja la elección y la cambia |
| RI-02, RI-03 | `src/domain/origen/periods.test.ts`: no se abre antes de 7 días aunque sobre XP; no se abre a los 7 días si falta XP; se abre el día que se alcanza la vara; con la prueba del tramo superada se abre a los 7 días sin vara; la vara del tramo siguiente es la XP del tramo que acaba |
| RI-04 | `periods.test.ts`: ninguna vara baja de 50 XP; desde el tercer tramo no sube más de un 25 %; el primer tramo pide solo el mínimo |
| RI-05 | `periods.test.ts`: cuenta la XP de actividades y misiones desde la apertura, también la registrada con retraso; no cuenta la de las pruebas del programa; al borrar registros baja la XP del tramo y no se cierra ningún capítulo |
| RI-06, RI-07 | `src/app/origen/OrigenWatcher.test.tsx`: con las condiciones cumplidas, el capítulo llega entre 5 y 30 s de app a la vista; nunca encima de otro aviso; con transmisión no hay buscador |
| RI-09 | `src/domain/scene/city.test.ts`: con nivel 3 y capítulo 8, Teo y Mía viven en la calle; el resto de la ciudad sigue el nivel |
| RI-10 | `periods.test.ts`: con la señal bloqueada los tramos siguen contando y no abren capítulos |
| TR-01, TR-03, TR-05 | `src/domain/origen/sessions.test.ts`: sesión por capítulo; con imagen hasta la 6 y solo audio desde la 7; voz según idioma, género y protagonista |
| TR-02, TR-04 | `src/app/origen/Transmission.test.tsx`: cada subtítulo entra en su marca; en la sesión 6 aparecen el protagonista y el alias durante el fallo |
| TR-06, TR-07, TR-08 | `Transmission.test.tsx`: sin el audio descargado, el capítulo espera; a medias se repite; desde «???» se reproduce sin buscador y se puede cerrar |
| CA-01, CA-02 | `src/domain/origen/chapters.test.ts`: los pasos respetan sus esperas; ningún capítulo necesita más de 5 días; al abrirse el siguiente, los pendientes se entregan de golpe |
| CA-04 | `chapters.test.ts`: todos los pasos de los 20 capítulos tienen texto en es y en; las frases de la Instancia y de Sombra tienen las dos variantes de género; ningún texto del jugador lleva adjetivo con género ni menciona nivel o título |
| CA-07 | `src/domain/origen/time.test.ts`: 13 días → «13 días»; 14 → «2 semanas»; 60 → «2 meses»; 365 → «un año»; igual en inglés; ninguna sesión grabada usa `{tiempo}` |
| CA-03, CA-06 | `OrigenWatcher.test.tsx`: punto rojo y burbuja al llegar un mensaje; con «habla por iniciativa propia» apagado, sin burbuja pero en el chat |
| ME-01, ME-02 | `src/app/chats/list.test.tsx`: antes de «Investigar» y con la señal bloqueada, el botón abre el chat del compañero; después, la lista, con cada contacto desde su primer mensaje |
| ME-04, ME-05, ME-06 | `src/app/chats/conversation.test.tsx`: las respuestas «por ti» llevan su etiqueta; solo tus mensajes ofrecen «Eliminar»; no hay «Borrar conversación» con los personajes; los mensajes de la historia se reconstruyen tras borrar la conversación libre |
| ME-08, ME-09 | `conversation.test.tsx`: «???» no tiene campo de escribir y lista las sesiones; Sombra contesta con frases fijas una de cada cinco veces (azar simulado) y nunca con «Sin señal» ni «Canal cerrado» |
| VI-01 | `conversation.test.tsx`: el contador baja con cada mensaje; al tercero, el campo se cierra para ese vecino y no para los demás; al día siguiente vuelve |
| VI-01, NFR17-03 | `src/app/arvid/function.test.ts`: `neighborChat` admite 3 al día por código y vecino y rechaza el cuarto; no descuenta créditos del compañero; sin código, rechazado |
| VI-02, VI-03, VI-06, NFR17-04 | `function.test.ts`: `neighborChat` construye la ficha y lo que sabe ese vecino en ese capítulo, y nada de capítulos posteriores; el contexto no lleva actividades, objetivos ni memoria; el compañero recibe el capítulo |
| VI-04, NFR17-02 | `function.test.ts`: la respuesta de un vecino no admite propuestas ni operaciones de memoria |
| VI-05 | `conversation.test.tsx`: sin IA se muestra el aviso en lugar del campo; sin conexión, el mensaje no se envía y se avisa |
| SO-01, SO-05, SO-06 | `src/domain/origen/sombra.test.ts`: estado de Sombra por capítulo (ausente, tenue, sin señal, nítido, cerrado); investigando, con nivel 12 y sin capítulo 10, no está en la calle; con la señal bloqueada, está y pasea |
| SO-02, SO-03 | `src/app/scene/scene.test.tsx`: Sombra no pasea ni habla al pasar |
| PR-01 | `src/domain/origen/tests.test.ts`: la primera, con el capítulo 3; una por tramo, entre el día 2 y el 4; una a la vez; nunca con un descanso en los 7 días siguientes; ninguna tras el capítulo 20 |
| PR-02 | `tests.test.ts`: el resumen de comportamiento lleva actividades, cumplimiento, días flojos, categoría más baja, objetivos, misiones y las tres últimas pruebas; no lleva alias ni conversaciones |
| PR-03, PR-04 | `function.test.ts`: `origenTest` valida longitudes, días (1 a 7) y plazo (7 como mucho); una respuesta inválida se repite una vez y después se devuelve error; una cada 5 días por código, sin créditos |
| PR-05 | `tests.test.ts`: sin IA, sin conexión o con error, sale un tipo de la lista fija según el historial; la prueba 1 es siempre fija y con una actividad; sin repetir tipo; con menos de 7 días, «Sin días en blanco» |
| PR-06, PR-07 | `src/app/origen/test-card.test.tsx`: tarjeta con «Aceptar» y «Rechazar»; nada se guarda como misión antes de aceptar; aceptada, aparece en Hoy; con actividad avanza sola; sin ella, «Hecho hoy» una vez al día y se puede deshacer ese día |
| PR-08, PR-09 | `tests.test.ts`: superarla es el pase del tramo; 100 XP al nivel y nada a los atributos, a la Disciplina ni a la vara; lo superado no se revoca al borrar registros; rechazar, ignorar 3 días y vencer no tocan XP, Disciplina ni el tramo |
| PR-10 | `src/domain/origen/fragments.test.ts`: orden; ninguno sale antes de su capítulo; hasta el 8 se guardan sin leer y en el 8 se entregan todos |
| EX-02, EX-03 | `src/app/origen/dossier.test.tsx`: no muestra cuándo llega el próximo capítulo ni cuánto falta; capítulos vistos y pendientes, pistas, fragmentos y registro; porcentaje con 20 capítulos y 30 fragmentos = 100 |
| EP-01, EP-05 | `src/app/origen/Epilogue.test.tsx`: orden de los cuatro tramos; al cerrar en el epílogo, continúa desde su principio |
| EP-02, EP-03, EP-04 | `Epilogue.test.tsx`: cada párrafo entra en su marca; la línea de los días lleva los días reales desde el primer contacto; sin sonido, mismo ritmo; con «Reducir movimiento», fundidos |
| EP-06, EP-07 | `src/app/origen/Finale.test.tsx`: los siete momentos en orden; todos los mensajes quedan en sus chats; después no llegan sesiones ni pruebas del programa y Sombra no está |
| MU-01, MU-02 | `src/app/music/tracks.test.ts`: el álbum es «Our Signal»; al empezar solo están disponibles las tres primeras |
| MU-03 | `src/app/music/list.test.tsx`: una canción bloqueada muestra «???» y la portada en gris, no se puede tocar y su nombre no aparece en el DOM; siguiente, anterior y aleatorio se la saltan |
| MU-04, MU-05, MU-07 | `tracks.test.ts`: canciones disponibles por tramo (2, 5, 8, 11, 14, 17), también con la señal bloqueada; «Glass and Gravity» solo tras el epílogo; si la canción guardada como actual está bloqueada, se usa la primera |
| UA-02 | `periods.test.ts`: con nivel 12 se empieza por el capítulo 1 y la XP anterior al hackeo no cuenta |
| UA-03, 4 (datos) | `src/data/backup.test.ts`: `origen`, `origenTests` y `messages` viajan en la copia; una copia anterior se importa sin ellos; `src/data/repository.test.ts`: migración a la versión 6 sin tocar lo anterior |
| UA-04 | `sessions.test.ts`: cambiar de idioma o de género cambia la voz de la siguiente sesión |
| AJ-01 | `chapters.test.ts`: con «Historia» apagado no se entrega nada; al encenderlo sigue donde estaba |
| NFR17-10 | `OrigenWatcher.test.tsx`: con el siguiente capítulo sin publicar, la historia espera sin avisos y los tramos siguen contando |
| PC-01, DE-02 (e2e) | `e2e/origen.spec.ts` (chromium): con `?origen=contacto`, la secuencia aparece, termina sola, vuelve Hoy, sale la pregunta y, al investigar, existe el contacto «???» con la sesión 1 |
| EP-06 (e2e) | `e2e/origen.spec.ts`: con `?origen=final`, la escena llega a «Fin de la temporada 1» y Sombra ya no está en la calle |

## Manual
| # | Paso | iPhone | Android |
|---|---|---|---|
| M17-01 | Tras el onboarding, en el navegador y en la app instalada: el hackeo llega en el primer minuto, en un momento distinto cada vez; el buscador se ve real y no se puede tocar | ☐ | ☐ |
| M17-02 | La voz suena con el filtro de radio y los subtítulos van a tiempo, en las tres voces | ☐ | ☐ |
| M17-03 | Con el celular en silencio, la transmisión se entiende solo con los subtítulos | ☐ | ☐ |
| M17-04 | Con música sonando, se pausa en la transmisión y vuelve después | ☐ | ☐ |
| M17-05 | Con «Reducir movimiento»: fundidos, sin interferencias ni parpadeos | ☐ | ☐ |
| M17-06 | La pregunta: «Bloquear la señal» deja la app como hoy; desde Ajustes se vuelve a encender y la historia sigue | ☐ | ☐ |
| M17-07 | Usuario actual con nivel alto: llega el hackeo tras actualizar, no encima de Novedades; quedan tres canciones y el capítulo 2 no llega antes de una semana | ☐ | ☐ |
| M17-08 | Un capítulo llega de repente, a los pocos segundos de abrir la app, nunca encima de otro aviso, y nada en la app anunciaba cuándo | ☐ | ☐ |
| M17-09 | Lista de chats: llegan los mensajes de un vecino con el punto rojo, y las respuestas «por ti» se distinguen | ☐ | ☐ |
| M17-10 | Hablar con tres vecinos distintos: cada uno suena a sí mismo, ninguno confirma nada de la historia y al tercer mensaje se cierra solo ese chat | ☐ | ☐ |
| M17-11 | Diez pruebas del programa escritas por la IA con perfiles distintos: son concretas, posibles en el plazo y ninguna pide nada de PR-04 | ☐ | ☐ |
| M17-12 | Una prueba del programa de principio a fin: llega, se acepta, avanza en Hoy y se supera con +100 XP | ☐ | ☐ |
| M17-13 | Sesión 6: se ve tu protagonista y tu alias durante el fallo, y Sombra aparece junto al farol | ☐ | ☐ |
| M17-14 | Sesión de solo audio con la app instalada y sin conexión, ya descargada | ☐ | ☐ |
| M17-15 | Lista de música: las bloqueadas, en blanco y negro y con «???»; al desbloquear una, aviso y portada en color | ☐ | ☐ |
| M17-16 | Capítulo 20 entero: transmisión, epílogo con «Glass and Gravity» a su ritmo y con tus días reales, y escena final con el glitch de Sombra | ☐ | ☐ |
| M17-17 | La pantalla de bloqueo muestra el álbum «Our Signal» y nunca el nombre de una canción bloqueada | ☐ | ☐ |
