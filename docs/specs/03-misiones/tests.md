# Spec 03 — Pruebas

Ubicación: `src/domain/missions/missions.test.ts`, `src/app/text.test.ts` (U), `src/data/missions.test.ts` (I), `src/app/screens/missions/missions.test.tsx` (C), `e2e/missions.spec.ts` (E).

Tipos: **U** unitario · **I** integración · **C** componente · **E** E2E (Chromium + WebKit) · **M** manual.

## Trazabilidad
| Requisito | Prueba | Tipo |
|---|---|---|
| MIS-01 | Cada estado de game-design §8.1 a partir de secuencias de eventos | U |
| MIS-02 · GD-A6 | Ejemplo "vence una sola vez"; reprogramar antes de vencer mueve el vencimiento; varios cambios el mismo día | U |
| MIS-03 · D-032 | XP +v a tiempo, sin fecha y tarde; 0 si está vencida o abandonada | U |
| MIS-04 | Contribuciones: E-3 (vencida 0/10), E-4 (tarde → excluida), E-4b (abandonada antes 0/5), a tiempo con y sin fecha | U |
| MIS-05 | Matriz de acciones por estado; abandonar es definitivo (R-M6) | U + I |
| MIS-06 | Categoría y dificultad bloqueadas fuera de pendiente; título siempre | U + C |
| MIS-07 · S3-01 | Título vacío o de 61 caracteres; fecha anterior a hoy rechazada | U + C |
| R-M2 | Ejemplo "a tiempo con fecha de ayer" | U + E |
| GD-A3 | Ejemplo "quitar la fecha" (pendiente y vencida) | U |
| GD-A4 | Ejemplo "desmarcar tras la fecha"; desmarcar una completada tarde → vencida | U |
| GD-A5 | Ejemplo "no antes de crearla" | U + C |
| S3-03 | Eliminar solo el mismo día y estando pendiente | U + I |
| MHOY-01 · NFR3-02 | Ejemplo "límite de 5" | U + C |
| MHOY-02 | Textos de plazo: "vence hoy", "vence mañana", "vence el vie 23", "sin fecha", "Vencida" | C |
| MHOY-03 | Completar → "Misión cumplida · +10 XP"; completar una vencida → "Misión recuperada"; deshacer | C + E |
| MHOY-04 | "· 2 misiones para hoy" en la cabecera | C |
| MUI-01 | Selector, grupos y estado vacío | C + E |
| MUI-02 | El formulario crea y edita; la fecha mínima es hoy | C + E |
| MUI-03 | Historial legible y acciones según el estado | E |
| MUI-04 | Las tres variantes del texto al abandonar | C |
| MUI-05 | Explicación en una misión vencida | C |
| INT-01 | Subir de nivel completando una misión muestra el modal | E |
| INT-02 | Backup con misiones: ida y vuelta; eventos huérfanos o `deadlineSet` sin fecha → rechazado | I |
| NFR3-01 | 500 misiones con 5 eventos en < 10 ms | U |

## Checklist manual
| # | Paso | iPhone | Android |
|---|---|---|---|
| M3-01 | El selector de fecha nativo funciona y no permite fechas pasadas | ☐ | ☐ |
| M3-02 | Hoy con 6 o más misiones sigue siendo legible (no satura) | ☐ | ☐ |
| M3-03 | Las confirmaciones de abandonar se entienden y no culpabilizan | ☐ | ☐ |
