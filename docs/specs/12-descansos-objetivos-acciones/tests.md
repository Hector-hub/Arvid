# Spec 12 — Pruebas

## 1.3.0 · Descansos
| Requisito | Prueba |
|---|---|
| DS-05, DS-06 | `src/domain/activities/activities.test.ts`: un día de descanso sin cumplir no rompe la racha; cumplido, cuenta; semanal con descanso solo cuenta si se cumple; la XP no cambia |
| DS-01, DS-02 | `src/data/rests.test.ts`: solo desde hoy, todas o algunas actividades, nota; cancelar uno en curso conserva los días pasados; editar uno en curso mantiene su inicio |
| R12-3 | Mismo archivo: una base de la versión 1 se abre en la 2; backups con y sin descansos se importan |
| DS-09 | `src/domain/notifications/notifications.test.ts`: sin recordatorios en días de descanso; «Hoy descansas» por la mañana; la noche no avisa |
| DS-01 a DS-04 | `src/app/rests/rests-ui.test.tsx`: crear desde la pantalla, error si empieza en el pasado, aviso y etiqueta en Hoy, «Día de descanso» |
| D-124 | `src/app/arvid/function.test.ts`: el crédito se devuelve si la generación falla |

## 1.4.0 · Objetivos y hora en las misiones
| Requisito | Prueba |
|---|---|
| OB-03 a OB-09, R12-3 | `src/data/goals.test.ts`: solo el primer hito es misión; completar activa el siguiente y el último cumple el objetivo; hito con fecha pasada se activa sin fecha; desmarcar no rebloquea; un hito no se borra; editar sustituye los pendientes; abandonar; validación; backup |
| MH-02 | `src/domain/notifications/notifications.test.ts`: aviso de misión con hora el día de su fecha; texto con su título; si está hecha, mensaje breve |
| OB-01 a OB-04 | `src/app/goals/goals-ui.test.tsx`: crear con hitos, fecha y hora; error en un hito; pestaña con progreso; detalle con hito activo y bloqueado; etiqueta «Objetivo: X · hito 1/2» |

## Manual (1.3.0)
| # | Paso | iPhone | Android |
|---|---|---|---|
| M12-01 | Planificar un descanso para hoy: aviso en Hoy, actividades con «Descanso» y saludo de descanso | ☐ | ☐ |
| M12-02 | Al día siguiente, la racha sigue aunque no registraras | ☐ | ☐ |
| M12-03 | Descanso solo para una actividad: las demás siguen igual | ☐ | ☐ |
| M12-04 | Con notificaciones: la mañana dice «Hoy descansas» y no llegan recordatorios de lo que descansa | ☐ | ☐ |

## Manual (1.4.0)
| # | Paso | iPhone | Android |
|---|---|---|---|
| M12-05 | Crear un objetivo con 3 hitos: el primero aparece en Hoy con su etiqueta | ☐ | ☐ |
| M12-06 | Completar el hito: el siguiente se activa; el último celebra el objetivo | ☐ | ☐ |
| M12-07 | Misión con fecha de hoy y hora dentro de unos minutos: llega el aviso «Es hora de…» | ☐ | ☐ |
| M12-08 | La barra con 4 pestañas se ve bien en el móvil | ☐ | ☐ |
