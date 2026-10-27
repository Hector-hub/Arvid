# Spec 14 — Cuenta ligera y copia en la nube

Estado: **aprobada** (2026-10-27) · Parte de la 2.0 (D-139)
Decisiones que implementa: D-140 a D-144 y D-150 (borrar la cuenta)
Modifica:
- D-041 y el principio de «sin servidor de datos»: aparece una parte en la nube, opcional (D-140);
- spec 07 (copia de seguridad): la copia manual sigue igual; la de la nube reutiliza su formato;
- onboarding: un paso opcional nuevo.

## 1. Objetivo
Que puedas **recuperar tu progreso si pierdes o cambias de teléfono**, sin email ni contraseña: entras con Face ID o huella (passkey) y, si eso falla, con una clave de recuperación. Además, la cuenta es la base de los amigos y los retos (spec 15).

ARVID sigue siendo **offline-first**: todo funciona sin conexión y sin cuenta, como ahora (D-140).

## 2. Alcance
**Incluye:**
- Crear la cuenta con una passkey y recibir una clave de recuperación.
- Copia cifrada y automática de tus datos en la nube.
- Entrar en un dispositivo nuevo y restaurar.
- Gestionar la cuenta en Ajustes: estado de la copia, nueva clave de recuperación, salir y borrar la cuenta.

**Excluye** (spec 15 o más adelante):
- Amigos, retos e invitaciones. Esta spec solo deja preparado el ID público.
- Sincronizar a la vez dos dispositivos activos: se admite, pero con «gana la última copia» y un aviso (CP-05), no con fusión.
- Email, contraseña o inicio de sesión con Google o Apple.

## 3. Conceptos
| Concepto | Qué es | Quién lo ve |
|---|---|---|
| **ID de cuenta** | UUID v4. Identifica la cuenta y va en los enlaces de la spec 15 | Público |
| **Passkey** | Credencial WebAuthn guardada en el llavero de iCloud o en el gestor de Google. Sirve para entrar | Solo tu dispositivo y tu llavero |
| **Clave de recuperación** | 128 bits aleatorios, escritos como `ARVID-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-X` (base32). Sirve para entrar y para descifrar | Solo tú |
| **Clave de datos** | AES-256-GCM aleatoria. Cifra la copia | Solo tus dispositivos; el servidor la guarda **envuelta** (cifrada), nunca en claro |
| **Sesión** | Token firmado que guarda el dispositivo tras entrar. Dura 1 año y se renueva al usarse | Tu dispositivo |

## 4. Requisitos funcionales

### 4.1 Crear la cuenta (CU, D-141, D-143)
- **CU-01. Dónde:**
  - un paso opcional del onboarding, «Guarda tu progreso», después del permiso de la IA, con los botones «Crear con Face ID / huella» y «Ahora no»;
  - siempre en **Ajustes → Cuenta**;
  - a los usuarios actuales, **una vez**, en una tarjeta en Hoy que se puede descartar.
- **CU-02. Cómo:**
  1. el dispositivo pide la passkey (nombre visible «ARVID · {alias}»);
  2. se genera la clave de datos;
  3. se muestra la **clave de recuperación** con «Copiar» y «Guardar como archivo»;
  4. hay que marcar «La he guardado» para continuar.

  Se pide guardarla aunque la passkey se sincronice, porque es el único camino si cambias de iPhone a Android o pierdes el acceso al llavero.
- **CU-03. Sin conexión** no se puede crear la cuenta: el botón se deshabilita y aparece «Necesitas conexión».
- **CU-04. Sin soporte de passkeys** (navegador antiguo) la cuenta se crea solo con clave de recuperación, avisando de que hará falta para entrar.
- **CU-05.** Al crearla se sube la primera copia (CP-01).

### 4.2 Copia en la nube (CP, D-142)
- **CP-01. Qué se sube:** el mismo contenido que la copia manual de la spec 07 (actividades, registros, misiones, objetivos, descansos, logros, memoria, ajustes que viajan en el backup).
  - Se comprime y se **cifra en el dispositivo** con la clave de datos antes de salir.
  - **No** se suben los ajustes solo del dispositivo: código de IA, prueba, notificaciones ni la sesión.
