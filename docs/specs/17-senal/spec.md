# Spec 17 — Programa ORIGEN (historia)

Estado: **aprobada** (2026-11-11) · Incrementos 2.4.0 a 3.0.0 (§8)
Decisiones que implementa: D-210 a D-245
Historia que implementa: `cimientos.md` (reglas y giros) y `historia.md` (los veinte capítulos, con sus mensajes). Esta spec **no repite la historia**: dice cómo se juega.
Sustituye a: el borrador del 2026-11-10, que iba por nivel.
Modifica:
- spec 06 (chat): el chat pasa a ser una lista de conversaciones;
- spec 11 (ciudad): Sombra deja de ser un vecino que pasea y los vecinos ganan un chat;
- spec 03 y 12 (misiones y propuestas): llegan las pruebas del programa, que escribe la IA;
- spec 05 y 16 (música y sonido): canciones bloqueadas, voz de las transmisiones, sonidos de la señal, una pista nueva y el nombre del álbum.

## 1. Objetivo
Que cumplir hábitos y descifrar un enigma sean la misma acción (`cimientos.md` §1).

Para el jugador, eso son cinco cosas:
- una **serie de veinte capítulos** que llega sola, de repente, si mantiene su ritmo semana a semana;
- **transmisiones** con voz de una señal que le evalúa;
- **chats** con sus vecinos, donde ocurre la investigación y donde puede hablar con ellos;
- **pruebas** del programa, hechas a su medida, que dan mucha XP;
- **canciones** que se desbloquean al avanzar.

La historia se elige (DE) y nunca castiga (M-21).

## 2. Alcance
**Incluye:**
- El primer contacto: el hackeo del primer minuto.
- La decisión: investigar o bloquear la señal.
- El ritmo: cuándo llega cada capítulo.
- Las diez transmisiones con voz grabada y subtítulos, y el contacto «???» donde quedan guardadas.
- Los veinte capítulos: mensajes fijos de los personajes y respuestas del compañero «por ti».
- La lista de chats y la conversación libre con cada vecino, con IA.
- Sombra en la calle y en los chats, de principio a fin.
- Las pruebas del programa, los fragmentos del archivo y el Expediente ORIGEN.
- El capítulo 20 completo: última transmisión, epílogo «En el futuro» y escena final.
- La música bloqueada y el álbum «Our Signal» (D-210).
- Qué pasa con quien ya usa la app.

**Excluye:**
- Responder a la señal: al contacto «???» no se le puede escribir.
- Historia escrita por IA: todo lo que hace avanzar la historia es texto fijo. La IA solo escribe el objetivo de las pruebas y la conversación libre.
- IA para el Marco y para Sombra (RV-05).
- Notificaciones push de la historia.
- La temporada 2.
- Animar el sprite de la señal: es un solo cuadro.

## 3. Requisitos funcionales

### 3.1 Primer contacto (PC, D-211, D-232)
- **PC-01. Dónde y cuándo.**
  - **Al terminar el onboarding, en cualquier dispositivo.** No hace falta tener la app instalada.
  - En un **momento al azar entre los 6 y los 55 s** desde que llegas a Hoy por primera vez con el perfil completo (alias y género).
  - Solo cuenta el tiempo con la app a la vista. Si sales, el reloj se para.
  - Ocurre estés en la pantalla que estés. Al volver, todo sigue como lo dejaste, también un formulario a medias.
  - Nunca encima de otro aviso (subida de nivel, novedades, logro): espera a que se cierre y 2 s más.
  - No empieza hasta que hayas tocado la pantalla una vez en esa sesión: el navegador no deja sonar antes.
- **PC-02. Secuencia** (la del prototipo aprobado):

  | # | Fase | Duración | Sonido |
  |---|---|---|---|
  | 1 | Interferencia sobre la app | 0,45 s | Chasquido de estática |
  | 2 | Aparece la portada de Google, con un último coletazo de interferencia | 0,5 s | — |
  | 3 | La página, quieta | 5 s | Silencio |
  | 4 | Alguien escribe «Programa Origen» letra a letra, con ritmo irregular | ≈3,5 s | Silencio |
  | 5 | El texto se queda escrito | 1,5 s | Silencio |
  | 6 | **Corte seco a negro**, sin interferencia | 3 s | El zumbido empieza al segundo 1 |
  | 7 | Aparecen los ojos | 0,6 s | Zumbido |
  | 8 | La figura sale de la sombra, con dos tirones | 2 s | Sonido de glitch en cada tirón |
  | 9 | Se encienden las líneas rojas, como un neón | 0,8 s | — |
  | 10 | La transmisión: sesión 1 (TR) | 44 a 49 s, según la voz | Voz y zumbido |
  | 11 | Se pierde la señal y vuelve la app | 0,6 s | Chasquido de estática |

- **PC-03. La portada de Google** es una réplica hecha con HTML y CSS dentro de la app:
  - funciona sin conexión;
  - no se puede tocar nada: ni la caja, ni los enlaces, ni los botones;
  - está en el idioma de la app; en inglés se escribe «Origin Program»;
  - el país del pie sale del idioma del dispositivo, y las tendencias son inventadas y neutras.
- **PC-04. La figura** (se mantiene de D-209): hoja «Neon Red Hooded Cyberpunk Sprite Sheet», cuadro 1, de cintura para arriba, sin animar. En tres capas (cuerpo, ojos y líneas rojas) para encenderlas por separado.
- **PC-05. No hay «Saltar»** y tocar no adelanta nada.
- **PC-06. Solo una vez.** Se da por visto cuando termina la voz. Si cierras la app a medias, se repite entera en la siguiente apertura, entre 3 y 8 s después de abrir.
- **PC-07. Al terminar:**
  - vuelves a donde estabas;
  - el compañero reacciona con sus frases del capítulo 1;
  - y te hace la pregunta (DE).
- **PC-08. Con «Reducir movimiento»:**
  - sin interferencias ni tirones: las fases 1, 2, 8 y 11 son fundidos;
  - la escritura en el buscador se mantiene (es contenido, no adorno);
  - los subtítulos aparecen enteros, sin letras revueltas.
- **PC-09. Sonido.**
  - La voz, el zumbido, la estática y el glitch siguen el interruptor y el volumen de **Efectos** (spec 16).
  - Con los efectos apagados o el celular en silencio, la transmisión se ve igual, con sus subtítulos a su ritmo.
  - Si suena música, se pausa al empezar y vuelve al terminar.
- **PC-10. Accesibilidad.** Es un diálogo modal llamado «Señal desconocida». Los subtítulos van en una región `aria-live`. El foco no sale hasta que termina.

### 3.2 La decisión (DE, D-237)
- **DE-01.** Cuando termina el primer contacto y el compañero ha reaccionado, él mismo te lo pregunta en un aviso que no se puede cerrar sin elegir:

  > **Nos han hackeado**
  > Alguien ha entrado por nuestro enlace y no sé quién es. Puedo bloquear la señal y seguimos como siempre. O la dejo pasar y averiguamos qué quiere. ¿Qué hacemos?
  >
  > **[ Investigar ]** · **[ Bloquear la señal ]**

