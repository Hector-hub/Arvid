# Spec 15 — Amigos y retos

Estado: **aprobada** (2026-10-27) · Parte de la 2.0 (D-139)
Decisiones que implementa: D-144 a D-150
Depende de: spec 14 (cuenta, ID público, sesión y nivel en el servidor)
Modifica:
- alcance: la competición deja de estar excluida **solo en los retos entre amigos**;
- spec 10 (notificaciones): avisos nuevos;
- Perfil: «Amigos» y «Retos cumplidos»;
- Hoy: las actividades de reto llevan su marca.

## 1. Objetivo
Hacer hábitos **con otras personas**: crear un reto («Leer durante 7 días»), invitar con un enlace, ver cómo va cada uno y celebrarlo juntos (cooperativo) o ver quién aguanta más (competitivo). Las personas con las que haces retos se convierten en **amigos**, para invitarlas fácilmente después.

## 2. Alcance
**Incluye:**
- Amigos: enlace de amistad, solicitudes, lista, eliminar y bloquear.
- Retos: crear, invitar, aceptar, marcar el día, marcador, abandonar y terminar.
- Retos cumplidos en el Perfil.
- Avisos push de amigos y retos.
- Sincronización offline-first del progreso de los retos.

**Excluye:**
- Chat entre amigos.
- Ranking general o público.
- Retos de «N veces» o con objetivo distinto a «cada día».
- Retos sin cuenta: hace falta la cuenta de la spec 14 (D-140).
- Moderación de contenido más allá de los límites de longitud (R15-3).

## 3. Requisitos funcionales

### 3.1 Amigos (AM, D-144, D-147, D-150)
- **AM-01. Enlace de amistad:** en **Perfil → Amigos → Invitar amigos** se comparte `…/a/<ID de cuenta>`, con la hoja de compartir del sistema o «Copiar enlace».
- **AM-02.** Al abrir un enlace de amistad sale **«{alias} quiere ser tu amigo»** con «Aceptar» y «Rechazar».
  - Aceptar hace la amistad **mutua al instante** (D-147).
  - Rechazar no avisa a la otra persona.
  - Si quien lo abre no tiene cuenta, primero se ofrece crearla (spec 14) y después aparece la invitación.
- **AM-03. Solicitud de amistad tras un reto:** si aceptas un reto de alguien que no es tu amigo, se ofrece **«Añadir a {alias} a amigos»**.
  - Si lo pulsas, a esa persona le llega una **solicitud** («{alias} quiere ser tu amigo»).
  - Solo si la acepta sois amigos mutuamente (D-147).
- **AM-04. Lista de amigos:** alias, nivel y número de retos hechos juntos (D-144). Al tocar uno se ven los retos en común, «Invitar a un reto», «Eliminar» y «Bloquear».
- **AM-05. Eliminar:** sale de las dos listas, sin aviso. Los retos en curso siguen.
- **AM-06. Bloquear:**
  - elimina la amistad;
  - impide que esa persona te invite, te envíe solicitudes o vea tu alias en nuevas invitaciones;
  - en los retos en curso sigue apareciendo hasta que alguno los abandone;
  - se puede desbloquear en Perfil → Amigos → Bloqueados.
- **AM-07. Solicitudes pendientes:** se ven arriba de la lista, con «Aceptar» y «Rechazar». Caducan a los 30 días.
- **AM-08. Límite:** 100 amigos.

### 3.2 Crear un reto (RT, D-145, D-146)
- **RT-01. Dónde:**
  - en la pestaña **Objetivos**, que pasa a tener dos secciones: «Objetivos» y «Retos» (S15-03);
  - desde un amigo, con «Invitar a un reto».
- **RT-02. Qué se elige:**
  - **Nombre de la actividad**, de 1 a 40 caracteres (por ejemplo «Leer 10 páginas»);
  - **Área de vida**, de las tuyas; cada participante la ajusta al aceptar;
  - **Dificultad**: fácil, media o difícil;
  - **Duración**: 7, 14, 21 o 30 días, o entre 3 y 60;
  - **Fecha de inicio**: hoy o hasta 30 días después;
  - **Modo**: cooperativo o competitivo.
- **RT-03.** Al crearlo, el creador es el primer participante y se le crea su actividad (RT-07).
- **RT-04. Cancelar:** el creador puede cancelarlo **antes de que empiece**. Se avisa a quien ya aceptó, a quien se le archiva la actividad.
- **RT-05. Límites:**
  - 5 retos activos o por empezar por persona;
  - 20 participantes por reto (D-145).

