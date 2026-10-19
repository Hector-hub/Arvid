# Spec 07 — Pruebas

Ubicación: `src/domain/achievements/*.test.ts` y `src/domain/perf.test.ts` (U); `src/app/achievements/achievements.test.tsx` y `src/app/design/design.test.ts` (C); `e2e/achievements.spec.ts`, `e2e/a11y.spec.ts` y `e2e/perf.spec.ts` (E).

Tipos: **U** unitario · **C** componente · **E** E2E (Chromium + WebKit) · **M** manual.

## Trazabilidad
| Requisito | Prueba | Tipo |
|---|---|---|
| LO-01 | Cada logro: un caso que lo cumple justo en el límite y otro que se queda a uno (racha 6 → no; 7 → sí, etc.) | U |
| LO-01 · L-02 | Una racha de 7 en una actividad semanal no desbloquea L-02 | U |
| LO-01 · L-08 | 7 días completos sin registros y un registro previo → sí; 6 días → no; sin registro previo → no | U |
| LO-01 · L-10 | Disciplina "sin datos" no desbloquea L-10 | U |
| LO-02 | `detectAchievements` no devuelve los ya desbloqueados; mismo resultado con el mismo estado (pura) | U |
| LO-03 | Deshacer el registro que lo provocó no borra el logro | C |
| LO-04 | Progreso de cada logro medible y tope en la meta | U |
| LO-05 | Primera evaluación e importación: se guardan sin aviso ni partículas, con una sola frase de ARVID | C + E |
| LP-01 a LP-03 | Contador, cuadrícula, ganados a color, pendientes en gris con barra, hoja con fecha o progreso | C + E |
| LP-04 | Nombre accesible con estado y progreso | C |
| CE-01 | Registrar el séptimo día seguido: partículas, frase de ARVID y aviso que se cierra a los 5 s; tocarlo abre la hoja | C + E |
| CE-02 | Frase fija por género; con IA, momento `achievement` en la petición; con DL-03 desactivado, sin frase | U + C |
| CE-03 | Dos logros a la vez → un aviso y una frase | C |
| CE-04 | Nivel y logro a la vez → primero el modal de nivel, después el aviso | C |
| CE-05 | El aviso está en una región `status` y no tapa la navegación | C + E |
| CE-06 | Con movimiento reducido no hay partículas ni animación del aviso | C |
| IN-02 | El atlas tiene 12 celdas de 32 px; `public/achievements/badges.png` ≤ 30 KB (NFR7-02) | U |
| BT-01/02 | Las variantes tienen el relleno y el texto de la tabla (estilos calculados) | C |
| BT-03 | Con foco de teclado, el contorno es dorado | E |
| BT-05 | Contraste ≥ 4,5:1 del texto de cada variante sobre su relleno (cálculo con los tokens) | U |
| AC-01 | axe sin infracciones serias ni críticas en cada pantalla de la lista, en español e inglés | E |
| RE-01 | Lighthouse en móvil sobre producción (resultados abajo) | M |
| RE-02 | Dominio con un año de datos ≤ 150 ms; Hoy usable ≤ 2 s con esos datos importados | U + E |
| NFR7-03 | `es.json` y `en.json` con las mismas claves (prueba de I18N-05) | U |

## Resultados de Lighthouse (RE-01)
| Fecha | Versión | Rendimiento | Accesibilidad | Buenas prácticas |
|---|---|---|---|---|
| 2026-10-18 | 0.7.0 (producción, móvil) | 94 | 100 | 93 |

- **Página medida:** la primera carga (onboarding), porque Lighthouse abre un navegador sin datos. Hoy con datos se mide en RE-02.
- **FCP y LCP:** 2,1 s; TBT 170 ms; CLS 0.
- **Buenas prácticas:** el único error de consola es el script `/.netlify/scripts/hud` que Netlify inyecta en el plan gratuito (la insignia de Netlify), bloqueado por la CSP de ARVID. Se quita desactivando esa insignia en el panel de Netlify (responsable del producto).
- **JavaScript sin usar:** unos 117 KB del paquete principal en la primera carga. Con los mínimos cumplidos no se divide en más trozos (RE-03).

## Resultados de RE-02 y AC-01 (2026-10-18)
- **Dominio con un año de datos** (12 actividades, ~2 700 registros, 60 misiones): 4,2 ms (límite: 150 ms).
- **Hoy usable con ese año importado:** 82 ms en Chromium y 690 ms en WebKit (límite: 2 s).
- **axe:** sin infracciones en las 25 pantallas (onboarding paso a paso y la app en español e inglés). La única que salió, "label-content-name-mismatch" en la franja de nivel de Hoy (su nombre accesible no empezaba por el texto visible "Nv 1 · Recluta"), se corrigió.

## Checklist manual (M7)
| # | Paso | iPhone | Android |
|---|---|---|---|
| M7-01 | Las insignias se ven nítidas a 64 y 128 px | ☐ | ☐ |
| M7-02 | El aviso de logro no molesta y se entiende | ☐ | ☐ |
| M7-03 | Los botones se ven bien y se sienten al pulsar | ☐ | ☐ |
| M7-04 | VoiceOver o TalkBack leen la sección de logros y el aviso | ☐ | ☐ |
