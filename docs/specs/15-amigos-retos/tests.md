# Spec 15 — Pruebas

## Automáticas
| Requisito | Prueba |
|---|---|
| MK-02, MK-03, FN-02 a FN-04 | `src/domain/challenges/score.test.ts`: meta del grupo al 80 %, con abandonos (dejan de sumar al total); orden competitivo con empates; «cumplido» en cada modo |
| SY-03, SY-04 | `src/domain/challenges/days.test.ts`: días del reto por fecha local; marcas fuera del margen de 2 días rechazadas; días por llegar |
| RT-07, RT-09 a RT-12 | `src/data/challenges.test.ts`: al unirse se crea la actividad diaria enlazada; no se edita salvo recordatorios y área; se archiva al terminar o abandonar; los descansos no la eximen |
| SY-01, SY-02, NFR15-02 | `src/app/challenges/sync.test.tsx`: registrar sin conexión pone la marca en cola y sale al volver; deshacer la retira; el progreso de los demás se descarga y se ve «actualizado hace…» |
| AM-01 a AM-07, IN-03, IN-05 | `netlify/functions/social.test.ts`: amistad directa mutua; solicitud tras un reto que solo es mutua al aceptarla; eliminar y bloquear (el bloqueado no puede invitar); aceptar hasta el día de inicio; reto completo con 20 |
| RT-05, NFR15-03 | `netlify/functions/social.test.ts`: límites de retos activos, participantes, retos creados, invitaciones y marcas |
| AV-02, AV-03 | `netlify/lib/pushSend.test.ts`: el recordatorio del reto entra en el resumen de la tarde; como mucho un aviso de avances al día por reto |
| EN-01, EN-03 | `src/app/challenges/links.test.tsx`: las rutas `/a/:id` y `/r/:id` muestran la invitación; «Tengo un enlace» acepta un enlace pegado |

## Manual (dos personas, dos teléfonos)
| # | Paso | iPhone | Android |
|---|---|---|---|
| M15-01 | Enlace de amistad: abrirlo en el otro teléfono (en iPhone por Safari → «Tengo un enlace») y aceptar → amigos mutuos | ☐ | ☐ |
| M15-02 | Crear un reto cooperativo de 3 días, invitar y aceptar; aparece en Hoy con «Reto · día 1 de 3» | ☐ | ☐ |
| M15-03 | Marcar en modo avión, reconectar → el otro lo ve | ☐ | ☐ |
| M15-04 | Avisos: invitación, recordatorio en el resumen de la tarde, avance de otro y final | ☐ | ☐ |
| M15-05 | Reto competitivo de 3 días: marcador, corona y resultado; aparece en Retos cumplidos | ☐ | ☐ |
| M15-06 | Abandonar un reto, eliminar y bloquear a un amigo | ☐ | ☐ |