### 3.3 Invitar y aceptar (IN, D-147)
- **IN-01. Enlace del reto:** `…/r/<ID del reto>`, con la hoja de compartir o copiando el enlace. Desde la lista de amigos también se puede invitar directamente, sin enlace: les llega como aviso.
- **IN-02.** Al abrirlo sale una tarjeta con:
  - **«{alias} te invita a un reto»**;
  - la actividad, el modo, la duración, las fechas y los participantes actuales;
  - «Aceptar» y «Rechazar».

  Sin cuenta, primero se ofrece crearla.
- **IN-03. Hasta cuándo se acepta:** **hasta el día de inicio incluido** (D-145). Después: «Este reto ya empezó». Con 20 participantes: «Este reto está completo».
- **IN-04. Al aceptar:**
  1. te unes al reto;
  2. se crea tu actividad (RT-07);
  3. si quien te invitó no es tu amigo, se ofrece añadirlo (AM-03).
- **IN-05. Bloqueos:** un enlace de alguien que te bloqueó o al que bloqueaste muestra «Este enlace no está disponible».

### 3.4 La actividad del reto (RT, D-145, D-148)
- **RT-07.** Al unirte se crea **siempre una actividad nueva** (D-145):
  - diaria, de 1 vez al día;
  - con el nombre, el área y la dificultad del reto;
  - con fecha de inicio igual a la del reto;
  - con la marca **«Reto»**, que la enlaza con el reto.
- **RT-08. Su XP es la de una actividad normal** (D-148): no hay XP extra.
- **RT-09. En Hoy** aparece como las demás, con la marca «Reto · día 3 de 7» y, al tocarla, el detalle del reto.
- **RT-10. No se edita:** nombre, periodo y fechas vienen del reto. Sí se pueden cambiar los recordatorios y el área.
- **RT-11. Al terminar** (o al abandonar) el reto, la actividad **se archiva sola**. Su historial y su XP se quedan.
- **RT-12. Los descansos (spec 12) no se aplican** a las actividades de reto: un día de descanso cuenta como no cumplido en el reto. Se avisa al planificar un descanso que coincida con un reto.

### 3.5 Marcar y sincronizar (SY, D-140)
- **SY-01. Cumplir un día** es registrar la actividad del reto ese día, como cualquier otra actividad, también sin conexión.
- **SY-02. Lo que se envía al servidor** son solo las **fechas cumplidas** de tu actividad de reto: `{ reto, fecha }`. Nada más de tus datos.
  - Se envían al momento si hay conexión; si no, se quedan en cola y salen al volver.
  - Deshacer el registro lo retira.
- **SY-03. Días y zonas horarias:** cada día del reto es una **fecha local de cada participante**, de la fecha de inicio a la de fin.
- **SY-04. Margen sin conexión:** el servidor acepta cambios de un día hasta **2 días después** de ese día. Pasado ese plazo el día queda cerrado; así nadie rellena días antiguos.
- **SY-05. El progreso de los demás** se descarga:
  - al abrir la app;
  - al entrar en un reto;
  - cada 5 minutos mientras está abierta;
  - al recibir un aviso.

  Sin conexión se ve el último descargado, con «actualizado hace…».

### 3.6 El marcador (MK, D-146)
- **MK-01. Detalle del reto:**
  - nombre, modo, días transcurridos y restantes;
  - por cada participante: su alias, una tira de días (cumplido, no cumplido o por llegar) y, si lo hay, «Hoy ✓».
- **MK-02. Cooperativo:**
  - una barra con la **meta del grupo**: la suma de días cumplidos de todos frente al 80 % del total (participantes × días);
  - por ejemplo: «Llevamos 23 de 28 días necesarios».
  - Quien abandona deja de sumar al total desde ese día.
- **MK-03. Competitivo:**
  - participantes ordenados por días cumplidos;
  - los empates comparten puesto;
  - el que va primero lleva una corona pixel.
- **MK-04. Abandonar:**
  - con confirmación flotante;
  - en el marcador quedas como **«abandonó»** con tus días hasta entonces;
  - tu actividad se archiva y no se puede volver a entrar.

### 3.7 El final (FN, D-146, D-148)
- **FN-01. Cuándo termina:** al acabar el último día y pasado el margen de SY-04 (2 días) se calcula el resultado.
  - Mientras tanto se ve «Terminado · resultado en 2 días» y el marcador provisional.
- **FN-02. Cooperativo:** **«¡Lo lograsteis!»** si el grupo llegó al 80 %; si no, «Esta vez no: llegasteis al 64 %».
- **FN-03. Competitivo:** **«Ganó {alias}»** o «Empate entre…», más tu puesto.
- **FN-04. Retos cumplidos en el Perfil:** un apartado con los terminados, con nombre, fechas, modo, resultado y tus días.
  - En el competitivo, cuenta como **cumplido** si cumpliste al menos el 80 % de los días, ganes o no.
  - En el cooperativo, si el grupo lo logró y tú no abandonaste.
