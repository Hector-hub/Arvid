# Spec 17 · Cimientos — Programa ORIGEN (biblia de la historia)

Estado: **aprobado** (2026-11-10). La participación de los vecinos (§4.1 a §4.4) y el epílogo (§7.6) se aprobaron después, ese mismo día, con un cambio: Sombra desaparece al final (§7.5). **Revisado el 2026-11-11** (D-231 a D-243): el ritmo ya no va por nivel sino por tramos de una semana y experiencia, las pruebas las escribe una IA, la música se desbloquea al avanzar, la historia se elige tras el primer contacto y el final se simplifica
Decisiones que recoge: D-211 a D-243
Sustituye a: el arco de FR-06 de `spec.md`, que queda obsoleto hasta reescribirlo. La narración capítulo a capítulo está en `historia.md`.

Este documento **no describe pantallas ni código**. Fija lo que sostiene la historia: las reglas del mundo, quién sabe qué, los dos giros, los capítulos y lo que nadie puede decir antes de tiempo. De aquí salen después `historia.md` (la narración), los guiones de las transmisiones y `spec.md` (la funcionalidad).

Los textos entre «comillas» son borradores de tono, no el guion final.

## 1. Objetivo

Que cumplir hábitos y descifrar un enigma sean **la misma acción**.

- La historia se desbloquea por capítulos, como una serie: cada capítulo contesta una pregunta y abre otra.
- Tiene **dos giros**: quién está detrás del programa (capítulo 10) y qué consiguió en realidad (capítulo 20).
- Estos veinte capítulos son la **temporada 1**. Cierra su arco entero y termina con un **epílogo** que cuenta qué fue del que envió la señal (§7.6) y con **un enigma abierto** sobre el universo, que es el material de la temporada 2 (§7.5).
- Los vecinos de la ciudad tienen un papel, y entran en la historia **por su propia vida**, no porque conozcan la tuya (§4.3).
- La historia entretiene y motiva; **nunca cambia las reglas de la app ni castiga**.

## 2. La premisa en cinco frases

1. Una señal desconocida te inscribe en el **Programa ORIGEN**, un «protocolo experimental de desarrollo del potencial humano», como el participante **6174**.
2. Quien habla no es una persona ni una grabación: es **una copia de la conciencia de tu yo del futuro**, encerrada en un programa que la obliga a seguir el protocolo y le prohíbe decir quién es.
3. Tu yo del futuro cree que, si tú cambias, su vida cambiará.
4. Lo descubres tú, con ARVID y los vecinos, antes de que nadie te lo confirme.
5. Cuando completas el programa, tu vida ha cambiado y la suya no: cambiar el pasado no corrige un futuro, crea otro. El tuyo.

Y una sexta, que es la puerta a lo siguiente: la cadena termina contigo, pero **alguien la empezó**, y no fue ninguna versión de ti.

## 3. Reglas del mundo (canon)

Estas reglas no se le explican al jugador de golpe. Son la verdad que hay debajo, y nada en la historia puede contradecirlas.

### 3.1 El tiempo
- **M-01.** Cambiar el pasado **no modifica el futuro que ya existe**: abre una línea nueva a partir del cambio.
- **M-02.** Nadie lo sabe. La hipótesis del programa es la contraria: «si el participante converge, la línea de origen cambia». Nunca se ha podido comprobar, porque **ningún participante ha completado el programa**.
- **M-02a.** En el mundo del operador tampoco lo sabe la ciencia: **no está confirmado que se pueda llegar al pasado, ni que hacerlo cambie el futuro**. El primer programa completado es la primera prueba de las dos cosas.
- **M-03.** Existe un canal de vuelta muy estrecho: el programa informa a la línea de origen del resultado («no convergente» o «convergente») y recibe de ella un único dato, si algo ha cambiado allí.
- **M-03a.** Los dos lados no viven el mismo tiempo. Para ti el programa dura meses. Para el operador, la respuesta llega **al terminar de cargar y enviar la señal**: una hora, cuarenta y dos minutos y cincuenta y cuatro segundos (6174 segundos). Lo que no fue cosa de horas es construirla: le llevó media vida.

### 3.2 Lo que viaja: la Instancia
- **M-04.** Por el canal no viajan mensajes. Viaja **la conciencia del operador, comprimida**, como los pesos de un modelo de IA. Se llama **la Instancia**.
- **M-05.** Por eso te conoce: es tú con más años. Sabe qué te cuesta, cuándo sueles abandonar y qué excusas usas. Sus pruebas aciertan porque las diseña alguien que ya fue tú.
- **M-06.** Es una copia, no una llamada. El operador original sigue en su línea y no oye nada de lo que pasa aquí, salvo el resultado final (M-03).
- **M-07.** La Instancia lleva dentro **el archivo**: el resultado de todos los intentos anteriores.
- **M-07a.** La Instancia solo puede ejecutarse aquí **mientras el canal con su línea (la 6173) siga abierto**. Cuando el programa se completa y envía el resultado, el canal se cierra, y lo que quede de ella en esta línea se apaga (§7.5).

### 3.3 El Marco
- **M-08.** La Instancia va encerrada en **el Marco**, el framework del programa. El Marco:
  - la obliga a seguir el protocolo (sesiones, evaluaciones, pruebas);
  - le pone la voz sintética, fría y controlada;
  - le prohíbe revelar quién es, qué es la cadena y para qué sirve el programa;
  - la hace **casi determinista**: siempre empuja hacia el mismo objetivo, mejorarte.
- **M-09.** El Marco no lo escribió una sola persona. **Cada operador añadió reglas** con lo que aprendió de su fracaso. Cada frase del protocolo es la cicatriz de un intento que salió mal («No intentes rastrear el origen de esta transmisión», «No interrumpas el proceso»).
- **M-10.** La regla del secreto tiene un motivo: en la cadena, el participante que supo demasiado pronto quién le hablaba **abandonó**. Ver en qué te conviertes, sin tener todavía pruebas de que puedes evitarlo, desanima.
- **M-11.** El Marco falla. Cuando falla, lo que se escapa es la Instancia: una palabra fuera de guion, un dato del archivo, una imagen. **Todo fallo de la señal es la conciencia asomando**, nunca un error al azar.

### 3.4 La cadena
- **M-12.** El operador fue el **participante 6173**. De joven recibió su propia señal, no completó el programa y, años después, envió la siguiente. Lo mismo hicieron los anteriores, uno tras otro.
- **M-13.** Todos los participantes son tú, cada uno en su línea. Todos acabaron «no convergentes».
- **M-14.** El operador **conoce la cadena y la oculta**. El Marco se lo exige (M-10).
- **M-15.** 6174 es la constante de Kaprekar: empieces por el número que empieces, la operación acaba en 6174 y ahí se queda. **No hay 6175.** Es el guiño de que esta vez termina.

