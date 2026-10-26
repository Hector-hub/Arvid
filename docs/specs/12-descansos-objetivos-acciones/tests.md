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

## 1.5.0 · Crear con el compañero
| Requisito | Prueba |
|---|---|
| AC-03, AC-04 | `src/domain/arvid/actions.test.ts`: calendario (fin de semana y de mes, próximos días); validación y limpieza (categoría, fechas pasadas, títulos largos, recordatorios imposibles, límites); catálogo de 4 acciones |
| AC-03, AC-06, D-124 | `src/app/arvid/function.test.ts`: envía el catálogo y las reglas; devuelve la propuesta validada; reintenta una vez con el error; si sigue mal, borrador; sin acciones en los momentos |
| AC-05, AC-06 | `src/app/arvid/proposal.test.tsx`: tarjeta y «Crear» de una misión con fecha y hora y de un objetivo con hitos; «Editar» abre el formulario rellenado; una propuesta inválida abre el formulario sin tarjeta |

## Manual (1.5.0) — con la IA real (R12-2)
| # | Paso | iPhone | Android |
|---|---|---|---|
| M12-09 | «Crea una misión para pagar la luz el viernes a las 6» → tarjeta con la fecha correcta → Crear | ☐ | ☐ |
| M12-10 | «Quiero correr 10 km antes de Navidad, con hitos de 3, 5, 7 y 10» → objetivo con 4 hitos | ☐ | ☐ |
| M12-11 | «El sábado y el domingo voy de viaje» → descanso de esos dos días | ☐ | ☐ |
| M12-12 | «Quiero leer 3 veces por semana» → actividad semanal × 3 | ☐ | ☐ |
| M12-13 | Una conversación normal («¿cómo voy?») no propone nada | ☐ | ☐ |