- **DE-02. «Investigar»:** empieza la historia.
  - En los chats aparece un contacto que no añadiste, «??? · Señal desconocida», con la sesión 1 (ME-08).
  - Desde ahí llegan capítulos, transmisiones y pruebas.
- **DE-03. «Bloquear la señal»:** no llega nada más.
  - La app sigue como hoy: un solo chat, con tu compañero, y Sombra como un vecino más cuando te toque por nivel.
  - No aparece «???» ni el Expediente.
  - El compañero lo cierra con una frase: «Bloqueada. Si cambias de idea, está en Ajustes.»
- **DE-04. Se puede cambiar** en Ajustes → Compañero → «Historia» (AJ-01).
- **DE-05.** Si cierras la app con la pregunta abierta, vuelve a salir en la siguiente apertura. Hasta que contestes no llega nada.
- **DE-06.** La pregunta no menciona pruebas, capítulos ni duración: solo que hay algo que averiguar.

### 3.3 El ritmo: tramos (RI, D-233)
Los capítulos **no van por nivel**. Van por tiempo y por experiencia.

- **RI-01. Tramo.** Es lo que va desde que se abre un capítulo hasta que se abre el siguiente. El primero empieza cuando termina el primer contacto.
- **RI-02. El siguiente capítulo se abre cuando se cumplen las dos condiciones:**
  1. han pasado **7 días** desde que se abrió el anterior;
  2. en este tramo has ganado, como mínimo, **la misma XP que en el tramo anterior** (la «vara»), **o** has superado la prueba del programa del tramo, que sirve de **pase** (PR-08).

  No hay plazo: si tardas tres semanas en llegar a la vara o en superar la prueba, el capítulo llega a las tres semanas.
- **RI-03. La vara de cada tramo:**

  | Tramo | Vara |
  |---|---|
  | El primero (del capítulo 1 al 2) | El mínimo (RI-04): aún no hay tramo anterior. Lo que ganes aquí marca la vara del segundo |
  | Los demás | Toda la XP que ganaste en el tramo anterior, de la apertura de un capítulo a la del siguiente |

- **RI-04. Dos límites:**
  - **Mínimo: 50 XP.** Ninguna vara baja de ahí, para que la historia no avance solo con esperar.
  - **Tope de subida: un 25 %.** Desde el tercer tramo, la vara no sube más de un 25 % respecto a la anterior. Así una semana excepcional no te frena las siguientes.
- **RI-05. Qué XP cuenta:**
  - la de tus actividades y tus misiones, desde que se abrió el capítulo; también lo que registres con retraso;
  - **no** la de las pruebas del programa: la prueba ya cuenta por sí misma como pase (RI-02), y su XP no sube la vara del tramo siguiente.

  Se calcula como tu XP total de ahora menos la que tenías al abrirse el capítulo. Si borras registros, la XP del tramo baja; un capítulo abierto no se cierra.
- **RI-06. Llegan de repente.** Con las dos condiciones cumplidas, el capítulo no salta en el acto:
  - llega en un **momento al azar entre los 5 y los 30 s**, con la app a la vista;
  - si las cumples con la app abierta (al registrar la actividad que te lleva a la vara o con la que superas la prueba), los segundos cuentan desde ahí;
  - nunca encima de otro aviso, y después del primer toque, como en PC-01.
- **RI-07. Cómo empieza** un capítulo que no es el primero:
  - con transmisión: interferencia (0,45 s), 1 s de negro con zumbido y la sesión. Sin buscador: eso solo pasa la primera vez;
  - sin transmisión: la misma interferencia, breve, y el compañero habla.
- **RI-08. Nada avisa.** La app no dice cuándo llega el próximo capítulo, cuánta XP falta ni cuántos capítulos quedan (M-24). Cada capítulo es un hackeo por sorpresa.
- **RI-09. Lo que el capítulo necesita en la calle.** La ciudad sigue llegando por nivel (spec 11). Si un capítulo necesita a un vecino que aún no vive en tu calle, llega con el capítulo.
- **RI-10. El reloj es el mismo para todos:** quien bloqueó la señal también tiene tramos, sin capítulos. Sirven para la música (MU-04).
- **RI-11. Duración.** Diecinueve tramos: quien no falla nunca termina la temporada en 19 semanas.

### 3.4 Transmisiones (TR, D-212, D-220)
- **TR-01. Diez sesiones**, en los capítulos 1, 3, 5, 7, 8, 10, 12, 15, 17 y 20. Cada una abre su capítulo (CA-01).
- **TR-02. Formato:**
  - una sola pista de voz, de corrido;
  - subtítulos sincronizados que avanzan solos, cada uno en la pausa donde empieza su frase;
  - la caja de transmisión: fondo casi negro, borde lavanda, cabecera «???» y la etiqueta «SEÑAL DESCONOCIDA» en rojo, con un punto que parpadea;
  - las últimas letras de cada subtítulo llegan revueltas en rojo antes de aclararse.
- **TR-03. Con imagen o sin ella:**
  - sesiones 1 a 6 (capítulos 1 a 10): con la figura;
  - sesiones 7 a 10 (capítulos 12 a 20): **solo audio**. Pantalla negra, la caja y la etiqueta «SOLO AUDIO».
- **TR-04. Los fallos del Marco están en el guion**, no son al azar (M-11). Cada uno tiene su marca de tiempo:
  - un corte de estática y un tirón de imagen donde el guion dice «Error»;
  - **sesión 6 (giro 1):** durante 0,8 s, en tres parpadeos, la figura se sustituye por **tu protagonista** (el que elegiste, con su color) y «???» por **tu alias**. Luego, «Canal de imagen: revocado» y corte.
- **TR-05. Qué voz suena:**

  | Idioma de la app | Género del perfil | Voz |
  |---|---|---|
  | Español | Masculino | Española masculina |
  | Español | Femenino | Española femenina |
  | Español | Prefiero no decirlo | La de tu protagonista (ella → femenina, él → masculina) |
  | Inglés | Cualquiera | Inglesa |

  Todas pasan por el **filtro de radio AM** del prototipo, también la última (M-19).
- **TR-06. Los archivos:**
  - la sesión 1 va con la app, en sus tres voces, para que el primer contacto funcione sin conexión;
  - las demás se descargan solas al abrirse el capítulo anterior al suyo (una semana antes, como poco), solo en tu voz, y se guardan como la música;
  - si al tocar el capítulo no está descargada, espera a la siguiente apertura con conexión. El resto de la app no espera a nada.
- **TR-07. Sin «Saltar» la primera vez.** Si cierras la app a medias, la sesión se repite en la siguiente apertura.
- **TR-08. Volver a verlas.** Cada sesión deja una entrada en el contacto «???» (ME-08). Al tocarla se reproduce solo la transmisión, sin el buscador, y se puede cerrar cuando quieras.
- **TR-09. Los textos** de las sesiones 2 a 10 son los de `historia.md`. Antes de grabar se entregan como guiones listos para generar la voz, en las tres versiones.