### 3.5 Lo que hay antes de la cadena (el enigma)
- **M-15a.** El archivo empieza en el participante 0001. **Al 0001 también le llegó una señal**, y no pudo enviarla un participante anterior, porque no lo hubo.
- **M-15b.** Cada operador creyó que el programa era suyo. En realidad lo **heredó**: lo recibió de joven y lo reenvió con sus parches. Nadie de la cadena sabe quién escribió la primera versión.
- **M-15c.** Por encima del 0001 hay una entrada que no es un participante: **«Emisor 0000 · Línea: no registrada · Estado: a la escucha».** Sigue a la escucha.
- **M-15d.** Esto **no se resuelve en la temporada 1**; se guarda para la temporada 2.
- **M-15e.** Del futuro del operador solo se cuenta **lo que le pasó a él**, y solo en el epílogo (§7.6): envió la señal, recibió la respuesta, nada cambió, confirmó los datos y recibió el Nobel de Física. Su mundo no se describe, ni lo que ese mundo hace después con el descubrimiento.

### 3.6 El mundo, el vínculo y el canal
- **M-16.** El mundo es **cyberpunk**: las interfaces neuronales avanzadas son algo corriente. Tú y tu compañero (ARVID o DARIS) están **vinculados mentalmente** por una de ellas. Lo que la app muestra es lo que pasa por ese vínculo.
- **M-16a.** La señal entra por el vínculo, y la Instancia **se ejecuta dentro de él**: en tu mente y en la de tu compañero, como un virus. Por eso el «hackeo» del primer minuto no es de un aparato: es de lo que ves.
- **M-16b.** Desde fuera, durante una transmisión solo se te ve **sin moverte, con la mirada perdida**. Nadie más ve ni oye nada.
- **M-17.** El canal lo abrió **el compañero del futuro**, el que siguió junto al operador todos esos años, con las mismas credenciales del vínculo. El compañero de ahora no lo sabe. Es el misterio secundario (§7.3).
- **M-18.** La señal es una emisión, y **deja huella en la red del barrio**: tráfico sin origen, registros fantasma, una melodía que se cuela en un implante de audio. Los vecinos notan esos efectos en su vida sin saber de dónde vienen.
- **M-18a.** Tu compañero puede **escribir por ti** a otras personas: lo que piensas le llega por el vínculo.

### 3.7 La voz
- **M-19.** Todas las transmisiones suenan con el **filtro de radio AM**, sin excepción, incluida la última. Cuando la Instancia habla libre no cambia el timbre: cambian el ritmo y las palabras.
- **M-20.** La voz tiene tu género porque es la tuya, pasada por el Marco. Es una pista que está delante desde el primer día.

### 3.8 Lo que la historia nunca hace
- **M-21.** No castiga. Un capítulo abierto no se pierde ni se cierra. Los días sin hacer nada no restan: solo retrasan el siguiente.
- **M-22.** El Marco es frío, nunca humillante. Registra y evalúa; no insulta ni culpa.
- **M-23.** No pide nada peligroso ni promete nada real: es ficción dentro de la app.
- **M-24.** No se le dice al jugador cuánto dura la temporada. Entre un capítulo y el siguiente pasa al menos una semana y hay que igualar la experiencia del tramo anterior (H-01): quien no falla nunca tarda 19 semanas; lo normal es algo más.

## 4. Personajes

| Quién | Qué es | Qué quiere | Cómo habla |
|---|---|---|---|
| **El Marco** | El framework del programa. La voz de las transmisiones | Que el protocolo se cumpla | Sintético, impersonal, frases cortas. «Cada acción será registrada» |
| **La Instancia** | La conciencia de tu yo del futuro, dentro del Marco | Que no te conviertas en ella; y, cree, salvarse | Solo a ráfagas, cuando el Marco falla. Humana, con dudas. «…Por fin» |
| **Sombra** | La parte de la Instancia que escapó del Marco en el capítulo 10. Una figura con capucha que **solo veis tú y tu compañero** | Decirte lo que el Marco calla | Frases muy cortas: salió con muy pocos datos. «Mensaje para ti: sigue así» |
| **El operador** | Tu yo del futuro en la línea de origen; fue el 6173 | Cambiar su vida | Nunca habla. Solo existe a través de su copia |
| **ARVID / DARIS** | Tu compañero, del presente, vinculado a tu mente. El canal | Protegerte y entender qué entra por su canal | Como siempre. Investiga contigo, escribe por ti cuando hace falta; nunca inventa |
| **Los vecinos** | La gente de tu calle. **No saben nada de ORIGEN** | Vivir su vida; echar una mano si se la pides | Como hoy. Cada uno tiene su chat contigo |
| **Tú** | El participante 6174 | — | No hablas con la señal. Tus actos son tu respuesta |

### 4.1 Los vecinos y su pieza
Cada vecino llega a tu calle con su nivel (spec 11, sin cambios) y entra en la historia en su capítulo. Si el capítulo llega antes que el nivel, el vecino llega con el capítulo. Ninguno investiga tu misterio. Cada uno aporta una pieza **porque su trabajo o su día a día roza la señal**, y eres tú, con tu compañero, quien une las piezas.

| Capítulo | Vecino | Por dónde entra en tu vida | Su pieza, sin saber que lo es |
|---|---|---|---|
| 2 | **Dex**, músico callejero | Toca bajo tu ventana y pregunta si molesta | Se le ha pegado una melodía que no sabe de dónde ha salido. Es el patrón del zumbido. En el cap. 9 cae en la cuenta: es lo que tarareas tú |
| 3 | **Omar**, repartidor | Tiene una entrega asignada a tu portal | La entrega es a nombre de «Programa Origen», sin remitente y sin paquete en el almacén. La empresa no tiene dirección, y él se las sabe todas |
| 4 | **Lía**, soporte de interfaces neuronales | Vive en tu edificio; tu compañero le hace «una pregunta de trabajo» | La escéptica con motivos: «Es phishing neuronal». Hasta que oye que no te pide nada: «Las estafas no te mandan a dormir pronto» |
| 5 | **Nova**, estudiante | Comparte apuntes y temas de examen | Sabe qué es el 6174. En el cap. 16 estudia paradojas temporales y plantea, sin saberlo, la duda que nadie quiere hacerse |
| 5 | **Pip**, el niño que corre | Te escribe porque cree que juegas a las estatuas | Lo que se ve desde fuera: «Hoy te has quedado sin moverte 46 segundos. Los he contado.» Más adelante: «¿A quién saludas? Ahí no hay nadie» |
| 6 | **Kenji**, mecánico de noche | Vas a su taller a revisar el puerto de la interfaz | No hay avería. Y lo que entra responde a lo que haces: «Las grabaciones no dudan» |
| 7 | **Roxy**, DJ | Tu compañero le pide el favor de limpiar un audio con ruido | Debajo de la estática hay **otra voz**, la misma, diciendo otra cosa |
| 8 | **Mía**, hermana de Pip | Se disculpa por los mensajes de su hermano | La que se preocupa: «Ayer estuviste un minuto sin parpadear. ¿Estás bien?» En el acto III, la que nota cuánto has cambiado |
| 8 | **Teo**, programador | Mantiene el nodo de la red del barrio, y el tuyo «hace ruido» | El tráfico no viene de fuera: **sale de tu propio identificador**. No son mensajes: es un modelo dentro de un contenedor. Hace la comparación del capítulo 10 |
| 9 | Auto de policía | La patrulla de espectro recorre la manzana | Buscan un emisor sin licencia. Teo te cubre |
| 10 | **Sombra** | Aparece en tu calle. Nadie lo añadió a tus chats | Ver §4.2 |

