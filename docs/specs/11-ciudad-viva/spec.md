# Spec 11 — Ciudad viva: la escena se gana

Estado: **aprobada** (2026-10-25) · Incremento posterior a la 1.1.0
Decisiones que implementa: D-109 a D-114 (descubrimiento del 2026-10-25)
Modifica:
- spec 05: ESC, qué se dibuja según el nivel;
- spec 06: los momentos del compañero (anuncio de llegadas);
- función `/api/arvid`: nuevo momento `neighbor`, que no gasta créditos (D-100).

Se adelanta de la P2 una forma sencilla de «Refugio o mundo».

## 1. Objetivo
Que tu progreso **se vea en tu ciudad**. Al empezar, la calle está vacía. Con cada nivel llega algo nuevo (luces, tráfico, drones, vecinos) hasta el **nivel 10**, en el que la escena queda como hoy. Los vecinos tienen nombre y carácter, y de vez en cuando te dicen algo.

Principios:
- **Nunca se pierde nada.** Lo que se gana depende del nivel, que nunca baja (D-011).
- **Los vecinos acompañan**, como el compañero: comentarios cortos y amables, sin juicios.

## 2. Alcance
**Incluye:**
- Desbloqueo por nivel de los elementos de la escena y de 10 vecinos.
- Anuncio de cada llegada.
- Pantalla «Tu ciudad».
- Vecinos que hablan (con IA o con frases fijas).

**Excluye:**
- Elementos nuevos que no existan hoy.
- Comprar o elegir elementos.
- Que los vecinos respondan al chat.
- Diálogos entre vecinos.

## 3. Requisitos funcionales

### 3.1 Qué se gana y cuándo (CV, D-109, D-110)
- **CV-01.** **Nivel 1, solo lo imprescindible:**
  - del fondo, solo la capa 1: el cielo y el horizonte lejano;
  - carretera, acera y barandilla;
  - protagonista y compañero;
  - partículas de celebración (son la respuesta a tus acciones, no decoración).
- **CV-02.** Llegadas por nivel:

| Nivel | Llega |
|---|---|
| 2 | **Farolas** · **Dex**, músico callejero (guitarra) |
| 3 | **Rascacielos** (capa 2 del fondo) · **Drones del cielo** · **Omar**, repartidor (mochila) |
| 4 | **Coches** (rojo y amarillo) · **Lía**, vuelve del trabajo (bolso) |
| 5 | **Nova**, estudiante (pelo verde) · **Pip**, el niño que corre (gorra roja) |
| 6 | **Cajas de la acera**, que ARVID inspecciona · **Kenji**, mecánico del turno de noche |
| 7 | **Edificios cercanos** (capa 3 del fondo: ventanas, la torre y el cartel) · **Roxy**, DJ (pelo rosa y gafas) |
| 8 | **Mía**, la hermana de Pip · **Teo**, programador del barrio (silla de ruedas) |
| 9 | **Coche de policía** |
| 10 | **Sombra**, el mensajero encapuchado. La ciudad queda completa |

- **CV-03.** Sin cajas de la acera (niveles 1–5), ARVID no pasea a inspeccionar: escanea en su sitio de vez en cuando (ESC-07). DARIS no cambia.
- **CV-04.** **Usuarios actuales:** al actualizar ven desbloqueado todo lo de su nivel, sin anuncios uno a uno. El compañero dice una sola frase de bienvenida: «Tu ciudad ahora crece contigo: mira «Tu ciudad» en tu perfil».

### 3.2 Anuncio (AN, D-112)
- **AN-01.** Al subir a un nivel con llegadas, después del aviso de subida de nivel, el compañero las anuncia. Por ejemplo: «Han llegado los coches a tu calle… y Lía, que vuelve del trabajo.»
- **AN-02.** En la escena, lo nuevo aparece con un **brillo** breve la primera vez (las capas del fondo, apareciendo poco a poco). Con movimiento reducido, sin brillo.
- **AN-03.** Si se suben varios niveles de golpe (por ejemplo, al registrar algo atrasado o importar un backup), se anuncia todo en una sola frase.

### 3.3 Pantalla «Tu ciudad» (TC, D-112)
- **TC-01.** En **Perfil → Tu ciudad**: una lista con cada elemento y cada vecino.
  - **Desbloqueados:** su imagen, su nombre y su descripción corta.
  - **Pendientes:** una silueta oscura y «Nivel N».
- **TC-02.** Arriba se muestra el avance: «8 de 17 · Siguiente: nivel 6».

### 3.4 Vecinos que hablan (VC, D-111, D-113, D-114)
- **VC-01.** Cada vecino tiene **nombre, carácter y frases fijas propias** (3–5 en cada idioma).
- **VC-02.** **Cuándo hablan:**
  - la primera vez que un vecino desbloqueado entra en pantalla cada día, tiene un **10 %** de probabilidad de decir algo;
  - en total, **como mucho 1 vecino al día** (en ese dispositivo);
  - si ya habló uno, ninguno más hasta mañana.