### 3.5 Capítulos (CA, D-222)
- **CA-01. De qué está hecho.** Cada capítulo es una lista ordenada de **pasos**:

  | Paso | Qué es |
  |---|---|
  | Transmisión | La sesión del capítulo, si la tiene (TR) |
  | Comentario del compañero | Lo que te dice en privado. Suena en su burbuja y queda en su chat |
  | Mensajes de un personaje | Uno o varios mensajes seguidos en su chat |
  | Respuesta «por ti» | Lo que el compañero contesta en tu nombre (ME-04) |
  | Cambio en la calle | Sombra aparece, se atenúa o se va (SO) |

- **CA-02. Ritmo dentro del capítulo.** Cada paso lleva una espera mínima desde el anterior: nada, unas horas o «otro día».
  - Los pasos se entregan al abrir la app o mientras está abierta.
  - Todo capítulo cabe en 5 días, para que termine antes de que pueda abrirse el siguiente.
  - Si aun así se abre el siguiente, los pasos que queden se entregan de golpe.
- **CA-03. Cómo te enteras** de un mensaje nuevo:
  - el botón del chat lleva un **punto rojo**;
  - el compañero lo dice en su burbuja: «Dex te ha escrito.»
  - Si estás dentro de ese chat, los mensajes entran uno a uno, con «escribiendo…» entre ellos.
- **CA-04. Textos.**
  - Fijos, en `es.json` y `en.json`, con `{alias}` y `{compañero}`.
  - Sin adjetivos con género para el jugador.
  - La Instancia y Sombra hablan de sí mismos con tu género: hay variante masculina y femenina de sus frases.
  - Ningún texto da por hecho tu nivel, tu título ni que un vecino acaba de llegar.
- **CA-05. Orden de los avisos:** subida de nivel → llegadas a la ciudad → capítulo.
- **CA-06. Con «habla por iniciativa propia» apagado**, los comentarios del compañero no suenan en su burbuja, pero quedan en su chat.
- **CA-07. El tiempo es el tuyo.** Donde un mensaje dice cuánto llevas («Llevas {tiempo} con esto»), `{tiempo}` sale de los días reales desde el primer contacto:

  | Días | Se escribe |
  |---|---|
  | Menos de 14 | «12 días» |
  | De 14 a 59 | «5 semanas» |
  | De 60 a 364 | «4 meses» |
  | 365 o más | «un año» |

  - Las transmisiones van grabadas, así que no llevan tiempos: lo que dice la voz vale para cualquier ritmo.
  - El epílogo escribe los días exactos (EP-02).

### 3.6 Chats (ME, D-226)
- **ME-01. Lista de conversaciones.** Un botón **«Mensajes»** en la escena (un sobre, con el punto rojo de CA-03) abre una lista, como una app de mensajería. El botón del chat sigue abriendo el chat rápido con el compañero (ME-10):
  - arriba, tu compañero;
  - después, por orden de último mensaje, «???», los vecinos y Sombra;
  - cada fila: su cara, su nombre, a qué se dedica, la última frase y un punto si hay algo sin leer.

  Antes de elegir «Investigar», y si bloqueaste la señal, no hay botón «Mensajes»: solo existe el chat del compañero, como hoy.
- **ME-02. Un contacto aparece cuando te escribe por primera vez**, no cuando llega a la ciudad. A «???» y a Sombra no los añadiste tú.
- **ME-03. La conversación** es la pantalla de chat de hoy: arriba, con quién hablas; en medio, los mensajes por días; abajo, el campo de escribir.
- **ME-04. Respuestas «por ti».** Salen en tu lado, con la etiqueta «{compañero}, por ti». Son de la historia: no se pueden borrar.
- **ME-05. Qué se puede borrar:**

  | Mensaje | ¿Se puede eliminar? |
  |---|---|
  | Los tuyos, escritos por ti | Sí, uno a uno |
  | Lo que dice un personaje, sea de la historia o de la IA | No |
  | Las respuestas «por ti» | No |
  | Las transmisiones | No |

  - En los chats de los personajes no existe «Borrar conversación».
  - En el del compañero sigue existiendo, pero no borra sus comentarios de la historia.
- **ME-06.** Los mensajes de la historia no se guardan uno a uno: se reconstruyen a partir de qué pasos se entregaron y cuándo. Por eso no se pierden.
- **ME-07.** De la conversación libre se guardan los últimos 300 mensajes de cada chat.
- **ME-08. «??? · Señal desconocida»:**
  - una tarjeta por sesión («Sesión 3», con su fecha), que la reproduce (TR-08);
  - las pruebas del programa y sus resultados (PR);
  - no tiene campo de escribir: «No puedes responder a este contacto».
- **ME-09. Sombra:**
  - escribe cuando le toca, con frases fijas de menos de 60 caracteres;
  - puedes escribirle. Una de cada cinco veces contesta, tras una espera, con una frase fija; el resto, nada;
  - durante el capítulo 17, su cabecera dice «Sin señal» y no contesta. Después del final dice «Canal cerrado».
- **ME-10.** El chat rápido de la escena sigue hablando solo con tu compañero.

### 3.7 Hablar con los vecinos (VI, D-234, RV-01 a RV-05)
- **VI-01. Con IA activada**, puedes escribir a cualquier vecino que ya te haya escrito.
  - **Cada vecino tiene su propio límite: 3 mensajes tuyos al día.** Son independientes: 3 con Dex, 3 con Lía, 3 con Teo…
  - **No gastan créditos.** Los 25 del día son solo para tu compañero.
  - Debajo del campo: «Te quedan 2 mensajes con Dex hoy». Agotados: «Dex ya no contesta hoy. Mañana seguís.»
  - El límite se cuenta en el servidor, por código, vecino y día.
- **VI-02. Qué recibe la IA de un vecino:**
  - su ficha: quién es, a qué se dedica y cómo habla;
  - **lo que él sabe en este capítulo** y nada más (`cimientos.md` §5), elegido en el servidor a partir del número de capítulo;
  - los últimos 20 mensajes de su chat contigo, incluidos los de la historia;
  - de ti, solo lo que se ve desde la calle: tu alias, tu título, cuántos días llevas y si hoy has cumplido.

  No recibe tus actividades, tus objetivos ni la memoria del compañero. Lo que sepa de tu vida es lo que tú le cuentes.
- **VI-03. Sus reglas:**
  - habla como en un chat: de 1 a 3 frases, sin listas;
  - opina, duda o no te cree, con su carácter;
  - **no confirma nada de la historia que no le toque** (RV-04) y no inventa hechos (RV-02);
  - si no sabe algo, lo dice con naturalidad (RV-03);
  - nada de diagnósticos de salud, como el compañero.