### 4.2 Sombra
- Es **la parte de la Instancia que quedó fuera del Marco** tras el fallo del capítulo 10. Vive en el vínculo, como un virus en tu mente y en la de tu compañero.
- **Solo lo ven ustedes dos.** Camina por tu calle y los vecinos pasan a su lado sin mirarlo. Pip te pregunta a quién saludas.
- Puede decir la verdad, pero salió con muy pocos datos: solo frases cortas, y no siempre.
- Sus tres frases actuales se conservan: «Te observo desde hace tiempo. Has llegado lejos.» · «Mensaje para ti: sigue así.» · «Pocos llegan hasta aquí. Tú lo has hecho.»
- Tiene un chat que nadie añadió. Ahí queda todo lo que te dice.
- Al terminar la temporada **desaparece** (D-229). Lo que lo mantenía activo en tu línea era el canal abierto con la línea 6173; al completarse el programa y enviarse el resultado, el canal se cierra (M-07a). Su chat se queda, con todo lo que dijo.

### 4.3 Cómo entran los vecinos (para que sea natural)
- **VN-01. Entran por su vida, no por la tuya.** El primer mensaje de cada uno es cotidiano y tiene que ver con su oficio o con ser vecinos (un paquete, el ruido, el nodo, una disculpa).
- **VN-02. No saben nada de ORIGEN.** Lo que aportan es algo raro que les pasa a ellos, o la respuesta a un favor concreto. Nunca reciben la historia completa en los mensajes fijos.
- **VN-03. Los favores los pide tu compañero, por ti,** con lo mínimo: «¿puedes limpiar este audio?», «¿te suena este número?». Sin contar para qué.
- **VN-04. Lo que ven es tu exterior:** que te quedas sin moverte, que saludas a nadie y, con los meses, que has cambiado. Esa mirada desde fuera es la prueba de que el programa funciona.
- **VN-05. Solo Teo se acerca a la verdad,** porque ve el tráfico. Es discreto: «No sé en qué andas y no voy a preguntar».
- **VN-06. Cuánto sabe cada vecino más allá de eso lo decides tú,** con lo que le cuentes en su chat.

### 4.4 Los chats
- **CH-01.** Cada personaje tiene **su propia conversación**, como en una app de mensajería. La lista crece con cada vecino que llega.
- **CH-02. Mensajes de historia (fijos).** En cada capítulo, los personajes implicados escriben lo que les toca, y tu compañero contesta **por ti** lo imprescindible para que la conversación no quede muerta. Funcionan sin IA y sin conexión.
- **CH-03. Conversación libre (con IA).** Puedes escribir a cualquier vecino. Cada uno responde con su carácter, su propio contexto y su opinión sobre lo que le compartas.
- **CH-04. Bitácora.** Lo que dicen los personajes no se puede borrar: es el registro de la historia. Tus propios mensajes sí puedes eliminarlos.
- **CH-05. «??? · Señal desconocida»** es un contacto que no añadiste. Ahí quedan las transmisiones, para volver a verlas. No se le puede responder.
- **CH-06. Sombra** tiene chat, pero no conversa: escribe cuando quiere, con frases fijas. Si le escribes, casi nunca contesta.
- **CH-07.** El chat del compañero sigue siendo el de siempre: ahí comenta contigo, en privado, lo que va pasando.

## 5. Quién sabe qué

Del Emisor 0000 (§3.5) no sabe nada nadie, tampoco la Instancia ni el Marco.

Sirve para escribir los guiones y, sobre todo, para las instrucciones de la IA del compañero y de los vecinos: **nadie dice lo que todavía no sabe**.

| | Acto I (1–5) | Acto II (5–10) | Tras el giro 1 (10–20) | Tras el giro 2 (20+) |
|---|---|---|---|---|
| **El Marco** | Lo sabe todo; no dice nada | Igual | Igual; refuerza la contención | Liberado: deja de existir |
| **La Instancia** | Lo sabe todo menos M-01 | Se le escapan cosas | Habla por Sombra | Descubre M-01 a la vez que tú |
| **El compañero** | «Algo entró por mi canal» | Investiga; sospecha que no es una máquina | Sabe que la señal eres tú; no sabe por qué entró por él | Sabe que fue su yo del futuro quien abrió el canal |
| **Los vecinos** | Les pasan cosas raras sueltas | Cada uno aporta su pieza sin saber que lo es | No ven a Sombra. Ven que has cambiado | Igual: para ellos solo han pasado unos meses |
| **Teo** | — | Sabe que tu nodo emite un modelo que se parece a ti | Sabe lo técnico; no pregunta lo demás | Lee el archivo entero |
| **Tú** | Un programa te evalúa | Sospechas quién habla | Sabes quién; crees saber para qué | Lo sabes todo |

## 6. Estructura de la temporada 1: tres actos, veinte capítulos

- Veinte capítulos. El siguiente se abre cuando ha pasado **al menos una semana** desde el anterior y has ganado **como mínimo la misma experiencia** que en el tramo anterior o superado la prueba del programa del tramo (H-01). El nivel no cuenta.
- **Diez sesiones** del programa (transmisiones con voz): capítulos 1, 3, 5, 7, 8, 10, 12, 15, 17 y 20.
- Los demás capítulos no tienen transmisión: ocurren en los chats (§4.4) y en lo que tu compañero comenta contigo.
- Lo que pasa en cada capítulo, con sus mensajes, está en `historia.md`. Aquí solo va el esqueleto.
- Después del capítulo 10 las transmisiones son **solo audio**.

