# Spec 04 — Pruebas

Ubicación: `src/domain/attributes/*.test.ts` (U), `src/data/categories.test.ts` (I), `src/app/screens/profile/profile.test.tsx` (C), `e2e/profile.spec.ts` (E). NFR4-03 lo cubren los pares cyan/panel y fog/panel de `src/app/design/design.test.ts`.

Tipos: **U** unitario · **I** integración · **C** componente · **E** E2E (Chromium + WebKit) · **M** manual.

## Trazabilidad
| Requisito | Prueba | Tipo |
|---|---|---|
| ATR-01/02 · E-2 | Cuerpo = 79 con ΣE = 162,5 y ΣP = 205; el periodo abierto completo cuenta; los no evaluables se excluyen | U |
| ATR-03 · E-3/E-4/E-4b | Disciplina 82 / 83 / 83 | U |
| E-8 · R-AT3 | "Sin datos (2 de 3)" | U |
| ATR-04 | La ventana anterior ignora registros, eventos y misiones posteriores a la referencia (incluido el periodo abierto en la referencia) | U |
| ATR-05 | Δ +9 subiendo, +4 estable, −8 bajando, sin datos → sin tendencia | U |
| ATR-06 | Textos del desglose: unidades en singular y plural, misiones que restan | U |
| GD-A9 | Ejemplo "cambio de categoría" | U |
| GD-A10 | Una categoría desactivada no aparece en atributos, pero cuenta en Disciplina | U |
| PJ-02 · GD-A8 | Geometría: vértices en el radio correcto; segmentos solo entre ejes con datos; ejes sin datos marcados | U + C |
| GD-A7 · PJ-06 | Con 2 categorías activas no hay SVG y aparece el aviso | C |
| PJ-02 | `aria-label` del radar con todos los valores | C |
| PJ-03 | Medidor: 10 bloques, cifra, tendencia y sin datos | C |
| PJ-01 · S4-04 | Orden de las secciones; el selector cambia los valores y se recuerda tras recargar | C + E |
| PJ-05, PJ-07 | Nota fija; estado vacío | C |
| DA-01 a DA-04 | Detalle con la explicación de game-design §10, sus actividades y misiones, y la nota de ventanas cortas | C + E |
| DA-05 | Disciplina: lista de misiones que restan con enlace | C + E |
| CAT-04 | Crear: nombre único, color por defecto no usado, icono elegido; límite de 8 activas | I + C + E |
| CAT-05 | Renombrar una predefinida se refleja en Hoy y en Actividades | E |
| CAT-06 | Ejemplo "eliminar" | I |
| CAT-07 | Las reglas de desactivación se mantienen | I |
| NFR4-01 | Rendimiento | U |
| NFR4-03 | Contraste del borde del polígono y del texto del radar (script de contraste) | U |

## Checklist manual
| # | Paso | iPhone | Android |
|---|---|---|---|
| M4-01 | El radar se ve nítido y legible con 3, 6 y 8 categorías | ☐ | ☐ |
| M4-02 | Con el tamaño de texto del sistema al máximo, la lista sigue siendo usable | ☐ | ☐ |
| M4-03 | VoiceOver o TalkBack leen el resumen del radar y la lista | ☐ | ☐ |
| M4-04 | Las explicaciones se entienden (no parecen un diagnóstico) | ☐ | ☐ |
