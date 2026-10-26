# Spec 13 — Memoria del compañero

Estado: **aprobada** (2026-10-26) · Incremento posterior a la 1.5.3
Decisiones que implementa: D-129 a D-134 (descubrimiento del 2026-10-26)
Modifica:
- spec 06 (chat e IA): historial e instrucciones;
- D-127: la cabecera del chat pasa a tener un menú de tres puntos;
- spec 12 (AC): el compañero puede proponer y, además, recordar.

## 1. Objetivo
Que ARVID o DARIS **te vayan conociendo**: que guarden notas breves sobre ti (cómo te gusta que te hablen, qué te motiva, tus horarios, lo que te cuesta) y las usen para adaptar su tono y sus consejos. Al mismo tiempo, cada petición a la IA debe seguir siendo ligera: **notas + los últimos 10 mensajes**, no toda la conversación.

## 2. Alcance
**Incluye:**
- Notas de memoria creadas por el compañero o a petición tuya.
- Su uso en todo lo que el compañero dice con IA.
- La pantalla «Lo que {compañero} sabe de ti».
- Un menú de tres puntos en el chat.
- El historial a partir de la conversación guardada.

**Excluye:**
- Memoria de los vecinos.
- Resúmenes automáticos de la conversación.
- Sincronización entre dispositivos.

## 3. Requisitos funcionales

### 3.1 Notas (ME, D-129, D-131)
- **ME-01.** Una nota tiene:
  - texto, de 1 a 120 caracteres, en el idioma del usuario y en tercera persona (por ejemplo, «Prefiere entrenar por la mañana»);
  - su origen: **pedida** (`user`) o **del compañero** (`companion`);
  - fechas de creación y de cambio.
- **ME-02.** **Como mucho 30 notas** (D-131). Al llegar al límite, el compañero debe fusionar o sustituir notas existentes en lugar de añadir. Si aun así intenta añadir una, se descarta la nota más antigua del compañero; **las que pediste tú no se descartan solas**. Si todas son tuyas, la nueva no se guarda y el compañero lo dice.
- **ME-03.** **Una sola memoria** para ARVID y DARIS: las notas son sobre ti (D-133).

### 3.2 Cómo se crean (MC, D-129)
Se crean de las dos formas:
- **MC-01.** **A petición tuya:** cuando dices «recuerda que…», «no olvides que…» o algo parecido, el compañero la guarda siempre, como nota pedida.
- **MC-02.** **Por iniciativa del compañero:** si en la conversación aparece algo útil y duradero sobre ti (una preferencia, un horario, una dificultad o una motivación), puede guardarlo. Nunca guarda datos sensibles: salud, ideología, religión, orientación sexual, contraseñas, datos bancarios ni de terceros.
- **MC-03.** **Siempre te avisa:** en la conversación aparece una línea «Lo recordaré: «Prefiere entrenar por la mañana»» (o «Lo he actualizado…» / «Lo he olvidado…»). Así sabes en todo momento qué guarda.
- **MC-04.** **Herramientas** (function calling, como en la spec 12). Las notas se envían con identificadores cortos (`n1`, `n2`…) para que pueda referirse a ellas:
  - `remember` (texto, origen);
  - `update_memory` (id, texto);
  - `forget` (id).

  En un mismo mensaje puede hacer varias operaciones de memoria y, además, como mucho una propuesta de la spec 12.
- **MC-05.** **Validación** en el servidor y en la app: textos de 1 a 120 caracteres e identificadores existentes. Lo que no es válido se ignora.

### 3.3 Uso (MU, D-134)
- **MU-01.** Las notas se inyectan como **mensaje de sistema, antes del contexto**, en **todo lo que el compañero dice con IA**: chat, saludo, consejo de Disciplina y comentarios por iniciativa propia. **No** en los vecinos.
- **MU-02.** Instrucción: usar las notas para adaptar el tono y las sugerencias, sin recitarlas ni mencionarlas salvo que venga a cuento.
- **MU-03.** **Historial del chat** (D-132): se envían los **últimos 10 mensajes de la conversación guardada** (tuyos y suyos, también los de iniciativa propia), aunque hayas cerrado la app. No se envían las líneas de memoria de MC-03 ni los «…» de espera. Se sustituye el historial en memoria de la sesión.
- **MU-04.** Coste: con 30 notas, unos 1.000 tokens más por petición, como máximo. No cambian los créditos: 1 por mensaje.