| Acto | Capítulos | La pregunta | Cómo acaba |
|---|---|---|---|
| I | 1–5 | ¿Qué es ORIGEN? | «Históricamente, el participante abandona en la tercera semana» |
| II | 5–10 | ¿Quién habla? | **Giro 1:** la señal eres tú |
| III | 10–20 | ¿Para qué lo hizo? ¿Qué no le dejan decir? | **Giro 2:** convergente; línea de origen, sin cambios |
| Epílogo | 20 | ¿Y el que la envió? | «En el futuro»: su vida no cambió, y lo demostró (§7.6) |
| Cierre | 20 | — | **El enigma:** ¿quién envió la primera señal? |

### 6.1 Capítulos 1–10 · «¿Quién habla?» (actos I y II)

| Cap. | Título | Sesión | Qué pasa | Lo que deja abierto |
|---|---|---|---|---|
| 1 | El primer minuto | 1 | El hackeo: el buscador, alguien escribe «Programa Origen», negro, la figura. Aparece un contacto que no añadiste | ¿Quién escribió eso? |
| 2 | La melodía | — | Dex: una melodía que se le ha pegado. Es el zumbido. ORIGEN no existe en ningún registro | ¿De dónde viene una señal que no viene de ningún sitio? |
| 3 | Primera prueba | 2 | «El rechazo también será registrado.» Primera prueba, a tu medida. Omar: una entrega fantasma a nombre de ORIGEN | «O viene de un sitio que todavía no existe» |
| 4 | Lía no se lo cree | — | Lía: es phishing neuronal… pero no te pide nada. La prueba se da por cumplida sola | ¿Cómo sabe eso de mí? |
| 5 | La tercera semana | 3 | «Históricamente, el participante abandona en la tercera semana.» Nova y el 6174. Pip: te quedas sin moverte | ¿Qué historial? Llevas tres semanas |
| 6 | Las grabaciones no dudan | — | Kenji revisa tu puerto: no hay avería, y lo que entra responde a lo que haces | Si no es una grabación, ¿qué es? |
| 7 | Por fin | 4 | El Marco falla: «…Por fin. Error. Mensaje no autorizado.» Roxy: dos voces en la misma pista | ¿Por fin qué? |
| 8 | El archivo | 5 | Se filtra la lista (6170 a 6173, «no convergente»; 6174, «en curso»). Teo: sale de tu propio identificador, y es un modelo. Mía se preocupa | ¿Seis mil personas, o seis mil veces la misma? |
| 9 | La patrulla | — | La patrulla de espectro busca un emisor. Dex: «Es lo que tarareas tú». A Teo le falta una muestra | El análisis termina en el siguiente capítulo |
| 10 | Canal de imagen | 6 | **Giro 1** (§7.1) | Ya sabes quién. ¿Para qué? |

### 6.2 Capítulos 11–20 · «¿Para qué?» (acto III)

| Cap. | Título | Sesión | Qué pasa | Lo que deja abierto |
|---|---|---|---|---|
| 11 | Nadie más lo ve | — | Sombra te escribe. Pip: «¿A quién saludas?» El compañero: «No está en mi canal. Está dentro» | «No puedo decirte para qué. Todavía» |
| 12 | Solo audio | 7 | «Canal de imagen: revocado. Fase de consolidación.» Roxy rescata una frase de debajo | «No fui el primero» |
| 13 | La pieza gastada | — | Teo abre el contenedor: miles de parches firmados con un número de participante; los más antiguos, sin firma. Sombra: «Yo fui el 6173» | ¿Qué pasa cuando alguien termina? Nadie ha terminado |
| 14 | La firma | — | El canal se abrió con las credenciales de tu compañero. «Y yo no lo he abierto» | Sombra: «No lo hice solo» |
| 15 | Sin precedentes | 8 | «Probabilidad de convergencia: superior al 50 %. Valor sin precedentes.» Los vecinos notan que has cambiado. Sombra: «Si terminas, yo no habré sido así» | La promesa: acabar le salva |
| 16 | La duda de Nova | — | Nova estudia paradojas temporales: ¿y si cambiar el pasado solo abre otra rama? El compañero: Sombra sigue igual | Nadie ha llegado al final para saberlo |
| 17 | Contención | 9 | «Fuga detectada en el vínculo. Localizando.» Sombra desaparece. Teo esconde tu nodo de la patrulla | ¿Lo han encontrado? |
| 18 | Lo que no dijo | — | Sombra vuelve con poca señal y cuenta por qué existe el secreto: él lo supo pronto (sesión 2) y abandonó. La regla la escribió él | Tú lo supiste cuando ya podías con ello |
| 19 | Víspera | — | Capítulo tranquilo: estos meses vistos por tus vecinos. Sombra: «Cuando termines, despertaré en otra vida» | — |
| 20 | Convergente | 10 | **Giro 2** (§7.2), **el epílogo** «En el futuro» (§7.6) y, tras él, **el enigma** (§7.5) | El arco está cerrado. Queda una pregunta nueva |

Con el capítulo 20 termina la temporada 1. Los niveles siguen; la historia espera a la temporada 2.

## 7. Los giros

### 7.1 Giro 1 · Capítulo 10 · Quién está detrás
**Principio:** se ve y se deduce; nadie lo confiesa. El Marco lo niega, y esa negación lo confirma.

1. **La transmisión empieza normal:** «Sesión seis. Probabilidad de convergencia: treinta y uno por ciento.»
2. **El Marco falla.** Durante menos de un segundo:
   - la figura de la capucha se convierte en **tu propio personaje**;
   - el «???» de la caja se convierte en **tu alias**.

   Nadie dice nada. Es solo imagen.
3. **El Marco reacciona:** «Identidad del operador: clasificada. Contención reforzada. Canal de imagen: revocado.» Corte.
4. **La prueba.** Teo termina el análisis: el modelo que emite tu nodo y tu perfil de hábitos (que tu compañero le pasó sin nombre) coinciden en un **97,3 %**. «El 2,7 % que falta son los años que todavía no has vivido.» El compañero lo resume en una frase: **«La señal eres tú.»**
5. **Sombra.** La siguiente vez que miras tu calle, hay alguien con capucha. Tu compañero también lo ve. Nadie más.

Por qué funciona:
- El jugador lleva varios capítulos con pistas para sospecharlo (el historial, «sale de tu propio identificador», «es lo que tarareas tú», la voz con su género).
- No se contesta el porqué. La pregunta cambia de «¿quién?» a «¿para qué, y qué no le dejan decir?».
- El coste del giro se nota: se pierde la imagen para siempre.

### 7.2 Giro 2 · Capítulo 20 · El resultado
**Principio:** la Instancia se entera a la vez que tú. No te ha mentido: estaba equivocada.

Transmisión de solo audio, en tres tiempos:

