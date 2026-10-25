# Spec 10 — Pruebas

## Automáticas
| Requisito | Prueba |
|---|---|
| RA-01, RA-02, RA-03, PV-04 | `src/domain/notifications/notifications.test.ts`: recordatorios de 7 días (diaria, semanal, mensual con día 31), saltar periodos cumplidos, validación |
| RS-01, RS-02, RA-04, PV-03, BG-01 | Mismo archivo: texto de la mañana (con misión que vence), de la noche (racha en peligro), de un recordatorio y mensaje breve |
| RS-04, PV-01 | `src/app/notifications/push-server.test.ts`: horas en la zona del dispositivo (con cambio de hora), avisos de cada ejecución sin repetir, alta y baja, rechazo de servicios push desconocidos y zonas inválidas |
| RA-01, RA-02, NT-04 | `src/app/notifications/notifications-ui.test.tsx`: horas en el formulario, día de la semana, aviso al bajar las veces y Ajustes sin soporte |
| NT-02 | `src/app/arvid/arvid.test.tsx` (ON-02) y `e2e/helpers.ts`: paso de notificaciones del onboarding |
| R10-2 | E2E existentes sin conexión con el service worker nuevo |

## Manual (en los teléfonos)
| # | Paso | iPhone | Android |
|---|---|---|---|
| M10-01 | Activar en Ajustes pide permiso y queda activado | ☐ | ☐ |
| M10-02 | Llega el resumen de la mañana y el de la noche a su hora (±5 min), con el texto correcto | ☐ | ☐ |
| M10-03 | Llega un recordatorio de actividad; si ya está cumplida, no llega o sale el mensaje breve | ☐ | ☐ |
| M10-04 | Tocar el aviso abre ARVID en Hoy | ☐ | ☐ |
| M10-05 | El número del icono cambia al registrar y desaparece al completarlo todo | ☐ | ☐ |
| M10-06 | Desactivar en Ajustes deja de enviar avisos | ☐ | ☐ |
