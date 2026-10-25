# Spec 10 — Notificaciones y badge

Estado: **aprobada** (2026-10-25) · Incremento P1 (primero tras la 1.0.0)
Decisiones que implementa: D-102 a D-107 (descubrimiento del 2026-10-25)
Modifica:
- spec 01: formulario de actividad (recordatorios);
- spec 06: onboarding (paso nuevo) y Ajustes;
- D-030: el badge entra con las notificaciones.

## 1. Objetivo
Que ARVID te recuerde lo que falta **aunque no abras la app**, sin que tus datos salgan del móvil: un resumen por la mañana y otro por la noche, recordatorios por actividad y el número de pendientes en el icono.

Principio: los avisos **acompañan, no presionan**. Pocos, a tus horas, en la voz del compañero, y siempre se pueden apagar.

## 2. Alcance
**Incluye:**
- Notificaciones Web Push (sin Firebase).
- Resumen de la mañana y de la noche.
- Recordatorios por actividad.
- Badge en el icono.
- Ajustes → Notificaciones.
- Un paso nuevo en el onboarding.

**Excluye:**
- Notificaciones con IA (gastan créditos y necesitan conexión en el momento).
- Avisos de logros o de subida de nivel.
- Sincronizar la configuración entre dispositivos.
- Notificaciones por correo.

## 3. Requisitos funcionales

### 3.1 Activación (NT, D-106)
- **NT-01.** **Ajustes → Notificaciones**: interruptor general, apagado por defecto. Al activarlo se pide el permiso del sistema. Si se deniega, el interruptor vuelve a apagado y se explica cómo darlo desde los ajustes del sistema.
- **NT-02.** **Onboarding:** paso nuevo «Notificaciones», después del de la IA. Botones «Activar» y «Ahora no».
- **NT-03.** **iPhone sin instalar** (Safari solo permite notificaciones a la app instalada, iOS 16.4+): el interruptor y el paso explican que primero hay que instalarla. El paso de instalación ya existe en el onboarding y va antes.
- **NT-04.** **Navegador sin soporte:** el apartado lo indica y no muestra el interruptor.
- **NT-05.** Las notificaciones son **por dispositivo**. Su configuración no va en el backup: cada móvil activa las suyas.

### 3.2 Resúmenes (RS, D-103, D-104)
- **RS-01.** **Mañana**, a las 7:00 por defecto: el plan del día. Por ejemplo: «Hoy tienes 3 actividades y 1 misión. La misión «Pagar luz» vence hoy.» Incluye las misiones que vencen hoy.
- **RS-02.** **Noche**, a las 22:00 por defecto: lo que falta. Por ejemplo: «Te quedan 2 actividades. Tu racha de Leer se rompe hoy si no la registras.» Incluye las **rachas en peligro**, es decir, las que se rompen al terminar el día.
- **RS-03.** Las dos horas son configurables en Ajustes (selector de hora). Cada resumen se puede desactivar por separado.
- **RS-04.** Las horas son las de la **zona horaria del dispositivo**, que se envía al servidor y se actualiza al cambiar.

### 3.3 Recordatorios por actividad (RA, D-105)
- **RA-01.** En el formulario de la actividad, «Recordatorios» (opcional), con **tantos huecos como veces del periodo**:
  - **diaria × N:** N horas;
  - **semanal × N:** N pares de día de la semana y hora (por ejemplo, lunes 7:00, miércoles 7:00, viernes 18:00);
  - **mensual × N:** N pares de día del mes y hora (1–31; en meses cortos, el día 31 pasa al último día del mes).

  Cada hueco se puede dejar vacío.
- **RA-02.** Si se reduce el número de veces, sobran recordatorios: se conservan los primeros y el formulario avisa.
- **RA-03.** Un recordatorio **se salta** si la actividad ya está cumplida en su periodo (por ejemplo, 3 de 3 esta semana), o si está pausada o archivada.
- **RA-04.** Texto: «Es hora de **Leer** (1 de 3 hoy).» En la voz del compañero.

### 3.4 Contenido y privacidad (PV, D-104, D-107)
- **PV-01.** El **servidor solo conoce horas**:
  - un identificador aleatorio del dispositivo;
  - la suscripción push;
  - la zona horaria;
  - las horas de los resúmenes;
  - una lista de instantes de recordatorio con un identificador opaco de la actividad.

  Nunca recibe nombres, progreso ni actividades.
- **PV-02.** A cada hora llega un **push vacío** (solo el tipo y el identificador opaco). El **service worker** lee los datos locales (IndexedDB), calcula el texto con la misma lógica que la pantalla Hoy y muestra la notificación.
- **PV-03.** **Ya hecho** (D-107): si a esa hora ya no queda nada que avisar, se muestra un mensaje breve de ánimo («Todo en orden por ahora. ¡Bien!»), porque Safari obliga a mostrar algo en cada push. Además, la app vuelve a subir la lista cada vez que cambian los datos y quita los avisos innecesarios.
- **PV-04.** La app sube los recordatorios de los **próximos 7 días** al abrirse, al registrar o deshacer algo, al editar actividades y al cambiar los ajustes. Si no se abre en 7 días, siguen llegando los resúmenes, que el servidor calcula solo con las horas, pero no los recordatorios por actividad.
- **PV-05.** Tocar una notificación abre ARVID en Hoy. Si ya estaba abierta, la trae al frente.

### 3.5 Badge (BG, D-030)
- **BG-01.** El icono muestra **cuántas actividades y misiones faltan hoy**. Desaparece al completarlo todo.
- **BG-02.** Se actualiza al abrir la app, al registrar o deshacer algo, y en cada push (el service worker lo recalcula).
- **BG-03.** Interruptor «Número en el icono» en Ajustes → Notificaciones, activado por defecto mientras las notificaciones están activas.
- **BG-04.** Donde no hay soporte, se ignora sin avisar. Android puede mostrar solo un punto, según el lanzador.