1. **El Marco cierra el programa:**
   «Programa ORIGEN: completado. Participante seis mil ciento setenta y cuatro: convergente. Consultando línea de origen…»
   Silencio.
   «Línea de origen: sin variación. Hipótesis: refutada. Marco: liberado.»
2. **La Instancia, libre por primera y única vez.** Misma voz de radio; ya no lee. Lo que tiene que quedar dicho:
   - Lo conseguiste. Lo ve en los registros: cada prueba, cada día.
   - ORIGEN era su experimento. Creía que, si tú cambiabas, cambiaría él.
   - El pasado se puede cambiar. El futuro que ya existe, no: lo que has hecho es abrir una línea nueva, la tuya.
   - Allí no ha cambiado nada. Y descubre que no le importa: tú no vas a ser él.
   - Nadie lo sabía porque nadie había terminado nunca. **Eres el primer resultado del experimento.**
   - No habrá 6175: él ya sabe que no sirve, y tú no vas a necesitar enviarla.
   - No lo hizo solo: quien abrió el canal fue tu compañero, que nunca se fue de su lado (§7.3).
   - Gracias. Y felicidades.
3. **El cierre.** El zumbido se apaga. Vuelve la app. El compañero tarda en hablar.

Después:
- Sombra sigue en tu calle, ya entero, visible solo para ustedes dos. Todavía: el canal no se ha cerrado.
- No llegan más sesiones ni más pruebas del programa: ORIGEN ha terminado.
- Todas las transmisiones siguen en el chat.
- Entonces, el epílogo (§7.6) y, cuando termina, la última escena (§7.5).

### 7.3 Misterio secundario · Quién abrió el canal
- **Siembra (cap. 1–9):** la señal «ya sabe el camino»; entra sin forzar nada.
- **Pista (cap. 14):** Teo ve que el canal se abrió desde dentro, con las credenciales del compañero. Él encuentra su propia firma. No lo entiende y le inquieta.
- **Respuesta (cap. 20):** la Instancia lo dice. El compañero del futuro siguió con el operador todos esos años, y fue quien comprimió su conciencia y abrió el canal.
- **Última frase del compañero** (borrador): «Entonces no te dejé solo. Ni allí.» / «Supongo que ahora el canal es solo nuestro.»

### 7.4 Lo que el primer minuto significa después
El hackeo del capítulo 1 se entiende de otra forma al acabar:
- Quien escribe «Programa Origen» en Google, con ritmo humano y dudando, es **la Instancia**, en los segundos que tarda el Marco en arrancar. Es su único acto libre hasta el capítulo 20.
- El corte seco a negro es el Marco tomando el control.
- La voz fría que llega después ya no es quien escribió.

### 7.5 El final abierto · El enigma
**Principio:** abierto, no inconcluso. Todo lo que la temporada preguntó queda contestado; lo que se abre es una pregunta **nueva y más grande**, que no deshace nada de lo anterior.

**Lo que queda cerrado** (y no se vuelve a tocar):

| Pregunta de la temporada | Respuesta |
|---|---|
| ¿Qué es ORIGEN? | Un experimento para cambiar el pasado |
| ¿Quién habla? | Tú, dentro de un programa |
| ¿Para qué? | Para cambiar su propia vida |
| ¿Funcionó? | Para ti, sí. Para él, no: tu línea es nueva |
| ¿Habrá otro participante? | No. La cadena termina en 6174 |
| ¿Qué pasa con él? | Su copia se despide libre y se apaga cuando el canal se cierra |
| ¿Y el original, el que la envió? | Su vida no cambió. Lo comprobó, lo publicó y recibió el Nobel de Física (§7.6) |
| ¿Quién abrió el canal? | Tu compañero, desde el futuro |

**La última escena** (después del epílogo, como la escena que llega tras los créditos):

1. Con el Marco liberado, Teo puede leer por fin el archivo completo, incluidos los parches sin firma del capítulo 13.
2. El archivo empieza en el participante 0001. Resultado: no convergente. **Al 0001 también le llegó una señal.**
3. Encima hay una línea que no es un participante: **«Emisor 0000 · Línea: no registrada · Estado: a la escucha».**
4. Tu compañero le pregunta a Sombra qué sabe de eso. Sombra contesta lo único que no esperabas: **«Yo creía que el programa era mío.»**
5. **Sombra hace un glitch y desaparece.** Sin aviso: nadie lo había anunciado. El compañero lo entiende y lo dice: **se ha cerrado el canal con el futuro.** El programa terminó y envió su resultado, y el canal abierto era lo que mantenía a Sombra aquí (M-07a). Su chat se queda.
6. Por un canal que ya no existe entra un único pulso, en el contacto «???». No es rojo. Una línea de texto, sin voz: **«Línea 6174: registrada.»**
7. El compañero: **«…Eso no era él.»**

Fin de la temporada 1.

**Lo que queda abierto a propósito** (material de la temporada 2; aquí no se contesta ni se insinúa una respuesta):
- ¿Quién es el Emisor 0000, y por qué empezó la cadena con alguien como tú?
- ¿Qué significa que una línea quede «registrada»? ¿Qué pasa con las líneas que convergen?
- ¿Qué hace el mundo del operador con un descubrimiento así? Solo sabemos lo que le pasó a él.
- ¿De dónde sacó el compañero del futuro la forma de abrir un canal?
- Si el canal está cerrado, ¿por dónde entró el último mensaje?

Por qué no se siente inconcluso:
- El enigma llega **después** del cierre emocional y del epílogo, no en su lugar.
- El epílogo lo hace más grande: acabas de ver al operador recibir un premio por su programa, y lo siguiente que lees es «Yo creía que el programa era mío».
- No pone en duda nada de lo vivido: la señal eras tú y lo conseguiste.
- La desaparición de Sombra no deja su arco a medias: ya se despidió en la última transmisión («Gracias. Y felicidades»). Lo que se corta es lo único que nadie sabía, y por eso duele que no pueda seguir hablando.
- Está sembrado con juego limpio (el número del participante desde el capítulo 1, «No fui el primero» en el 12, los parches sin firma en el 13).
- No exige nada al jugador: no hay pruebas ni cuenta atrás. Es una pregunta, no una tarea.

### 7.6 El epílogo · «En el futuro»
**Principio:** no revela nada. Los dos giros ya han ocurrido; el epílogo enseña **la consecuencia** en el otro lado, y por eso puede contarse sin romper ningún suspense.

**Forma** (D-228):
- Como los créditos de una película: fondo negro, un título, **«En el futuro»**, y un texto que sube despacio.
- Narrado **en tercera persona**, impersonal y en pasado. No habla el Marco, ni la Instancia, ni el compañero. No lleva voz: solo texto y música.
- Música: **«Glass and Gravity»** (2 min 52 s), la pieza que eligió el responsable. El texto se reparte para caber en ella con aire.
- Va **después** de la despedida de la Instancia y de la frase del compañero, y **antes** de la última escena (§7.5).

