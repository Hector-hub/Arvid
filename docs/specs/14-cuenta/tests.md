# Spec 14 — Pruebas

## Automáticas
| Requisito | Prueba |
|---|---|
| S14-02, NFR14-01 | `src/domain/account/crypto.test.ts`: la clave de recuperación (formato, base32 y comprobación) deriva `auth` y `wrap` distintas; envolver y desenvolver la clave de datos; cifrar y descifrar una copia; IV distinto en cada cifrado; una clave equivocada falla |
| CP-01 | `src/data/cloudBackup.test.ts`: la copia de la nube tiene el contenido del backup sin los ajustes solo del dispositivo; restaurarla da los mismos datos |
| CP-02, CP-03, NFR14-02 | `src/app/account/watcher.test.tsx`: un cambio marca `dirty` y sube a los 30 s; sin conexión queda pendiente y sube al volver; estados en Ajustes |
| CP-04, CP-05 | `netlify/functions/account.test.ts`: subir con la versión correcta la incrementa; con una versión antigua responde conflicto; la app pregunta qué copia usar |
| CU-02, RC-02, GC-02, GC-05 | `netlify/functions/account.test.ts` (WebAuthn simulado): registrar, entrar con passkey, entrar con clave, generar otra clave (la anterior deja de valer) y borrar la cuenta (no queda nada en los stores) |
| RC-06, NFR14-03 | `netlify/functions/account.test.ts`: 5 intentos fallidos imponen 15 min de espera; el límite de cuentas por IP; la respuesta no revela si la cuenta existe |
| CU-01, CU-03, RC-05 | `src/app/account/account-ui.test.tsx`: paso del onboarding (saltar y crear); sin conexión, el botón está deshabilitado; restaurar en un dispositivo con datos pide confirmación |

## Manual (dispositivos reales, R14-3)
| # | Paso | iPhone | Android |
|---|---|---|---|
| M14-01 | (14a) Crear una passkey en la PWA instalada y entrar con ella; ¿PRF disponible? | ☐ | ☐ |
| M14-02 | Crear la cuenta en el onboarding, guardar la clave y ver «Copia al día» | ☐ | ☐ |
| M14-03 | Hacer cambios en modo avión, volver a conectar y comprobar que la copia sube | ☐ | ☐ |
| M14-04 | Borrar los datos de la app (o usar otro dispositivo del mismo llavero): «Ya tengo cuenta» con Face ID o huella → todo recuperado | ☐ | ☐ |
| M14-05 | Entrar en el otro sistema (iPhone ↔ Android) con la clave de recuperación → todo recuperado y ofrece passkey | ☐ | ☐ |
| M14-06 | Generar otra clave, salir de este dispositivo y borrar la cuenta | ☐ | ☐ |