## 4. Diseño técnico (resumen)
- **Web Push con claves VAPID.**
  - La clave pública va en la app. La privada, en la variable `VAPID_PRIVATE_KEY` de Netlify; la crea el responsable y nunca va en el código.
  - Para enviar se usa la librería `web-push` en la función.
- **Funciones de Netlify:**
  - `/api/push` (POST): alta, actualización de horas y baja de un dispositivo. Validación con Zod, tamaño máximo y el mismo límite por IP que la IA.
  - **Dos funciones programadas** (D-108): cada minuto de 7:00 a 21:59 y cada hora en punto de 22:00 a 6:00 (hora de Santo Domingo). Envían lo que toca desde la ejecución anterior: de día, como mucho 1 minuto tarde; de noche, hasta 59 minutos.
- **Almacenamiento:** Netlify Blobs, store `push`, una entrada por dispositivo.
  - Si el servicio push responde 404 o 410 (suscripción caducada), la entrada se borra.
  - También se borran las entradas sin actualizar en 30 días.
- **Service worker:** pasa de `generateSW` a `injectManifest`, un service worker propio que mantiene la precarga sin conexión y añade los eventos `push` y `notificationclick`, reutilizando el dominio y Dexie.
- **Avisos que llegan tarde** (por ejemplo, el móvil estaba apagado): si un aviso llega más de 2 horas tarde, el service worker solo actualiza el badge y muestra el mensaje breve.

## 5. Datos
| Dónde | Clave | Contenido | En el backup |
|---|---|---|---|
| Actividad | `reminders` | `{ day?: 1–7 \| 1–31, time: 'HH:MM' }[]`, con longitud igual o menor que las veces del periodo | Sí |
| Ajustes | `notifications` | `{ enabled, morning: '07:00' \| null, night: '22:00' \| null, badge: true, deviceId }` | No (del dispositivo) |
| Servidor (Blobs) | `push/<deviceId>` | Suscripción, zona horaria, horas de los resúmenes, instantes de recordatorio con identificador opaco | — |

## 6. Requisitos no funcionales
- **NFR10-01.** Ningún dato personal sale del dispositivo, salvo horas e identificadores aleatorios (PV-01).
- **NFR10-02.** La app sigue funcionando entera sin conexión. Las notificaciones son un extra.
- **NFR10-03.** Coste: 0 €. Web Push es gratis, y las funciones programadas y Blobs entran en el plan gratuito de Netlify.
- **NFR10-04.** Todos los textos van en `es.json` y `en.json`, con `{companion}`.

## 7. Ejemplos (Given/When/Then)
**RS-02 · Noche con racha en peligro**
- Given son las 22:00, falta «Leer» (racha de 5 días) y «Correr»
- When llega el push de la noche
- Then: «Te quedan 2 actividades. Tu racha de Leer se rompe hoy si no la registras.»

**RA-03 · Recordatorio de una actividad ya cumplida**
- Given «Gimnasio» semanal × 3 con recordatorios lunes, miércoles y viernes, ya con 3 de 3 el miércoles
- When la app sube la lista
- Then el recordatorio del viernes no está en la lista

**PV-03 · Push que ya no hace falta**
- Given registraste «Leer» sin conexión, así que la app no pudo quitar su recordatorio de la lista del servidor
- When llega el recordatorio de «Leer»
- Then se ve «Todo en orden por ahora. ¡Bien!»

## 8. Riesgos
- **R10-1 · iPhone:** funciona solo con la app instalada, iOS 16.4+ y con permiso. Si Safari decide que los avisos molestan, puede anular la suscripción. *Mitigación:* pocos avisos y siempre visibles.
- **R10-2 · Cambio de service worker:** pasar a `injectManifest` puede romper el funcionamiento sin conexión. *Mitigación:* las pruebas E2E sin conexión existentes deben seguir pasando.
- **R10-3 · Precisión:** de día los avisos llegan como mucho 1 minuto tarde; de noche (22:00–7:00), un recordatorio puede llegar hasta 59 minutos tarde (D-108).
- **R10-4 · Abuso de `/api/push`:** alguien podría registrar muchos dispositivos falsos. *Mitigación:* límite por IP, tamaño máximo y caducidad a los 30 días.

## 9. Plan de entrega
- **1.1.0:** todo lo anterior.
- Paso previo del responsable: generar las claves VAPID y poner la privada en Netlify. Se le darán los comandos.

## 10. Decisiones de esta spec (aprobadas)
| ID | Propuesta |
|---|---|
| S10-01 | Web Push directo con VAPID desde Netlify; sin Firebase (D-102) |
| S10-02 | Dos resúmenes, 7:00 y 22:00 por defecto, configurables y desactivables uno a uno; misiones que vencen en el de la mañana y rachas en peligro en el de la noche (D-103) |
| S10-03 | El servidor solo conoce horas; el texto lo escribe el service worker con los datos locales (D-104) |
| S10-04 | Recordatorios por actividad, tantos como veces del periodo (horas, día de la semana o del mes + hora), opcionales; se saltan si ya está cumplida (D-105) |
| S10-05 | Activación en Ajustes y en un paso nuevo del onboarding, apagadas por defecto (D-106) |
| S10-06 | Si ya no queda nada que avisar, un mensaje breve de ánimo (D-107) |
| S10-07 | Badge con lo pendiente de hoy, desactivable |
| S10-08 | Entrega en 1.1.0 |