- **CP-02. Cuándo:** sola, sin botón.
  - unos **30 s** después del último cambio;
  - al pasar la app a segundo plano;
  - al abrirla, si hay cambios pendientes.

  Sin conexión, se queda pendiente y se sube al volver. Hay también un botón «Subir ahora» en Ajustes.
- **CP-03. Estado en Ajustes → Cuenta:** «Copia al día · hace 5 min», «Pendiente de subir (sin conexión)» o «Error al subir: lo reintentará».
- **CP-04. Versiones:** el servidor guarda **solo la última copia** y un número de versión que sube con cada subida. Cada subida indica la versión de la que parte.
- **CP-05. Dos dispositivos:** si al subir la versión del servidor es más nueva que aquella de la que partes (otro dispositivo subió entre medias), la app pregunta:
  - **«Usar la de este teléfono»:** sube la tuya y sustituye a la otra;
  - **«Usar la de la nube»:** descarga y sustituye lo local.

  Sin fusión. Se avisa de que la otra versión se pierde.
- **CP-06. Tamaño:** como mucho **5 MB** por copia cifrada. Si se supera, se avisa y se sigue usando la copia manual.

### 4.3 Entrar y restaurar (RC, D-141)
- **RC-01. Dónde:**
  - en la primera pantalla del onboarding, «Ya tengo cuenta»;
  - en Ajustes → Cuenta, para un dispositivo que ya tenga datos sin cuenta.
- **RC-02. Con passkey:**
  1. el dispositivo ofrece las passkeys de ARVID;
  2. el servidor da la sesión y la clave de datos envuelta;
  3. la app descarga la copia, la descifra y la restaura.
- **RC-03. Descifrar con passkey (PRF):** si el dispositivo admite la extensión **PRF** de WebAuthn (iOS 18 o posterior, y Chrome con el gestor de Google), la clave de datos se desenvuelve sin pedir nada más. Si no, se pide la clave de recuperación **una vez** en ese dispositivo.
- **RC-04. Con clave de recuperación:** se escribe la clave y sirve para entrar y descifrar. Después se ofrece crear una passkey en el dispositivo nuevo.
- **RC-05. Si el dispositivo ya tiene datos:** se pregunta «Sustituir lo de este teléfono por tu cuenta» o «Cancelar». No se mezclan.
- **RC-06. Clave equivocada:** «Esa clave no es válida».
  - Cada **5 intentos fallidos** por cuenta e IP imponen una espera de **15 min**.
  - El mensaje nunca dice si la cuenta existe.

### 4.4 Gestionar la cuenta (GC, D-150)
En **Ajustes → Cuenta**:
- **GC-01.** Estado de la copia (CP-03) y «Subir ahora».
- **GC-02. Nueva clave de recuperación:** genera otra, invalida la anterior y vuelve a envolver la clave de datos. Se muestra como en CU-02.
- **GC-03. Añadir passkey en este dispositivo:** si entraste con la clave de recuperación.
- **GC-04. Salir de este dispositivo:** borra la sesión y la clave de datos locales; tus datos locales se quedan. Se avisa de que, para volver, harán falta la passkey o la clave.
- **GC-05. Borrar la cuenta:**
  - confirmación flotante «¿Borrar tu cuenta y la copia en la nube?»;
  - borra todo lo del servidor: cuenta, credenciales, claves envueltas y copia;
  - en el dispositivo todo sigue igual, como sin cuenta.

### 4.5 Privacidad (PV, D-142, D-144)
- **PV-01.** El servidor **no puede leer** tus datos: solo guarda la copia cifrada, las claves envueltas y lo necesario para las passkeys.
- **PV-02.** En claro solo quedan:
  - el ID de cuenta;
  - el **alias** y el **nivel**, para la spec 15 (D-144); el nivel se actualiza con cada subida;
  - las fechas de creación y de la última copia.