- **VC-03.** **Nunca a la vez que el compañero.** Si el compañero está hablando, el vecino no habla y pierde su turno de ese día.
- **VC-04.** **Burbuja:** sale del vecino y **le sigue mientras camina**, sin detenerse. Dura lo mismo que una burbuja del compañero o hasta que el vecino sale de la escena.
- **VC-05.** **Con IA** («{compañero} con IA» activado, código válido y conexión): el texto lo escribe Mistral con la personalidad del vecino y **el mismo contexto que el compañero** (IA-04).
  - Nuevo momento `neighbor` en `/api/arvid`, que recibe el identificador del vecino.
  - Instrucciones: hablar como ese vecino del barrio, en una frase corta, reaccionando al progreso sin juzgar.
- **VC-06.** **No gasta créditos.** El servidor cuenta los mensajes `neighbor` aparte: como mucho **1 por código y día**. Si ya se usó, responde con el aviso de «sin créditos» y la app usa una frase fija. Esto también protege de abusos.
- **VC-07.** **Sin IA, sin conexión o si falla:** frase fija del vecino.
- **VC-08.** Lo que dicen los vecinos **no va a la conversación con el compañero** (D-098), que es solo con él.

## 4. Datos
| Dónde | Clave | Contenido | En el backup |
|---|---|---|---|
| Ajustes | `cityAnnounced` | Último nivel cuyas llegadas ya se anunciaron (AN-01, CV-04) | No (del dispositivo) |
| Ajustes | `neighborSpoke` | Fecha local en que habló un vecino (VC-02) | No |
| Servidor (Blobs) | `ai-usage/<código>` | Se añade `neighbor: { day }` a la entrada del código (VC-06) | — |

Lo desbloqueado **no se guarda**: se calcula a partir del nivel, como todo el progreso.

## 5. Requisitos no funcionales
- **NFR11-01.** No se añaden imágenes: se usan los sprites que ya existen. La silueta de la pantalla «Tu ciudad» se genera a partir del sprite.
- **NFR11-02.** El rendimiento de la escena no empeora.
- **NFR11-03.** Todos los textos y frases van en `es.json` y `en.json`.

## 6. Ejemplos (Given/When/Then)
**CV-02 · Subida al nivel 4**
- Given nivel 3, con farolas, drones, Dex y Omar
- When registras una actividad y subes al nivel 4
- Then tras el aviso de nivel, el compañero dice «Han llegado los coches a tu calle… y Lía, que vuelve del trabajo», y empiezan a pasar coches rojos y amarillos y Lía

**VC-02 · Un vecino al día**
- Given Dex ya habló hoy
- When pasa Omar por primera vez en el día
- Then Omar no dice nada

**VC-06 · Sin gastar créditos**
- Given te quedan 3 créditos de IA hoy
- When Pip habla con IA
- Then te siguen quedando 3

## 7. Riesgos
- **R11-1 · Primera impresión:** al principio, la calle vacía puede parecer pobre. *Mitigación:* las primeras llegadas son rápidas (nivel 2 al segundo día) y el compañero explica que la ciudad crecerá.
- **R11-2 · Ritmo:** con menos actividades, el nivel 10 tarda más de 3 meses. *Mitigación:* la tabla de CV-02 es ajustable y está en un solo sitio.
- **R11-3 · IA de los vecinos sin créditos:** podría abusarse. *Mitigación:* el servidor limita a 1 por código y día (VC-06) y se mantiene el límite por IP.

## 8. Plan de entrega
- **1.2.0:** todo lo anterior.

## 9. Decisiones de esta spec (aprobadas)
| ID | Propuesta |
|---|---|
| S11-01 | Escena completa en el nivel 10; reparto de la tabla CV-02 (D-109) |
| S11-02 | Nivel 1 con solo lo imprescindible, más las partículas (D-110) |
| S11-03 | Vecinos uno a uno, con nombre y carácter (D-111) |
| S11-04 | Anuncio del compañero y pantalla «Tu ciudad» (D-112) |
| S11-05 | Como mucho 1 vecino al día, 10 % al verlo; con IA usa el mismo contexto que el compañero y no gasta créditos (1 por código y día); sin IA, frases fijas (D-113) |
| S11-06 | Burbuja que sigue al vecino, nunca a la vez que el compañero (D-114) |
| S11-07 | Usuarios actuales: todo lo de su nivel, con una frase de bienvenida |
| S11-08 | Lo que dicen los vecinos no va a la conversación con el compañero |
| S11-09 | Entrega en 1.2.0 |