- **VI-04. Lo que escribe la IA no hace avanzar la historia** ni desbloquea nada. Es conversación.
- **VI-05. Sin IA o sin conexión:**
  - los mensajes de la historia llegan igual;
  - sin IA activada (sin código), en lugar del campo de escribir: «Para hablar con {nombre}, activa la IA». Los mensajes de prueba sin código son solo para el compañero;
  - sin conexión, el mensaje no se envía y se avisa debajo del campo, como en el chat del compañero.
- **VI-06. El compañero con IA** también recibe el número de capítulo y lo que él sabe en ese punto. Puede comentar la historia contigo, pero no adelanta nada. Sigue gastando sus créditos, como hoy.
- **VI-07. Los vecinos que hablan al pasar** (spec 11) siguen igual. Cambian sus fichas, para que coincidan con la historia (Lía trabaja en soporte de interfaces; Teo lleva el nodo del barrio).

### 3.8 Sombra en la calle (SO, D-219, D-225, D-229, D-231)
- **SO-01.** Para quien investiga, Sombra deja de llegar con el nivel 10. Su presencia depende del capítulo:

  | Momento | En la calle | En su chat |
  |---|---|---|
  | Antes del capítulo 10 | No está | No existe |
  | Capítulo 10, tras la transmisión | Aparece **junto al farol**, sin moverse y tenue | Aparece, sin que lo añadas |
  | Capítulos 11 a 16 | Igual | Escribe a veces |
  | Capítulo 17 | Desaparece | «Sin señal» |
  | Capítulo 18 | Vuelve, más tenue y con parpadeos | Vuelve a escribir |
  | Capítulo 20, tras la transmisión | Nítido por primera vez | — |
  | Final del capítulo 20 | Hace un glitch y **desaparece para siempre** (EP-06) | Se queda, con todo lo que dijo. «Canal cerrado» |

- **SO-02. Solo lo ves tú.** No pasea, y los vecinos, los autos y los drones pasan a través de él.
- **SO-03.** Deja de hablar al pasar (spec 11): sus tres frases de hoy pasan a su chat.
- **SO-04. En «Tu ciudad»** su ficha dice «Solo lo ven {compañero} y tú», y al final, «Canal cerrado».
- **SO-05. Quien ya lo tiene en su calle** y elige «Investigar»: se va de la calle en ese momento y vuelve en el capítulo 10. El compañero lo nota: «¿Y el de la capucha? Hace días que no lo veo.»
- **SO-06. Quien bloquea la señal** lo tiene como hoy: llega con el nivel 10, pasea y habla al pasar.

### 3.9 Pruebas del programa (PR, D-215, D-235)
Son las misiones que manda el programa. En la historia se llaman «pruebas».

- **PR-01. Cuándo llegan.**
  - La primera llega con el capítulo 3, justo después de la sesión 2. La última, antes del capítulo 20.
  - Después, **una por tramo**, entre el segundo y el cuarto día. Si el tramo se alarga, otra cada 7 días.
  - Una a la vez, y nunca con un descanso planificado en los 7 días siguientes.
  - Llegan de repente, como los capítulos (RI-06).
- **PR-02. Las escribe la IA, después de analizar tu comportamiento.** La app prepara un resumen de tus últimos 28 días y se lo envía:
  - cada actividad: nombre, categoría, cada cuánto toca, cuánto la cumples y qué días fallas;
  - qué categoría va por detrás;
  - tus objetivos y cómo van;
  - tus misiones pendientes;
  - las tres últimas pruebas y cómo acabaron, para no repetir;
  - el acto de la historia, que marca la exigencia: 3 días en el acto I, 5 en el II y hasta 7 en el III.
- **PR-03. Qué puede pedir.**
  - Algo que ya haces, justo donde más te cuesta.
  - O **algo nuevo que complemente lo que quieres lograr**, aunque no lo tengas creado. Si tu objetivo es correr 5 km, puede pedirte estirar diez minutos después de cada salida.

  Lo que devuelve la IA:

  | Campo | Límite |
  |---|---|
  | Objetivo, en infinitivo | 60 caracteres |
  | Detalle | 140 caracteres |
  | Cuántos días hay que hacerlo | De 1 a 7 |
  | Plazo | 7 días como mucho |
  | Actividad tuya en la que se apoya | Opcional |

- **PR-04. Lo que la IA no puede pedir:**
  - nada con riesgo para la salud, dietas ni ayunos;
  - nada que cueste dinero;
  - nada que dependa de otra persona;
  - nada que no se pueda contestar con «hecho» o «no hecho»;
  - nada sobre la historia.

  El servidor comprueba el formato y los límites. Si la respuesta no vale, se pide otra una vez. Si tampoco vale, se usa una prueba fija (PR-05).
- **PR-05. Sin IA activada, sin conexión o si la IA falla,** la prueba sale de esta lista, eligiendo con tus registros:

  | Tipo | Qué pide | Se elige cuando |
  |---|---|---|
  | Días completos | Cumplir todo lo diario N días seguidos | Tus días completos son pocos |
  | La que más cuesta | Hacer N días de 7 la actividad que menos cumples | Una actividad queda muy por debajo del resto |
  | Sin días en blanco | Registrar algo cada día durante 7 días | Tienes días sin nada |
  | Semana redonda | Llegar al objetivo de todas tus actividades semanales | Tienes actividades semanales a medias |
  | Área débil | Cumplir todo lo de tu categoría más baja N días de 7 | Un atributo va por detrás |
  | Misiones al día | Completar a tiempo todas las misiones que vencen esta semana | Tienes 2 o más con fecha |
  | Tu mejor semana | Superar tu mejor semana de las últimas 8 | Todo lo demás va bien |

  **La prueba 1 sale siempre de esta lista,** apoyada en una actividad tuya: el capítulo 4 necesita que se compruebe sola.
- **PR-06. Cómo llega.** Una interferencia breve sobre Hoy, el punto rojo y el compañero: «Ha entrado una prueba por el canal.» En «???», una tarjeta. El marco es texto fijo; el objetivo y el detalle son de la IA:

  > Prueba 7. Objetivo: estirar diez minutos después de cada salida. Tres días. Plazo: 7 días. Valor: 100 XP. La aceptación es voluntaria. El rechazo también será registrado.

  Con dos botones: **Aceptar** y **Rechazar**. Solo se guarda como misión si la aceptas.
- **PR-07. Aceptada,** aparece en Hoy, junto a tus misiones, con la marca roja de la señal, su avance («2 de 3 días») y los días que quedan. No se puede editar.

  | La prueba… | Cómo avanza |
  |---|---|
  | se apoya en una actividad tuya, o es de la lista fija | Sola, con tus registros |
  | pide algo nuevo | Con un botón «Hecho hoy», una vez al día. Se puede deshacer ese mismo día |

- **PR-08. Superada:**
  - **+100 XP**, que cuentan para el nivel. No cuentan para los atributos, la Disciplina ni la vara del tramo (RI-05);
  - **es el pase del tramo:** el capítulo siguiente ya no necesita la vara, solo que pasen los 7 días (RI-02);
  - el Marco, en «???»: «Prueba 7: superada. Registrado.»;
  - un fragmento del archivo (PR-10).

  Lo superado no se pierde aunque después borres registros.