- **PV-03.** Texto de privacidad en la pantalla de crear cuenta y en Ajustes → Cuenta, con lo que se guarda, que está cifrado y cómo borrarlo.

## 5. Diseño técnico

### 5.1 Servidor
- **Una función nueva, `netlify/functions/account.mts`** (`/api/account/*`):
  - `register/options`, `register/verify`;
  - `login/options`, `login/verify`, `login/recovery`;
  - `backup` (GET y PUT);
  - `recovery/rotate`, `passkey/add`, `delete`.
- **Passkeys** con **@simplewebauthn/server** (y `@simplewebauthn/browser` en la app):
  - RP ID: el dominio de producción (`arvid-app.netlify.app`), configurable por variable;
  - credenciales detectables (*resident keys*) y verificación de usuario obligatoria;
  - los *challenges* se guardan 5 min.
- **Sesión:** token HMAC-SHA256 con un secreto nuevo, `ARVID_SESSION_SECRET` (lo crea el responsable en Netlify, como `ARVID_CODE_SECRET`). Contiene el ID de cuenta y la caducidad. Se manda en `Authorization: Bearer`.
- **Clave de recuperación:**
  - el dispositivo deriva con HKDF-SHA256 dos claves independientes: `auth` y `wrap`;
  - al servidor solo llega `auth`, y guarda su hash;
  - `wrap` nunca sale del dispositivo y envuelve la clave de datos.
  - Al tener 128 bits aleatorios no necesita un KDF lento.
- **PRF:** con la extensión PRF de la passkey se obtiene otra clave `wrap` por credencial; el servidor guarda la clave de datos envuelta también con ella.

### 5.2 Almacenamiento: Netlify Blobs
**Propuesta (S14-01):** seguir con **Netlify Blobs**, como ya hacemos con créditos, push y la prueba. En esta spec todo se lee por clave (cuenta, credencial o copia) y no hay consultas.

| Store | Clave | Contenido |
|---|---|---|
| `accounts` | `acc:<id>` | `{ id, alias, level, createdAt, backupAt, backupVersion, recoveryAuthHash, wrapped: { recovery, prf: { <credId>: … } } }` |
| `accounts` | `cred:<credId>` | `{ accountId, publicKey, counter, transports }` |
| `backups` | `<id>` | La copia cifrada (`iv + ciphertext`), como mucho 5 MB |
| `account-challenges` | `<challengeId>` | Challenge WebAuthn, caduca a los 5 min |
| `account-limits` | `ip:<hash>` / `rec:<id>:<ipHash>` | Contadores de límites (NFR14-03) |

- Las escrituras de cuenta y copia usan **consistencia fuerte**.
- La subida comprueba la versión (CP-04) leyendo y escribiendo con el ETag de Blobs, para no pisar otra subida que llegue a la vez.
- La spec 15 decidirá si amigos y retos necesitan una base de datos con consultas (Postgres). Esta spec no lo necesita.

### 5.3 App
- **Datos nuevos solo del dispositivo** (en `settings`, fuera del backup):
  - `account`: `{ id, session, dataKey }`; la clave de datos se guarda en IndexedDB como `CryptoKey` **no exportable**;
  - `cloudBackup`: `{ version, uploadedAt, dirty }`.
- **Un vigilante** `CloudBackupWatcher` marca `dirty` con cada cambio en Dexie y sube según CP-02.
- **Cifrado:** Web Crypto, sin librerías: AES-256-GCM con IV aleatorio, HKDF y compresión con `CompressionStream('gzip')`.
- **Flag:** todo lo visible va detrás de `VITE_ACCOUNTS`, apagado en producción hasta la 2.0 (D-139).

## 6. Requisitos no funcionales
- **NFR14-01.** El servidor nunca recibe en claro la clave de datos, la clave `wrap` ni los datos personales.
- **NFR14-02.** Funciona sin conexión: nada de esta spec bloquea el uso normal; las subidas pendientes no muestran errores insistentes.
- **NFR14-03. Límites:**
  - crear cuenta: 5 al día por IP;
  - entrar con clave: RC-06;
  - subidas: 60 por hora por cuenta.
