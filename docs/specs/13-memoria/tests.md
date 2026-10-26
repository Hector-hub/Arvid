# Spec 13 — Pruebas

## Automáticas
| Requisito | Prueba |
|---|---|
| ME-02, MC-03, MC-05 | `src/domain/arvid/memory.test.ts`: recordar, actualizar y olvidar por referencia; sin duplicados; al llenarse se descarta la más antigua del compañero, nunca una pedida; validación |
| MU-01, MC-04 | `src/app/arvid/function.test.ts`: notas como mensaje de sistema antes del contexto (no en vecinos); operaciones válidas devueltas; memoria + propuesta en el mismo mensaje |
| MU-03, MC-01, MC-03, MI-02 | `src/app/arvid/memory-ui.test.tsx`: historial de 10 mensajes sin avisos; «recuerda que…» guarda la nota pedida y la anuncia; se envían las notas; pantalla con borrar una (deshacer) y todas |
| MI-01, MI-03 | `src/app/screens/chat.test.tsx`: menú de tres puntos → borrar conversación con confirmación flotante |

## Manual (con la IA real, R13-2)
| # | Paso | iPhone | Android |
|---|---|---|---|
| M13-01 | «Recuerda que los lunes trabajo hasta tarde» → aviso «Lo recordaré…» y nota «La pediste» | ☐ | ☐ |
| M13-02 | Conversar un rato: lo que guarda por su cuenta es útil y no sensible | ☐ | ☐ |
| M13-03 | Al día siguiente, el saludo o el chat tienen en cuenta alguna nota | ☐ | ☐ |
| M13-04 | Menú de tres puntos: ver memoria, borrar una nota y deshacer, borrar memoria completa | ☐ | ☐ |