- **PR-09. Si no sale:**

  | Caso | Qué dice el Marco | Coste |
  |---|---|---|
  | Rechazas | «Rechazo registrado.» | Ninguno |
  | No contestas en 3 días | «Prueba 7: sin respuesta. Registrado.» | Ninguno |
  | Se acaba el plazo | «Prueba 7: no superada. Registrado.» | Ninguno |

  Ni XP ni Disciplina bajan nunca por una prueba (M-21). Sin pase, el capítulo espera a la vara, como si no hubiera habido prueba.
- **PR-10. Fragmentos del archivo** (H-03).
  - Cada prueba superada descifra una entrada del archivo, por ejemplo: «Participante 4012. Abandonó el día 19.»
  - Hay 30, escritas de antemano y en orden. Cada una dice a partir de qué capítulo puede salir, para no adelantar nada (§9 de `cimientos.md`).
  - Hasta el capítulo 8 las guarda el compañero, sin poder leerlas. En el 8, Teo las descifra todas. Desde entonces llegan al chat de Teo.
- **PR-11. Generar una prueba no gasta créditos.** El servidor admite una cada 5 días por código.
- **PR-12. Sin pruebas se ve la historia entera.** Quien las rechace todas avanza solo con la vara y tiene menos fragmentos (H-05).

### 3.10 Expediente ORIGEN (EX, H-04)
- **EX-01.** Una fila fija en la lista de chats, «Expediente ORIGEN», desde el capítulo 2.
- **EX-02. Qué reúne:**
  - **Capítulos:** los vistos, con su título, su fecha y la pregunta que dejó abierta; los que faltan, como «Capítulo 13 · ???»;
  - **Pistas:** una tarjeta por cada pieza que ha aportado un vecino, con una frase y un enlace a su chat;
  - **Fragmentos:** las entradas del archivo descifradas;
  - **Registro de pruebas:** cuántas superadas, no superadas y rechazadas.
- **EX-03. «Señal descifrada»**, en porcentaje: 3,5 puntos por capítulo (70 en total) y 1 por fragmento (30 en total).
- **EX-04.** Al acabar la temporada, desde aquí se vuelve a ver el epílogo.

### 3.11 El capítulo 20: transmisión, epílogo y escena final (EP, D-228, D-229, D-231)
- **EP-01. Orden:**
  1. Sesión 10, solo audio: el Marco cierra el programa y la Instancia habla libre.
  2. Vuelve tu calle. El compañero dice su frase. Sombra, nítido, levanta una mano.
  3. La calle se funde a negro y empieza el **epílogo**.
  4. Vuelve tu calle y arranca la **escena final**.
- **EP-02. El epílogo «En el futuro»:**
  - fondo negro, el título y el texto de `historia.md`, que sube despacio como unos créditos;
  - sin voz;
  - música: **«Glass and Gravity»**, entera (2 min 52 s). El texto está repartido en marcas de tiempo sobre la pista, y la última línea llega unos 15 s antes del final;
  - una línea lleva **tus días reales**, del primer contacto a este capítulo: «En el pasado, alguien había tardado 163 días en ganarla.»;
  - el archivo de audio se descarga junto con la sesión 10 (TR-06).
- **EP-03. Sonido del epílogo:** sigue el interruptor de Efectos, como la voz. Sin sonido, el texto sube al mismo ritmo.
- **EP-04. Con «Reducir movimiento»,** el texto no sube: cada párrafo aparece y se va con un fundido.
- **EP-05.** No se puede saltar la primera vez. Si cierras la app, en la siguiente apertura continúa desde el principio del epílogo, no desde la transmisión.
- **EP-06. La escena final** avanza sola, sin tocar, y dura menos de un minuto:

  | # | Qué se ve |
  |---|---|
  | 1 | Tu calle. Entran, como avisos, los siete mensajes de Teo sobre el archivo y el Emisor 0000 |
  | 2 | Se abre el chat de Sombra: «{compañero}, por ti: ¿Qué sabes de esto?» · «escribiendo…» · «Yo creía que el programa era mío.» |
  | 3 | Vuelve la calle. Sombra hace un glitch, dos veces, con su sonido, y **desaparece**. El farol alumbra la acera vacía durante 2 s |
  | 4 | El compañero: «Se ha cerrado. El canal con el futuro. Ya no hay nadie al otro lado.» |
  | 5 | Un aviso de «???», con la etiqueta en lavanda, no en rojo: «Línea 6174: registrada.» Tres segundos sin nada |
  | 6 | El compañero: «…Eso no era él.» |
  | 7 | «Fin de la temporada 1» |

  Todos esos mensajes quedan en sus chats. Nada anuncia antes que Sombra se va a ir.
- **EP-07. Después:**
  - no llegan más sesiones ni pruebas;
  - Sombra no vuelve a la calle (SO-01);
  - «Glass and Gravity» se añade a tu música (MU-05);
  - los niveles y los tramos siguen como siempre.

### 3.12 Música (MU, D-210, D-236)
- **MU-01.** En la pantalla de bloqueo, el álbum pasa de «ARVID» a **«Our Signal»**.
- **MU-02. Al empezar solo hay tres canciones:** las tres primeras de la lista (hoy, «Midnight Sector Drive», «Glass Tower Horizon» y «Black Chrome Horizon»).
- **MU-03. Las bloqueadas se ven en la lista, sin decir qué son:**
  - la portada, en blanco y negro;
  - donde va el nombre, «???», que de vez en cuando hace un glitch;
  - no se pueden reproducir, y «siguiente», «anterior» y el modo aleatorio se las saltan;
  - no se descargan hasta que se desbloquean;
  - con «Reducir movimiento», «???» quieto.
- **MU-04. Se desbloquean al avanzar,** en el orden de la lista, una cada tres tramos:

  | Al abrirse el capítulo | Canción |
  |---|---|
  | 3 | Chrome Horizon Drive |
  | 6 | Rain on the Expressway |
  | 9 | Afterglow Avenue |
  | 12 | Night Lift |
  | 15 | Static Dreams |
  | 18 | Last Outpost |

  - Quien bloqueó la señal las recibe al mismo ritmo, al completar los tramos 2, 5, 8, 11, 14 y 17 (RI-10).
  - Una canción nueva que se añada a la app llevará su capítulo.
- **MU-05. «Glass and Gravity»** no está en la lista hasta que termina el epílogo. Es solo para quien acaba la historia.
- **MU-06. Cómo te enteras:** un aviso con la portada, que pasa de blanco y negro a color, y el nombre: «Canción nueva: Night Lift».
- **MU-07. Quien ya usa la app** se queda también con las tres primeras al actualizar. Si estaba sonando una que se bloquea, pasa a la primera.