- **NFR14-04.** Textos nuevos en `es.json` y `en.json`.
- **NFR14-05.** Pruebas de cifrado y de la API con WebAuthn simulado. Las passkeys reales se prueban a mano en los dos teléfonos.

## 7. Ejemplos (Given/When/Then)
**CU-02 · Crear**
- Given un usuario con datos sin cuenta
- When toca «Crear con Face ID», confirma y marca «La he guardado»
- Then tiene cuenta, ve la clave una sola vez y en Ajustes aparece «Copia al día»

**RC-02/RC-03 · Teléfono nuevo, mismo llavero**
- Given un iPhone nuevo con el mismo iCloud
- When en el onboarding toca «Ya tengo cuenta» y usa Face ID
- Then recupera actividades, nivel, ciudad y memoria sin escribir ninguna clave

**RC-04 · De iPhone a Android**
- Given la passkey solo está en iCloud
- When en Android escribe la clave de recuperación
- Then recupera todo y se le ofrece crear una passkey en Android

**CP-05 · Dos dispositivos**
- Given el teléfono A subió la versión 8 y el B parte de la 7 con cambios
- When B intenta subir
- Then B pregunta qué copia usar

## 8. Riesgos
- **R14-1 · Pérdida total:** sin passkey ni clave de recuperación, la copia es ilegible para siempre, y eso es intencionado.
  - *Mitigación:* hay que confirmar que se guardó la clave, se puede generar otra (GC-02) y la copia manual sigue existiendo.
- **R14-2 · PRF no disponible** en algunos dispositivos.
  - *Mitigación:* la clave de recuperación una vez por dispositivo (RC-03).
- **R14-3 · Passkeys en la PWA instalada** (iOS en modo standalone, Android).
  - *Mitigación:* prototipo en los dos teléfonos antes de construir la interfaz (fase 14a).
- **R14-4 · Coste y límites de Netlify Blobs.**
  - *Mitigación:* con 2 a 20 usuarios y copias de menos de 1 MB está muy por debajo del plan gratuito; NFR14-03.
- **R14-5 · Cambiar de dominio:** el RP ID de las passkeys y los datos locales van atados al dominio.
  - *Mitigación:* la estrategia de S14-07.

## 9. Plan de entrega
| Fase | Qué | Se publica |
|---|---|---|
| **14a** | Prototipo de passkey + PRF en una página oculta, probado en el iPhone y el Android reales | Sí, oculto |
| **14b** | Función `account`, cifrado y API con pruebas | Sí, sin interfaz |
| **14c** | Interfaz (onboarding, Ajustes, tarjeta en Hoy) y vigilante de copia, detrás de `VITE_ACCOUNTS` | Apagado |
| **2.0.0** | Se enciende junto con la spec 15 | Sí |

## 10. Decisiones de esta spec (aprobadas)
| ID | Propuesta |
|---|---|
| S14-01 | Netlify Blobs para cuenta, credenciales y copia; la base de datos se decide en la spec 15 |
| S14-02 | La clave de recuperación sirve para entrar y descifrar; HKDF con dos claves separadas, de modo que el servidor nunca puede descifrar |
| S14-03 | PRF de la passkey para no pedir la clave en dispositivos compatibles; si no hay PRF, la clave una vez por dispositivo |
| S14-04 | Solo la última copia, con versión; dos dispositivos → elegir copia, sin fusión |
| S14-05 | Sesión de 1 año renovable, con un secreto nuevo `ARVID_SESSION_SECRET` |
| S14-06 | Todo detrás de `VITE_ACCOUNTS` hasta la 2.0 y un prototipo de passkeys primero (14a) |
| S14-07 | Dominio: se sigue con `arvid-app.netlify.app`. Si algún día hay dominio propio, se migra con *Related Origin Requests* (`/.well-known/webauthn` en el dominio antiguo autoriza al nuevo, de modo que las passkeys siguen valiendo) y la clave de recuperación como respaldo; los datos locales se recuperan desde la copia en la nube. El sitio de Netlify se mantiene para servir ese archivo y redirigir |