**Lo que cuenta**, en este orden:
1. De joven recibió una señal y la abandonó. Dedicó media vida a construir la siguiente, con una sola ayuda: su compañero.
2. En su mundo nadie había demostrado que algo pudiera llegar al pasado, ni que sirviera para cambiar nada (M-02a).
3. Una noche la envió. La carga duró 6174 segundos (M-03a).
4. La respuesta llegó al terminar: «convergente». En el pasado, alguien había tardado en ganarla los días que tardaste tú: la app escribe el número real.
5. Miró a su alrededor: no había cambiado nada.
6. Comparó y confirmó los datos. El pasado había cambiado; su presente, no. Dio el experimento por concluido.
7. Lo publicó y recibió el **Premio Nobel de Física**: por demostrar que su propia hipótesis era falsa.
8. No recuperó sus años. Pero supo, con datos, que en otra línea alguien con su nombre no iba a perderlos.
9. En el discurso dio las gracias a dos: a su compañero y **al participante 6174**.

**Lo que no hace:**
- No describe su mundo ni cómo es su vida (M-15e): solo lo que le pasó.
- No le pone nombre ni usa tu alias.
- No menciona el Emisor 0000: él no lo sabe. El jugador sí lo va a saber, un minuto después.

Por qué funciona:
- Une el hábito y el enigma por última vez: el premio existe porque tú cumpliste hasta el final. El agradecimiento final es a ti.
- Resuelve el riesgo de un final triste (RC-3): el operador no recupera su vida, pero gana lo que no buscaba.
- Prepara el enigma: el mundo premia un programa que él cree suyo.

## 8. Hábitos y enigma: cómo se unen

- **H-01. Los capítulos van por tramos.** El siguiente se abre cuando ha pasado al menos una semana desde el anterior y, además, has ganado como mínimo la misma experiencia que en el tramo anterior **o** has superado la prueba del programa del tramo, que sirve de pase. El nivel no cuenta, y nada avisa de cuándo llega: cada capítulo es un hackeo por sorpresa (D-233, D-241, D-242).
- **H-02. Las pruebas del programa** dan mucha XP (referencia: 100) y son exigentes. Las escribe una IA después de analizar tu comportamiento, y no tienen por qué ser cosas que ya tengas creadas: pueden ser algo nuevo que complemente lo que quieres lograr (D-235). Funcionan como una misión: las aceptas o las rechazas, y nunca restan. Superar la del tramo es un **pase**: abre el capítulo siguiente aunque no llegues a la experiencia (D-241). En la historia: las diseña alguien que ya fue tú (M-05) y el Marco «registra cada acción».
- **H-03. Cada prueba completada descifra un fragmento.** Cuando la Instancia calcula una prueba para ti, tu nodo emite parte de sus pesos, y Teo la captura. El fragmento es una entrada breve del archivo, por ejemplo: «Participante 4012. Abandonó el día 19.» Llega al chat de Teo. Los de antes del capítulo 8 los guarda tu compañero y Teo los descifra al llegar.
- **H-04. La bitácora son los chats.** Todo lo que han dicho los personajes queda en su conversación (CH-04). Un resumen, el **Expediente ORIGEN**, reúne las pistas, los fragmentos y un porcentaje de «señal descifrada».
- **H-05. Los fragmentos son un extra, nunca un requisito.** Quien no acepte pruebas ve la historia completa igualmente, con el Expediente más vacío.
- **H-06. Los vecinos ven tu cambio.** No saben nada del programa, pero te ven cada día. Con los meses, sus mensajes lo reflejan: es la prueba, desde fuera, de que estás convergiendo.
- **H-07. Todas las transmisiones quedan guardadas** en el contacto «???» (CH-05) y se pueden volver a ver, sin la ilusión del buscador. Una por sesión.
- **H-08. La música llega con la señal.** Al empezar solo suenan las tres primeras canciones. Las demás se desbloquean al avanzar; mientras tanto aparecen en la lista en blanco y negro y sin nombre (D-236).
- **H-09. La historia se elige.** Al terminar el primer contacto, tu compañero te pregunta si quieres investigar o bloquear la señal. Si la bloqueas, no llega nada más y la app sigue como antes (D-237).

## 9. Presupuesto de revelaciones

Lo que **no** puede decir nadie (ni un texto fijo, ni la IA) antes del capítulo indicado.

| Verdad | Se puede sospechar desde | Se confirma en | Antes de eso, prohibido |
|---|---|---|---|
| No es una grabación | 5 («históricamente») | 6 (Kenji) | Que el Marco hable de sí mismo como alguien |
| Hay alguien dentro de la voz | 7 («Por fin») | 7–8 (Roxy, Teo) | Nombrar «Instancia» o «Marco»: esos nombres los pone Teo en el cap. 8 |
| Ha habido miles de intentos | 1 (el número) | 8 (el archivo) | Decir que los intentos son la misma persona |
| La señal eres tú | 8 («sale de tu propio identificador») | 10 | Las palabras «futuro», «tu yo», «tú mismo» en boca de cualquiera |
| La cadena: cada participante envía la siguiente | 8 | 13 | Decir que el operador fue un participante |
| El compañero abrió el canal | 14 | 20 | Que el compañero lo afirme o lo niegue |
| Por qué el secreto | — | 18 | — |
| Acabar le salva (creencia falsa) | 15 | — | Que alguien lo dé por demostrado: solo se cree |
| El futuro de origen no cambia | 16 (la duda de Nova) | 20 | Afirmarlo o desmentirlo |
| Alguien empezó la cadena (Emisor 0000) | 13 (parches sin firma) | 20, solo que existe | Decir quién es o qué quiere: no se sabe en toda la temporada 1 |

Reglas para la IA (compañero y vecinos):
- **RV-01.** Cada personaje recibe el número de capítulo y **solo** lo que él sabe en ese capítulo (§5): su vida, sus mensajes de historia hasta ahora y lo que tú le hayas contado en su chat.
- **RV-02.** Nunca inventa hechos de la historia: comenta los que ya ocurrieron.
- **RV-03.** Si le preguntas por algo que no sabe, no lo sabe, y lo dice con naturalidad.
- **RV-04.** Un vecino puede opinar, dudar o no creerte. No puede **confirmar** nada de la historia que no le toque.
- **RV-05.** Ni el Marco ni Sombra usan IA: sus textos son fijos.

## 10. Tono