### 3.13 Quien ya usa la app y otros casos (UA)
- **UA-01. Usuarios actuales.** El primer contacto llega en el primer minuto de la primera sesión tras actualizar, con las reglas de PC-01, y después la pregunta (DE).
- **UA-02. Igual que todos.** Empiezan por el capítulo 1, sea cual sea su nivel. Solo cuenta la XP que ganen **después del hackeo**: la de la primera semana marca la vara de la segunda, y así sucesivamente (RI).
- **UA-03. Backup y cuenta.** El avance de la historia, los tramos y las pruebas viajan en la copia. Al restaurar no se repite el primer contacto. Una copia antigua sin historia se trata como un usuario actual.
- **UA-04. Cambios a mitad de historia:**
  - de idioma: textos y voz pasan al idioma nuevo;
  - de género: la voz cambia desde la siguiente sesión;
  - de compañero: los textos nuevos usan su nombre, y lo ya dicho conserva quién lo dijo.
- **UA-05. Cambiar la fecha del dispositivo** no adelanta nada que ya se haya abierto ni lo cierra. Se acepta que alguien se salte la espera así: se engaña a sí mismo.

### 3.14 Ajustes (AJ)
- **AJ-01.** En Ajustes → Compañero, un interruptor **«Historia»**. Refleja lo que elegiste en la pregunta (DE).
  - Apagado: no llegan capítulos, transmisiones ni pruebas, y la app queda como en DE-03. Lo ya recibido no se borra: vuelve a verse al encenderlo.
  - Al encenderlo, la historia sigue por donde iba: el siguiente capítulo llega cuando se cumple el tramo en curso.
  - No evita el primer contacto: ocurre antes de que nadie llegue a Ajustes.

## 4. Datos
| Dónde | Qué | En el backup |
|---|---|---|
| Ajuste `origen` | `{ choice?: 'investigate' \| 'block', contactAt?, periods: [{ openedOn, xpAtOpen, target }], steps: { [paso]: fecha }, sessions: { [n]: fecha }, fragments: número, read: { [chat]: fecha }, seasonEndAt? }` | Sí |
| Tabla nueva `origenTests` | `{ id, n, source: 'ai' \| 'fixed', type?, title, detail, times, activityId?, marks: fecha[], offeredOn, acceptedOn?, deadline?, result?: 'passed' \| 'failed' \| 'rejected' \| 'ignored', resolvedOn? }` | Sí |
| Tabla nueva `messages` | Conversación libre: `{ id, chat, at, from: 'user' \| 'character', text }`, con índice por chat y fecha | Sí (ME-07) |
| Ajuste `chatLog` | El chat del compañero, como hoy | No (sin cambios) |
| Función `arvid` | Momento `neighborChat`, con `neighbor` y `chapter`: 3 al día por código y vecino, sin créditos. Momento `origenTest`: una cada 5 días por código, sin créditos. El compañero recibe `chapter` | — |

- El esquema de Dexie pasa a la **versión 6**, con las dos tablas nuevas y vacías. Lo anterior no cambia.
- **En la 2.5.0** (D-245): las pruebas se guardan dentro del ajuste `origen` (`tests`), que ya viaja en el backup; la tabla `origenTests` y la versión 6 de Dexie llegan cuando haga falta (la conversación libre de `messages`, en la 2.7.0). Los chats de los vecinos no tienen campo de escribir hasta entonces.
- Lo que se puede calcular no se guarda: los mensajes de la historia, el capítulo actual, las pistas, el porcentaje del Expediente, dónde está Sombra y qué canciones están desbloqueadas salen de `periods` y `steps`.
- La XP de las pruebas se calcula a partir de `origenTests`, aparte de la de las misiones: no toca la Disciplina.
- Módulos nuevos:
  - `src/domain/origen/`: tramos y vara, capítulos y pasos, pruebas (resumen de comportamiento, validación, lista fija, avance), fragmentos, qué sabe cada personaje. Puro y con pruebas;
  - `src/app/origen/`: primer contacto, la pregunta, transmisión, epílogo, escena final y el vigilante que abre capítulos y entrega pasos;
  - `src/app/chats/`: lista y conversaciones.
- Archivos:
  - `public/senal/`: las voces (10 sesiones × 3 voces) y «Glass and Gravity»;
  - las marcas de tiempo de los subtítulos y del epílogo, en `src/domain/origen/`.

## 5. Requisitos no funcionales
- **NFR17-01. Sin conexión** funciona todo menos hablar con los vecinos, generar una prueba con IA (sale una fija) y descargar una sesión o una canción que aún no esté en el dispositivo.
- **NFR17-02. La IA nunca escribe en la base de datos por su cuenta** ni decide nada de la historia. Una prueba solo se guarda cuando la aceptas.
- **NFR17-03. Coste de IA.** La historia, 0 llamadas. Por código y día, como mucho: 25 del compañero (como hoy), 3 por vecino (30 con los diez) y, cada 5 días, una prueba.
- **NFR17-04. Privacidad:**
  - a la IA de un vecino solo se le envía lo indicado en VI-02;
  - para escribir una prueba se envía el resumen de PR-02, al mismo proveedor y con las mismas condiciones que el chat del compañero. Sin tu alias y sin tus conversaciones.
- **NFR17-05. Peso:** la app instalada crece como mucho 1,5 MB (la sesión 1 en tres voces). El resto se descarga según haga falta.
- **NFR17-06.** Las secuencias van a 60 fps en un celular de gama media. Las capas y el audio se preparan antes de que empiece el corte.
- **NFR17-07.** Todos los textos van en `es.json` y `en.json`. El español es el latino (es-419), como el resto de la app desde la 2.4.0: «ustedes», «celular», «auto», «farol», «toca» (D-244).
- **NFR17-08. Licencias:** el sprite, las voces y la pista quedan registrados en `asset-licenses.md` como material aportado por el responsable.
- **NFR17-09. Para probar sin esperar,** en desarrollo: `?origen=contacto`, `cap:N`, `tramo` (da por cumplido el tramo), `prueba`, `epilogo` y `final`. En producción no hacen nada.
- **NFR17-10. Por versiones.** Cada versión activa lo suyo (§8). Si alcanzas un capítulo que aún no se ha publicado, la historia espera sin avisos; los tramos siguen contando y las pruebas del programa siguen llegando.

## 6. Ejemplos (Given/When/Then)
**PC-01 · Primer minuto**
- Given acabas de terminar el onboarding, en el navegador o en la app instalada
- When llevas 23 s en Hoy (el momento sorteado)
- Then la pantalla se rompe, aparece el buscador, alguien escribe «Programa Origen», corte a negro y la sesión 1 con tu voz. Al terminar vuelves a Hoy, ARVID reacciona y te pregunta qué hacen

**DE-03 · Bloquear**
- Given ARVID acaba de preguntar
- When eliges «Bloquear la señal»
- Then no aparece «???», no llegan capítulos ni pruebas y el botón del chat abre el de ARVID, como hoy

**RI-02 · El tramo normal**
- Given el capítulo 3 se abrió el lunes; en el tramo anterior ganaste 320 XP
- When el lunes siguiente llevas 340 XP en este tramo y abres la app
- Then entre 5 y 30 s después llega el capítulo 4. La vara del tramo siguiente es 340

