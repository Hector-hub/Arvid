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

## Manual (1.3.0)
| # | Paso | iPhone | Android |
|---|---|---|---|
| M12-01 | Planificar un descanso para hoy: aviso en Hoy, actividades con «Descanso» y saludo de descanso | ☐ | ☐ |
| M12-02 | Al día siguiente, la racha sigue aunque no registraras | ☐ | ☐ |
| M12-03 | Descanso solo para una actividad: las demás siguen igual | ☐ | ☐ |
| M12-04 | Con notificaciones: la mañana dice «Hoy descansas» y no llegan recordatorios de lo que descansa | ☐ | ☐ |