- **Marco:** clínico. Datos, porcentajes, estados. Sin signos de exclamación ni adjetivos.
- **Instancia:** pocas palabras, pausas, alguna torpeza. Nunca solemne.
- **Sombra:** frases de menos de 60 caracteres. Habla como quien deja notas.
- **Compañero:** el de siempre. Es quien pone la emoción y el humor; la historia no le quita su papel de acompañar el día.
- **Epílogo:** tercera persona, pasado, frases cortas. Sin adjetivos y sin moraleja: cuenta hechos.
- **Vecinos:** cotidianos, como mensajes de celular. La pista llega dentro de una frase normal, no en un discurso. Pip escribe como un niño.
- Ningún capítulo dura más de lo que se tarda en leer cuatro o cinco intervenciones cortas. Las transmisiones largas son solo la 1 y la 10.

## 11. Fuera de este documento

Se deciden al reescribir `spec.md`:
- la mecánica del primer contacto (momento al azar del primer minuto, réplica de Google, sonido), ya prototipada;
- qué pasa con quien ya usa la app, con quien nunca la instala y con «Reducir movimiento»;
- cómo se generan y verifican las pruebas, y cuántas llegan;
- la pantalla de chats (lista, mensajes fijos, conversación con IA, qué se puede borrar), su límite diario y qué pasa sin IA;
- la pantalla del Expediente;
- cómo desaparece y vuelve Sombra (cap. 17–18);
- la producción de las voces (masculina, femenina e inglés) de las diez sesiones;
- la presentación del epílogo: ritmo del texto sobre la música, qué pasa con «Reducir movimiento» y sin sonido, si se puede saltar y dónde se vuelve a ver;
- el plan de entrega por versiones.

## 12. Riesgos

- **RC-1 · Una semana entre capítulos puede hacerse larga.** *Mitigación:* dentro del capítulo los mensajes llegan repartidos en varios días, y entre medias hay una prueba del programa, fragmentos del Expediente y frases de Sombra.
- **RC-2 · El giro 1 se adivina pronto.** Es deseable: el jugador debe sospechar. *Mitigación:* el giro 2 es el que no se ve venir, y está sembrado con juego limpio (cap. 16).
- **RC-3 · Un final triste.** *Mitigación:* la Instancia se despide contenta, el epílogo le da al operador algo que no buscaba y el compañero cierra. El mensaje es «tu línea es nueva», no «él perdió». Sombra desaparece (D-229), pero después de despedirse, y su chat se queda.
- **RC-11 · El epílogo suena a explicación.** Ya se descartó una revelación contada como monólogo. *Mitigación:* el epílogo llega después de los dos giros y no descubre ningún misterio; es corto (cabe en 2 min 52 s) y solo cuenta hechos.
- **RC-7 · Un final abierto que parezca inconcluso.** *Mitigación:* la tabla de §7.5: cada pregunta de la temporada tiene su respuesta antes de que aparezca el enigma, y el enigma no reabre ninguna.
- **RC-8 · Prometer una temporada 2 que tarde.** *Mitigación:* la app no anuncia fechas ni dice «continuará»; el enigma se sostiene solo como final.
- **RC-4 · La IA estropea una revelación.** *Mitigación:* §9 y RV-01 a RV-05; los mensajes de historia y las transmisiones son textos fijos.
- **RC-9 · Diez chats con IA pueden sonar parecidos y tienen un coste.** *Mitigación:* la historia no depende de la IA (CH-02); cada vecino tiene su ficha de carácter, su propio contexto y un límite de 3 mensajes al día (D-234).
- **RC-10 · El jugador le cuenta todo a un vecino y este «rompe» la ficción.** *Mitigación:* RV-04: puede opinar y dudar, no confirmar.
- **RC-5 · Coste de producción:** diez sesiones en tres voces. *Mitigación:* son cortas salvo la 1 y la 10; se pueden entregar por actos.
- **RC-6 · Quien entra con nivel alto.** Ya no importa: los capítulos no van por nivel. Empieza por el 1, como todos (D-233).
- **RC-12 · La vara de experiencia puede frenar a quien tiene una semana excepcional,** porque el tramo siguiente le pide lo mismo. *Mitigación:* los límites de `spec.md` §3.3 (un mínimo y un tope de subida).
- **RC-13 · Con el ritmo por semanas, un jugador normal termina la temporada con nivel 12 o 13, no 20.** Los rangos que anunciaban las sesiones dejarían de coincidir con su título. *Mitigación:* C17-48.

## 13. Decisiones

A = decidida o aprobada por el responsable · B = recomendación pendiente de aprobación.

C17-09 a C17-22 se aprobaron el 2026-11-10, salvo el reparto de los vecinos (C17-13 y C17-14), que se rehízo como C17-27 a C17-33. Estas y el epílogo (C17-34 a C17-39) se aprobaron el 2026-11-10.