**RI-02 · Semana floja**
- Given la vara es 320 XP y a los 7 días llevas 180
- When llegas a 320 el día 12
- Then el capítulo llega ese día, a los pocos segundos de registrar la actividad

**RI-02 · El pase**
- Given la vara es 320 XP, llevas 150 y aceptaste la prueba del tramo
- When la superas el quinto día
- Then el capítulo llega el séptimo, por sorpresa, sin haber llegado a la vara. La vara siguiente es la XP de este tramo sin los 100 de la prueba (con el mínimo de 50)

**RI-04 · Semana excepcional**
- Given la vara era 320 XP y en este tramo ganaste 700
- When se abre el capítulo siguiente
- Then la vara nueva es 400 (un 25 % más), no 700

**VI-01 · Límite por vecino**
- Given hoy le has escrito 3 mensajes a Dex
- When intentas escribirle otro
- Then «Dex ya no contesta hoy. Mañana seguís.» A Lía puedes escribirle, y tus 25 créditos con ARVID siguen intactos

**PR-03 · Prueba nueva**
- Given tu objetivo es correr 5 km y casi nunca estiras
- When llega la prueba 7
- Then pide «Estirar diez minutos después de cada salida», tres días, con plazo de 7. Si la aceptas, aparece en Hoy con «Hecho hoy»

**PR-09 · Prueba no superada**
- Given aceptaste una prueba de 5 días y el plazo termina con 3
- When abres la app al día siguiente
- Then «Prueba 7: no superada. Registrado.» Tu XP, tu Disciplina y la fecha del próximo capítulo no cambian

**UA-02 · Usuario con nivel 12**
- Given usas la app desde hace meses y actualizas
- When la abres
- Then en el primer minuto llega el hackeo y ARVID pregunta. Si investigas, Sombra se va de tu calle, te quedan tres canciones y el capítulo 2 llega a la semana, si ganas al menos 50 XP

**MU-04 · Canción nueva**
- Given en tu lista hay cuatro canciones y cinco filas con «???»
- When llega el capítulo 6
- Then, al terminar su primer paso, aviso «Canción nueva: Rain on the Expressway», y en la lista su portada pasa a color

**EP-06 · Final**
- Given acaba de terminar el epílogo
- When vuelve tu calle
- Then escribe Teo, ARVID pregunta a Sombra, Sombra contesta, hace un glitch y desaparece; ARVID dice que se ha cerrado el canal con el futuro; entra «Línea 6174: registrada.» y ARVID dice «…Eso no era él.»

## 7. Riesgos
- **R17-1 · La réplica de Google usa la marca de otra empresa** en una app pública. Decisión del responsable (D-211). *Mitigación:* dura unos 10 s, no es interactiva y no hay enlaces. Queda preparado un buscador neutro, sin nombre ni logo, que se activa con un cambio de una línea si hiciera falta.
- **R17-2 · El hackeo puede parecer un fallo real o asustar.** *Mitigación:* el compañero confirma enseguida que él también lo vio y da a elegir (DE); no se pide ningún dato; con «Reducir movimiento» no hay interferencias.
- **R17-3 · En el navegador, la barra de direcciones delata la ilusión del buscador.** Se acepta (D-232): el hackeo ya no espera a que la app esté instalada.
- **R17-4 · Secuencias largas sin «Saltar».** El capítulo 20 dura unos 6 minutos entre transmisión, epílogo y final. *Mitigación:* si cierras, continúa después desde el tramo donde ibas (EP-05), y un capítulo nunca empieza encima de otra cosa.
- **R17-5 · Audio en iPhone:** en silencio no suena, y no suena nada antes del primer toque. *Mitigación:* los subtítulos lo cuentan todo (PC-09) y el reloj espera a ese toque (PC-01).
- **R17-6 · La vara no baja nunca.** Quien baja el ritmo tarda más en cada capítulo, para siempre, hasta que recupere una semana como las de antes. Es lo pedido (D-233). *Mitigación:* el mínimo y el tope de RI-04, y la prueba del programa de cada tramo, que sirve de pase (RI-02).
- **R17-7 · Quien bloquea la señal por error** se queda sin historia. *Mitigación:* el interruptor de Ajustes (AJ-01) y la frase del compañero (DE-03).
- **R17-8 · Una prueba escrita por la IA puede ser absurda, repetida o inadecuada.** *Mitigación:* límites y prohibiciones (PR-03, PR-04), validación en el servidor, la lista fija como reserva, y siempre se puede rechazar sin coste.
- **R17-9 · Un vecino con IA rompe la ficción o adelanta algo.** *Mitigación:* VI-02 a VI-04: el servidor solo le da lo que sabe en ese capítulo; lo que escribe no cambia la historia; el Marco y Sombra no usan IA.
- **R17-10 · Coste de IA:** un código puede pasar de 25 a 55 llamadas al día. *Mitigación:* los límites están en el servidor (NFR17-03) y son ajustables.
- **R17-11 · A quien ya usa la app se le bloquean canciones que tenía** y se le va Sombra. *Mitigación:* la entrada de Novedades lo explica como parte del juego; las canciones vuelven una a una (MU-04).
- **R17-12 · Quien registra con retraso** puede superar una prueba o un tramo a posteriori. Se acepta: la app ya permite imputar el día anterior.
- **R17-13 · Volumen de contenido:** veinte capítulos en dos idiomas y diez sesiones en tres voces, en tres voces. *Mitigación:* entrega por versiones (§8).

## 8. Plan de entrega
Una versión por bloque, de la 2.4.0 a la 3.0.0. La **3.0.0** completa la temporada: la app con la historia entera y jugable.

| Versión | Qué lleva | Qué hace falta del responsable |
|---|---|---|
| **2.4.0** | Primer contacto, la pregunta, lista de chats y «???». Capítulo 1. Álbum «Our Signal» | — (la sesión 1 ya está grabada) |
| **2.5.0** | Tramos y **acto I** (capítulos 2 a 5), con los mensajes de los vecinos. Pruebas del programa de la lista fija, con su pase, y fragmentos | Voces de las sesiones 2 y 3 |
| **2.6.0** | Pruebas del programa escritas por la IA. Expediente ORIGEN | — |
| **2.7.0** | Hablar con los vecinos con IA. Música bloqueada que se desbloquea al avanzar | — |
| **2.8.0** | **Acto II** (capítulos 6 a 10): giro 1 y Sombra | Voces de las sesiones 4, 5 y 6 |
| **2.9.0** | **Acto III, primera parte** (capítulos 11 a 16): solo audio | Voces de las sesiones 7 y 8 |
| **3.0.0** | **Acto III, final** (capítulos 17 a 20): epílogo, escena final y «Glass and Gravity» | Voces de las sesiones 9 y 10 |