- **FN-05.** El compañero celebra el resultado al abrir la app (sin IA o con IA, como los otros momentos).

### 3.8 Avisos (AV, D-149)
Se configuran en **Ajustes → Notificaciones**, en un grupo nuevo «Amigos y retos» con interruptor por tipo:
- **AV-01. Invitaciones y amistad** (al momento): invitación a un reto, solicitud de amistad y «{alias} aceptó tu solicitud».
- **AV-02. Recordatorio del reto:**
  - si a la hora del resumen de la tarde (spec 10) no has marcado el reto de hoy, entra en ese mismo aviso («…y el reto Leer»);
  - no se manda un aviso aparte.
- **AV-03. Avances de otros:** **como mucho uno al día por reto**, a la hora en que más participantes ya cumplieron:
  - cooperativo: «4 de 5 ya cumplieron hoy en Leer»;
  - competitivo: «{alias} te adelantó en Leer» (solo si te adelantó).
- **AV-04. Final del reto:** con el resultado (FN-02, FN-03).
- **AV-05. Vínculo con la cuenta:** la suscripción push de cada dispositivo se asocia a la cuenta al entrar, para poder avisarte en todos tus dispositivos.

### 3.9 Abrir los enlaces (EN)
- **EN-01.** `…/a/<id>` y `…/r/<id>` abren la app en esa invitación.
- **EN-02. En Android,** con la app instalada, los enlaces se abren en ella (los enlaces del dominio de la PWA los captura Chrome).
- **EN-03. En iPhone** el enlace se abre en **Safari**, que no comparte datos con la app instalada. La página de Safari muestra la invitación y:
  - «Abrir en la app: copia el enlace, abre ARVID y pégalo en Perfil → Amigos → **Tengo un enlace**»;
  - con un botón «Copiar enlace».

  Además, al volver a la app, si el portapapeles tiene un enlace de ARVID, se ofrece abrirlo. Leer el portapapeles es una acción del usuario: el sistema puede pedir permiso.
- **EN-04.** Si se abre en un navegador sin ARVID instalado, se puede usar ahí mismo: es la app web completa.

## 4. Diseño técnico

### 4.1 Almacenamiento: Netlify Blobs
**Propuesta (S15-01):** seguir con **Netlify Blobs**. Se diseña para que **cada persona escriba solo sus propios documentos**, así casi no hay choques; donde hay dos escritores (las amistades), se usan ETags con reintento.

| Store | Clave | Contenido | Quién escribe |
|---|---|---|---|
| `social` | `friends:<cuenta>` | `{ friends: [{ id, since }], blocked: [ids], requests: [{ from, at }] }` | El servidor, en las dos cuentas (ETag) |
| `challenges` | `c:<reto>` | `{ id, owner, name, category, difficulty, days, start, mode, createdAt, cancelled? }` | El creador |
| `challenges` | `c:<reto>:p:<cuenta>` | `{ alias, joinedAt, done: [fechas], left?: fecha }` | Solo ese participante |
| `challenges` | `u:<cuenta>` | Lista de los retos de esa persona | El servidor, al unirse o salir |

- Para leer el marcador se listan las claves con el prefijo `c:<reto>:p:`. Con 20 participantes son 20 lecturas pequeñas, cacheadas un minuto.
- El nivel y el alias se leen de la cuenta (spec 14, PV-02).
- **Por qué no Postgres todavía:** las únicas consultas son «mis amigos», «mis retos» y «los participantes de un reto», y todas se resuelven por clave o prefijo. Si un día hace falta buscar o agregar entre usuarios, se migra.

### 4.2 Funciones
- **`netlify/functions/social.mts`** (`/api/social/*`):
  - amigos: `link`, `accept`, `request`, `respond`, `remove`, `block` y `unblock`;
  - retos: `create`, `get`, `join`, `mark`, `unmark`, `leave` y `cancel`;
  - `mine`.

  Todo requiere la sesión de la spec 14.
- **Avisos:** los de AV-01 y AV-04 salen desde la función al momento. Los de AV-02 y AV-03 los calcula el cron existente (`push-send-day`), que ya corre cada hora de día.
- **El resultado (FN-01)** lo calcula el servidor la primera vez que alguien consulta un reto terminado y pasado el margen; después se guarda en `c:<reto>`.

### 4.3 App
- **Tablas nuevas en Dexie (versión 5):**
  - `challenges`: la copia local de cada reto, con el marcador descargado;
  - `socialQueue`: las marcas pendientes de enviar.

  Las actividades ganan `challengeId`, opcional.
- **Copia de seguridad:** las actividades de reto viajan en el backup como cualquier actividad, y `challenges` también, como copia local. La cola no viaja.
- **Rutas:** `/a/:id`, `/r/:id`, `/retos`, `/retos/:id` y `/perfil/amigos`.
- **Flag:** detrás de `VITE_ACCOUNTS`, como la spec 14.