| ID | Propuesta | Tipo |
|---|---|---|
| C17-01 | Lo que viaja es la conciencia del operador, comprimida y limitada por un framework; los fallos de la señal son fallos de ese framework (D-216) | A |
| C17-02 | Dos giros: quién está detrás (nivel 10) y que su futuro no cambió (nivel 20, fin de la historia) (D-217) | A |
| C17-03 | Giro 1 visual: tu personaje bajo la capucha y tu alias en la caja, más la deducción del compañero y Teo; el Marco lo niega (D-218) | A |
| C17-04 | Sombra es la Instancia fuera del Marco (D-219). Al final no se queda: desaparece al cerrarse el canal (D-229) | A |
| C17-05 | Tras el nivel 10, transmisiones de solo audio (D-220) | A |
| C17-06 | El compañero del futuro abrió el canal: misterio secundario (D-221) | A |
| C17-07 | Los vecinos participan, cada uno con una pieza; la historia se desbloquea por capítulos (D-222) | A |
| C17-08 | Participante 6174; el operador fue el 6173; conoce la cadena y la oculta; la historia acaba en el 20 y los niveles siguen (D-213, D-214) | A |
| C17-08b | Los veinte capítulos son la temporada 1; final abierto con un enigma, que cierra el arco y deja material para la temporada 2 (D-223) | A |
| C17-09 | Nombres: «la Instancia», «el Marco», «el operador». Los pone Teo en el capítulo 8 | A |
| C17-10 | El Marco es la suma de las reglas que añadió cada operador (M-09) y el secreto existe porque saberlo pronto hizo abandonar al 6173 (M-10, cap. 18) | A |
| C17-11 | Canal de vuelta de un solo dato: el resultado, y si la línea de origen cambió (M-03) | A |
| C17-12 | Veinte capítulos, uno por nivel, en tres actos; diez sesiones en los niveles 1, 3, 5, 7, 8, 10, 12, 15, 17 y 20 | A |
| C17-13 | El reparto de piezas entre los vecinos (§4.1), con Lía de escéptica y Nova planteando la duda del capítulo 16 | Rehecha |
| C17-14 | Sombra existe a retazos antes del nivel 10 (lo que notan Dex, Omar y Pip) | Rehecha |
| C17-15 | Sombra desaparece en el capítulo 17 y vuelve en el 18 | A |
| C17-16 | Quien escribe en Google en el primer minuto es la Instancia, antes de que arranque el Marco (§7.4) | A |
| C17-17 | La coincidencia del 97,3 % y la frase del 2,7 % | A |
| C17-18 | Cada prueba completada descifra un fragmento del archivo; Expediente ORIGEN con porcentaje; los fragmentos nunca bloquean capítulos (H-03 a H-05) | A |
| C17-19 | Presupuesto de revelaciones y reglas RV para la IA (§9) | A |
| C17-20 | En el giro 2 la Instancia se entera a la vez que el jugador; el Marco se libera y no hay más pruebas del programa después del 20 | A |
| C17-21 | El enigma del final: el Emisor 0000 («a la escucha»), «Yo creía que el programa era mío» y el pulso «Línea 6174: registrada» (§3.5, §7.5) | A |
| C17-22 | Lo que se guarda para la temporada 2: quién es el Emisor 0000, qué es registrar una línea y de dónde sacó el compañero el canal. Lo del futuro del operador cambia con C17-34 | A |
| C17-23 | Ambientación cyberpunk con interfaces neuronales; tú y tu compañero están vinculados mentalmente; la señal y la Instancia viven en ese vínculo (D-224) | A |
| C17-24 | Sombra solo lo ven tú y tu compañero: es como un virus que se infiltró en sus mentes (D-225) | A |
| C17-25 | Un chat por personaje, como una app de mensajería, con IA, contexto y opinión propios; lo que ellos dicen no se borra (bitácora) y tus mensajes sí puedes eliminarlos (D-226) | A |
| C17-26 | Tu compañero puede contestar por ti a los personajes para que las conversaciones de la historia no queden muertas (D-226) | A |
| C17-27 | Los vecinos entran por su vida, no por la tuya, y no saben nada de ORIGEN (VN-01 a VN-06) | A |
| C17-28 | El reparto nuevo de piezas (§4.1): Dex y la melodía, Omar y la entrega fantasma, Lía en soporte de interfaces, Nova y sus apuntes, Pip y «te quedas sin moverte», Kenji y el puerto, Roxy y el audio, Mía y la preocupación, Teo y el nodo, la patrulla de espectro | A |
| C17-29 | Desde fuera, una transmisión es verte sin moverte, con la mirada perdida (M-16b) | A |
| C17-30 | Mensajes de historia fijos, que funcionan sin IA, y conversación libre con IA alrededor (CH-02, CH-03) | A |
| C17-31 | «??? · Señal desconocida» como contacto que no añadiste, donde quedan las transmisiones (CH-05). Cambia lo de guardarlas en el chat del compañero | A |
| C17-32 | Sombra tiene chat pero no usa IA: frases fijas, casi nunca contesta (CH-06) | A |
| C17-33 | Los vecinos notan tu cambio con los meses (H-06); en el capítulo 19, Dex termina su canción y la llama «Our Signal» | A |
| C17-34 | Epílogo «En el futuro»: texto como los créditos de una película, en tercera persona, con la música «Glass and Gravity». Cuenta que el operador envió la señal, recibió la respuesta al terminar la carga, vio que nada había cambiado, confirmó los datos y recibió el Nobel de Física (D-228) | A |
| C17-35 | En su mundo no estaba confirmado que se pudiera llegar al pasado ni cambiar el futuro; construir la señal le llevó media vida, no horas (M-02a, M-03a) (D-228) | A |
| C17-36 | Orden del final: despedida de la Instancia, frase del compañero, epílogo y, después, el enigma del Emisor 0000 como escena tras los créditos | A |
| C17-37 | La carga dura 6174 segundos (una hora, cuarenta y dos minutos y cincuenta y cuatro segundos) | A |
| C17-38 | El epílogo no lleva voz, no nombra al operador y no describe su mundo; termina con el agradecimiento «al participante 6174» | A |
| C17-39 | El premio es «por demostrar que su propia hipótesis era falsa» | A |
| C17-40 | Tras el epílogo: Teo y el Emisor 0000; el compañero pregunta a Sombra; «Yo creía que el programa era mío»; Sombra hace un glitch y desaparece porque el canal con la línea 6173 se cierra al completarse el programa (D-229) | A |
| C17-41 | Después de desaparecer Sombra se mantiene el pulso «Línea 6174: registrada» y la frase «…Eso no era él» (D-238) | A |
| C17-42 | ~~En la última transmisión la Instancia lo deja caer: «Sigo aquí mientras el canal siga abierto»~~ | Retirada (D-231) |
| C17-43 | Los capítulos ya no van por nivel: al menos una semana entre uno y otro, y la misma experiencia que en el tramo anterior; llegan de repente. Donde una decisión anterior dice «nivel 10» o «nivel 20», léase «capítulo» (D-233) | A |
| C17-44 | Tras el primer contacto, el compañero pregunta si investigar o bloquear la señal (D-237) | A |
| C17-45 | Las pruebas del programa las escribe una IA tras analizar tu comportamiento, y pueden ser cosas nuevas (D-235) | A |
| C17-46 | Final sin anticipar: Sombra hace un glitch, desaparece y el compañero dice que se ha cerrado el canal con el futuro. Nadie dice que se queda en esta línea: Sombra es la Instancia y se va cuando el canal se cierra (D-231, D-238) | A |
| C17-47 | La música se desbloquea al avanzar; las canciones bloqueadas se ven en blanco y negro y sin nombre (D-236) | A |
| C17-48 | Las sesiones dejan de anunciar rangos (Aprendiz, Vigía, Centinela, Estratega), que iban con el nivel: anuncian la probabilidad de convergencia (12 %, 31 %, más del 50 %). Los capítulos 10 y 15 pasan a llamarse «Canal de imagen» y «Sin precedentes» | A |
| C17-49 | Los tiempos que dicen los mensajes salen de lo que lleva cada jugador; las transmisiones, grabadas, no dicen tiempos; el epílogo escribe los días reales (D-240) | A |
| C17-50 | Un vecino que el capítulo necesita y que aún no ha llegado por nivel llega con el capítulo | A |
| C17-51 | Superar la prueba del programa del tramo es el pase al capítulo siguiente, aunque su XP no cuente para la experiencia exigida (D-241) | A |
| C17-52 | Nada avisa de cuándo llega el próximo capítulo: cada uno es un hackeo por sorpresa (D-242) | A |