- Cada versión lleva su entrada en Novedades, sin destripar nada.
- Margen: nadie recibe el capítulo 2 antes de 1 semana tras el hackeo, el 6 antes de 5, el 11 antes de 10 ni el 17 antes de 16. Si alguien alcanza un capítulo sin publicar, la historia espera sin avisos (NFR17-10).
- La 2.4.0 deja al jugador al menos una semana sin capítulo 2, como en el ritmo normal: conviene que la 2.5.0 salga dentro de esa semana.

## 9. Decisiones de esta spec
A = decidida o aprobada por el responsable (D-243).

| ID | Propuesta | Tipo |
|---|---|---|
| S17-01 | Primer contacto con la secuencia y los tiempos del prototipo (D-211) | A |
| S17-02 | Voz grabada de corrido, subtítulos que avanzan solos, filtro AM, tres voces (D-212) | A |
| S17-03 | Diez sesiones; solo audio desde la séptima (D-220) | A |
| S17-04 | Un chat por personaje; lo suyo no se borra y lo tuyo sí; el compañero contesta por ti (D-226) | A |
| S17-05 | Pruebas con mucha XP, a tu medida (D-215) | A |
| S17-06 | Epílogo como unos créditos con «Glass and Gravity», y después la escena final en la que Sombra desaparece (D-228, D-229) | A |
| S17-07 | Álbum «Our Signal» (D-210) | A |
| S17-08 | El primer contacto ocurre tras el onboarding, sin necesidad de instalar la app (D-232) | A |
| S17-09 | Los capítulos van por tramos: 7 días y la misma XP que en el tramo anterior, o superar la prueba del tramo; el nivel no cuenta; llegan de repente, entre 5 y 30 s (D-233, D-241) | A |
| S17-10 | Quien ya usa la app juega igual que todos, contando la XP desde el hackeo (D-233) | A |
| S17-11 | Cada vecino, 3 mensajes al día, independientes; los 25 créditos son solo para el compañero (D-234) | A |
| S17-12 | Las pruebas las escribe la IA tras analizar tu comportamiento, y pueden ser cosas nuevas (D-235) | A |
| S17-13 | Al empezar solo hay tres canciones; las demás se desbloquean al avanzar y se ven en blanco y negro y sin nombre (D-236) | A |
| S17-14 | Tras el hackeo, el compañero pregunta si seguir; si no, la app queda como hoy (D-237) | A |
| S17-15 | Se entrega por versiones, de la 2.4.0 a la 3.0.0; la 3.0.0 completa la temporada (D-239) | A |
| S17-16 | Final: nadie dice que se queda en esta línea; Sombra, que es la Instancia, hace un glitch y se va cuando se cierra el canal, y el compañero lo dice (D-231, D-238) | A |
| S17-17 | El minuto del primer contacto: entre los 6 y los 55 s; nunca encima de otro aviso (PC-01) | A |
| S17-18 | Texto de la pregunta y botones «Investigar» y «Bloquear la señal» (DE-01) | A |
| S17-19 | La vara es **toda** la XP del tramo anterior, aunque durase más de una semana; por eso nunca baja (RI-03) | A |
| S17-20 | Mínimo de 50 XP y tope de subida del 25 % (RI-04) | A |
| S17-21 | La XP de las pruebas no cuenta para la vara, pero superar la prueba es el pase del capítulo (RI-02, RI-05, D-241) | A |
| S17-22 | Nada avisa de cuándo llega el próximo capítulo (RI-08, D-242) | A |
| S17-23 | La ciudad sigue por nivel; un vecino que el capítulo necesita llega con él (RI-09) | A |
| S17-24 | La voz y la música del epílogo siguen el interruptor de Efectos; sin sonido, subtítulos (PC-09, EP-03) | A |
| S17-25 | Con «Prefiero no decirlo», la voz es la de tu protagonista (TR-05) | A |
| S17-26 | La sesión 1 va con la app; las demás se descargan un capítulo antes (TR-06) | A |
| S17-27 | Sin «Saltar» la primera vez en ninguna sesión ni en el epílogo; al volver a verlas se pueden cerrar (TR-07, EP-05) | A |
| S17-28 | Los capítulos se reparten en pasos con esperas, y caben en 5 días (CA-02) | A |
| S17-29 | El botón del chat abre una lista de conversaciones; los contactos aparecen cuando te escriben (ME-01, ME-02) | A |
| S17-30 | La conversación libre con los vecinos viaja en el backup, con 300 mensajes por chat; la del compañero sigue sin viajar (ME-07) | A |
| S17-31 | Sombra contesta una de cada cinco veces, con frases fijas (ME-09) | A |
| S17-32 | Hablar con los vecinos requiere IA activada con código; los mensajes de prueba son solo para el compañero (VI-05) | A |
| S17-33 | La IA de un vecino solo ve de ti lo que se ve desde la calle (VI-02) | A |
| S17-34 | Sombra se queda junto al farol, tenue, y deja de hablar al pasar (SO-01 a SO-03) | A |
| S17-35 | A quien ya tiene a Sombra se le va al elegir «Investigar» y vuelve en el capítulo 10; quien bloquea lo conserva (SO-05, SO-06) | A |
| S17-36 | Una prueba por tramo, entre el segundo y el cuarto día (PR-01) | A |
| S17-37 | Qué se envía a la IA y qué no puede pedir (PR-02 a PR-04) | A |
| S17-38 | Sin IA o si falla, la prueba sale de la lista fija de siete tipos; la prueba 1, siempre (PR-05) | A |
| S17-39 | Las pruebas nuevas se marcan con «Hecho hoy»; las que se apoyan en una actividad avanzan solas (PR-07) | A |
| S17-40 | 100 XP por prueba, solo para el nivel; rechazar, ignorar o no superar no cuesta nada (PR-08, PR-09) | A |
| S17-41 | Generar una prueba no gasta créditos; una cada 5 días por código (PR-11) | A |
| S17-42 | 30 fragmentos escritos de antemano (PR-10) | A |
| S17-43 | Expediente ORIGEN en la lista de chats, con «Señal descifrada»: 70 puntos de capítulos y 30 de fragmentos (EX) | A |
| S17-44 | La escena final avanza sola, mezclando avisos, chats y la calle; se mantiene el pulso «Línea 6174: registrada» (EP-06, D-238) | A |
| S17-45 | Los tiempos de los mensajes y del epílogo salen de lo que lleva cada jugador (CA-07, EP-02, D-240) | A |
| S17-46 | Donde va el nombre de una canción bloqueada, «???» con un glitch ocasional (MU-03) | A |
| S17-47 | Una canción cada tres tramos, en el orden de la lista; quien bloqueó la señal las recibe igual (MU-04) | A |
| S17-48 | «Glass and Gravity» solo para quien termina la historia (MU-05) | A |
| S17-49 | A quien ya usa la app también se le bloquean las canciones al actualizar (MU-07) | A |
| S17-50 | Interruptor «Historia» en Ajustes → Compañero (AJ-01) | A |
| S17-51 | Qué lleva cada versión, de la 2.4.0 a la 3.0.0 (§8) | A |
| S17-52 | Cómo se escribe `{tiempo}`: días, semanas, meses o «un año» (CA-07) | A |