### 3.4 Interfaz (MI, D-130)
- **MI-01.** **Menú de tres puntos** en la cabecera del chat, en lugar de la papelera:
  - **Lo que {compañero} sabe de ti** (con el número de notas);
  - **Borrar conversación**;
  - **Borrar memoria completa**.

  Se abre como un menú flotante. Se cierra con Esc o tocando fuera.
- **MI-02.** **Lo que {compañero} sabe de ti** (`/chat/memoria`):
  - la lista de notas, de la más reciente a la más antigua, con su fecha y una etiqueta «La pediste» si es pedida;
  - un botón para borrar cada una;
  - una explicación breve de que se envían a Mistral con cada mensaje;
  - «Borrar memoria completa» al final.
- **MI-03.** **Confirmaciones flotantes**, como en D-127:
  - «¿Borrar toda la conversación?», que no borra la memoria;
  - «¿Borrar todo lo que {compañero} sabe de ti?», que no borra la conversación.

  Borrar una sola nota no pide confirmación, pero se puede deshacer durante unos segundos.
- **MI-04.** El texto de permiso de la IA (Ajustes y onboarding) menciona que también se envían las notas de memoria.

## 4. Datos
| Dónde | Qué | En el backup |
|---|---|---|
| Tabla nueva `memories` | `{ id, text, source: 'user' \| 'companion', createdAt, updatedAt }` | Sí (D-133) |

Dexie pasa a la versión 4, con la tabla nueva y vacía. Los backups anteriores se siguen importando, sin notas.

## 5. Requisitos no funcionales
- **NFR13-01.** La IA nunca escribe directamente en la base de datos: devuelve operaciones validadas que aplica la app.
- **NFR13-02.** Cada petición incluye, como mucho, 30 notas de 120 caracteres y 10 mensajes.
- **NFR13-03.** Los textos nuevos van en `es.json` y `en.json`.

## 6. Ejemplos (Given/When/Then)
**MC-01 · Pedida**
- When escribes «Recuerda que los lunes trabajo hasta tarde»
- Then aparece «Lo recordaré: «Los lunes trabaja hasta tarde»» y la nota queda como pedida

**MU-01 · Uso**
- Given la nota «Le motivan los retos cortos»
- When abres la app por la mañana
- Then el saludo con IA le propone un reto corto

**ME-02 · Límite**
- Given 30 notas, 5 de ellas del compañero
- When el compañero intenta añadir otra
- Then se descarta la más antigua del compañero y se guarda la nueva

## 7. Riesgos
- **R13-1 · Notas equivocadas o que no quieres.** *Mitigación:* siempre te avisa (MC-03), puedes borrarlas una a una (MI-02) y nunca guarda datos sensibles (MC-02).
- **R13-2 · ministral-8b guarda demasiado.** *Mitigación:* instrucciones de guardar solo lo duradero y útil, límite de 30 notas y revisión manual después de desplegar.
- **R13-3 · Privacidad:** las notas viajan a Mistral con cada mensaje. *Mitigación:* aviso en la pantalla de memoria y en el permiso de la IA.

## 8. Plan de entrega
- **1.6.0:** todo lo anterior.

## 9. Decisiones de esta spec (aprobadas)
| ID | Propuesta |
|---|---|
| S13-01 | Notas pedidas y por iniciativa del compañero, siempre avisadas en el chat, sin datos sensibles (D-129) |
| S13-02 | Menú de tres puntos en el chat: ver memoria, borrar conversación y borrar memoria; pantalla con la lista y borrar una a una (D-130) |
| S13-03 | Como mucho 30 notas de 120 caracteres; al llenarse se descarta la más antigua del compañero, nunca una pedida (D-131) |
| S13-04 | Historial: los últimos 10 mensajes de la conversación guardada (D-132) |
| S13-05 | En el backup y compartida por ARVID y DARIS (D-133) |
| S13-06 | Se usan en todo lo que el compañero dice con IA, no en los vecinos (D-134) |
| S13-07 | Entrega en 1.6.0 |