## 5. Requisitos no funcionales
- **NFR15-01.** El servidor solo recibe del uso de un reto las fechas cumplidas (SY-02); nunca otras actividades ni datos personales.
- **NFR15-02.** Todo lo del reto funciona sin conexión salvo crear, invitar, aceptar y ver el progreso actualizado de los demás.
- **NFR15-03. Límites:**
  - 20 retos creados al día por cuenta;
  - 50 invitaciones directas al día;
  - 60 marcas por hora.
- **NFR15-04.** Textos nuevos en `es.json` y `en.json`.
- **NFR15-05.** Accesible: el marcador tiene una alternativa en lista para lectores de pantalla (como el radar, C-002).

## 6. Ejemplos (Given/When/Then)
**IN + AM-03 · Invitado que no es amigo**
- Given Ana crea «Leer · 7 días · cooperativo» y comparte el enlace con Luis
- When Luis lo abre, acepta y pulsa «Añadir a Ana a amigos»
- Then Luis está en el reto con su actividad «Leer» y Ana recibe «Luis quiere ser tu amigo»; si acepta, son amigos

**MK-02 · Cooperativo**
- Given 4 participantes y 7 días (28 en total; meta 23)
- When al final suman 24 días
- Then «¡Lo lograsteis!» y aparece en Retos cumplidos de quienes no abandonaron

**SY-04 · Sin conexión**
- Given Luis marca el día 3 en modo avión
- When recupera la conexión el día 4
- Then la marca sube y el día 3 cuenta

## 7. Riesgos
- **R15-1 · Enlaces en iPhone:** se abren en Safari, no en la PWA.
  - *Mitigación:* EN-03 («Tengo un enlace» y detección en el portapapeles). Probarlo en 15a.
- **R15-2 · Trampas:** cualquiera puede marcar sin hacerlo.
  - *Mitigación:* es un sistema de confianza entre amigos; SY-04 evita rellenar días antiguos.
- **R15-3 · Nombres ofensivos** en los retos.
  - *Mitigación:* solo los ven amigos o quien tiene el enlace; se puede bloquear y abandonar.
- **R15-4 · Avisos excesivos.**
  - *Mitigación:* AV-02 va dentro del resumen, AV-03 como mucho uno al día por reto, y hay interruptores por tipo.
- **R15-5 · Coste de Netlify Blobs** con muchas lecturas del marcador.
  - *Mitigación:* caché de un minuto y lectura cada 5 minutos como mucho.

## 8. Plan de entrega
| Fase | Qué |
|---|---|
| **15a** ✅ (1.8.8) | Amigos: enlaces, solicitudes, lista, bloquear y la ruta en iPhone (EN-03) |
| **15b** | Retos: crear, invitar, aceptar, actividad, marcar y sincronizar, marcador y abandonar |
| **15c** | Final, retos cumplidos en el Perfil, avisos y celebración del compañero |
| **2.0.0** | Con la spec 14, se enciende `VITE_ACCOUNTS` |

## 9. Decisiones de esta spec (aprobadas)
| ID | Propuesta |
|---|---|
| S15-01 | Netlify Blobs con documentos por participante (sin choques); Postgres solo si un día hace falta |
| S15-02 | Al servidor solo van las fechas cumplidas del reto; margen de 2 días para marcar sin conexión |
| S15-03 | Los retos van en la pestaña Objetivos, con dos secciones (Objetivos y Retos); los amigos, en el Perfil |
| S15-04 | Duración de 3 a 60 días (accesos rápidos 7, 14, 21 y 30) e inicio hasta 30 días después; como mucho 5 retos activos por persona |
| S15-05 | Los descansos no cuentan en los retos (se avisa al planificarlos) |
| S15-06 | Competitivo: cuenta como cumplido si hiciste al menos el 80 % de los días, ganes o no |
| S15-07 | Avances de otros: como mucho un aviso al día por reto; el recordatorio va dentro del resumen de la tarde |
| S15-08 | En iPhone los enlaces se abren en Safari: «Tengo un enlace» en la app y detección del portapapeles |
| S15-09 | La actividad del reto se archiva sola al terminar o abandonar; no se puede editar salvo recordatorios y área |

### Notas de implementación (15a)

- Las pruebas del servidor viven en `src/app/friends/social-server.test.ts` (no en `netlify/functions/`), junto a las de la cuenta.
- Detección del portapapeles (EN-03): en vez de leerlo solo al volver a la app (iOS pide permiso cada vez), «Tengo un enlace» tiene un botón **Pegar** que lo lee con un toque del usuario y abre la invitación.
- «Retos juntos» se muestra a 0 hasta la 15b; «Invitar a un reto» llega con la 15b.
